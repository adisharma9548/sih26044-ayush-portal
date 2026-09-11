import { Request, Response } from 'express';
import { SkillProfile } from '../models/SkillProfile';
import { User } from '../models/User';
import { Question, AssessmentAttempt } from '../models/Assessment';
import { Portfolio } from '../models/Portfolio';
import { analyzeSkillGaps } from '../services/skillGapService';
import { generateDiagnosticQuestions } from '../services/aiService';
import { emitToUser } from '../services/socketService';
import { getBenchmarkForSkill } from '../services/benchmarkService';
import { SCORING_POLICY } from '../config/scoringPolicy';
import { computeAcademicContextHash } from '../services/academicContextService';

import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = (req.query.userId as string) || (req.user ? req.user._id.toString() : undefined);
    if (!targetUserId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'User ID is required' } });
    }

    const targetUser = req.user && req.user._id.toString() === targetUserId ? req.user : await User.findById(targetUserId);
    let profile = await SkillProfile.findOne({ userId: targetUserId });

    if (!profile && targetUser) {
      profile = await SkillProfile.create({
        userId: targetUser._id.toString(),
        degree: targetUser.degree || 'Technical Degree',
        overallScore: 0,
        rankPercentile: 0,
        status: 'not_assessed',
        academicContextHash: targetUser.academicContextHash || '',
        academicContextVersion: targetUser.academicContextVersion || 1,
        academicContext: {
          degree: targetUser.degree || '',
          department: targetUser.department || '',
          specialization: targetUser.specialization || '',
          institution: targetUser.institution || '',
          academicField: targetUser.academicField || '',
        },
        skills: [],
        gapAnalysis: [],
      });
    }

    if (profile && targetUser) {
      // Academic context synchronization & self-healing:
      // Compare user's active degree/hash with the profile's degree/hash
      const userDegree = (targetUser.degree || '').trim().toLowerCase();
      const profileDegree = (profile.degree || profile.academicContext?.degree || '').trim().toLowerCase();
      const degreeMismatched = userDegree && profileDegree && userDegree !== profileDegree;
      const hashMismatched = Boolean(
        targetUser.academicContextHash &&
        profile.academicContextHash &&
        targetUser.academicContextHash !== profile.academicContextHash
      );

      if (degreeMismatched || hashMismatched) {
        // Academic program was changed or diverged! Archive stale competencies
        if (!profile.historicalContexts) {
          profile.historicalContexts = [];
        }
        if (profile.skills && profile.skills.length > 0) {
          profile.historicalContexts.push({
            contextHash: profile.academicContextHash || '',
            version: profile.academicContextVersion || 1,
            degree: profile.degree || '',
            department: profile.academicContext?.department || '',
            specialization: profile.academicContext?.specialization || '',
            institution: profile.academicContext?.institution || '',
            archivedAt: new Date(),
            skills: profile.skills,
            overallScore: profile.overallScore || 0,
            gapAnalysis: profile.gapAnalysis || [],
          });
        }

        // Atomically reset active radar to not_assessed with zero fabricated numbers
        profile.skills = [];
        profile.gapAnalysis = [];
        profile.overallScore = 0;
        profile.rankPercentile = 0;
        profile.strengths = [];
        profile.status = 'not_assessed';
        profile.degree = targetUser.degree || '';
        profile.academicContextHash = targetUser.academicContextHash || computeAcademicContextHash(targetUser);
        profile.academicContextVersion = targetUser.academicContextVersion || 1;
        profile.academicContext = {
          degree: targetUser.degree || '',
          department: targetUser.department || '',
          specialization: targetUser.specialization || '',
          institution: targetUser.institution || '',
          academicField: targetUser.academicField || '',
        };
        await profile.save();
      } else if (profile.status === 'not_assessed') {
        // Enforce invariant: not_assessed status MUST have 0 skills
        if (profile.skills && profile.skills.length > 0) {
          if (!profile.historicalContexts) profile.historicalContexts = [];
          profile.historicalContexts.push({
            contextHash: profile.academicContextHash || '',
            version: profile.academicContextVersion || 1,
            degree: profile.degree || '',
            department: profile.academicContext?.department || '',
            specialization: profile.academicContext?.specialization || '',
            institution: profile.academicContext?.institution || '',
            archivedAt: new Date(),
            skills: profile.skills,
            overallScore: profile.overallScore || 0,
            gapAnalysis: profile.gapAnalysis || [],
          });
          profile.skills = [];
          profile.gapAnalysis = [];
          profile.overallScore = 0;
          profile.rankPercentile = 0;
          await profile.save();
        }
      } else if (!profile.skills || profile.skills.length === 0) {
        profile.status = 'not_assessed';
        profile.overallScore = 0;
        profile.rankPercentile = 0;
        profile.gapAnalysis = [];
      } else {
        profile.status = 'current';
      }

      if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        let changed = false;
        for (const skill of profile.skills) {
          if (skill.industryBenchmark === undefined || skill.industryBenchmark === 75) {
            const benchmarkData = await getBenchmarkForSkill(skill.name);
            skill.industryBenchmark = benchmarkData.available ? benchmarkData.benchmarkLevel : null;
            skill.benchmarkStatus = benchmarkData.available ? 'available' : 'insufficient_data';
            skill.benchmarkSource = benchmarkData.source;
            skill.benchmarkReason = benchmarkData.reason;
            changed = true;
          }
          if (!skill.verificationStatus) {
            skill.verificationStatus = skill.verified ? 'verified' : 'unverified';
            changed = true;
          }
        }
        if (changed) {
          await profile.save().catch(() => {});
        }
      }
    }

    res.json({ data: profile });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthRequest).user;
    const degree = (req.query.degree as string) || authUser?.degree || '';
    const department = (req.query.department as string) || authUser?.department || '';
    let specialization =
      (req.query.specialization as string) ||
      (req.query.category as string) ||
      authUser?.specialization ||
      authUser?.currentDomain ||
      '';

    // If specialization is empty or generic like "General", resolve to department or degree
    if (!specialization || specialization.toLowerCase() === 'general') {
      specialization = department || degree || 'Core Discipline';
    }

    const aiQuestions = await generateDiagnosticQuestions(degree, specialization, undefined, specialization, department);

    // Persist verified questions to database so evaluation verifies against server authority
    for (const q of aiQuestions) {
      await Question.findOneAndUpdate(
        { question: q.question },
        {
          numericId: q.id,
          category: q.category,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }

    const formatted = aiQuestions.map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      weight: Math.round(100 / aiQuestions.length),
    }));
    return res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { answers, userId, proctoring, questions: clientQuestions } = req.body;
    // OWASP A01 / API1: Strictly bind targetUserId to authenticated user unless caller is admin
    const targetUserId = (authUser.role === 'admin' && userId) ? userId : authUser._id.toString();

    let correctCount = 0;
    let totalQuestionsCount = 0;

    const categoryScores = new Map<string, { correct: number; total: number }>();

    if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
      totalQuestionsCount = clientQuestions.length;
      // Fetch verified questions from database to prevent client tampering of correctIndex
      const questionTexts = clientQuestions.map((q: any) => q.question).filter(Boolean);
      const dbQuestions = await Question.find({ question: { $in: questionTexts } }).lean();
      const dbQuestionMap = new Map(dbQuestions.map((dq) => [dq.question, dq]));

      clientQuestions.forEach((q: any) => {
        const cat = q.category || authUser.specialization || 'Core Competency';
        if (!categoryScores.has(cat)) {
          categoryScores.set(cat, { correct: 0, total: 0 });
        }
        const stat = categoryScores.get(cat)!;
        stat.total++;

        const studentAns = answers ? answers[q.id] : undefined;
        const verifiedRecord = dbQuestionMap.get(q.question);
        // Server authority: Always use verified server correctIndex if available
        const actualCorrect = verifiedRecord ? verifiedRecord.correctIndex : q.correctIndex;
        if (studentAns !== undefined && studentAns === actualCorrect) {
          correctCount++;
          stat.correct++;
        }
      });
    } else {
      const questions = await Question.find({});
      totalQuestionsCount = Math.max(1, questions.length);
      questions.forEach((q) => {
        const studentAns = answers ? answers[q.numericId] : undefined;
        if (studentAns !== undefined && studentAns === q.correctIndex) {
          correctCount++;
        }
      });
    }

    const calculatedScore = Math.min(
      100,
      Math.max(0, Math.round((correctCount / Math.max(1, totalQuestionsCount)) * 100))
    );

    // Sanitize answers map to plain object
    const sanitizedAnswers: Record<string, number> = {};
    if (answers && typeof answers === 'object') {
      for (const [k, v] of Object.entries(answers)) {
        if (typeof v === 'number') {
          sanitizedAnswers[k] = v;
        }
      }
    }

    // Record assessment attempt with proctoring audit metadata (resilient)
    let attemptRecord: any = null;
    try {
      attemptRecord = await AssessmentAttempt.create({
        userId: targetUserId,
        score: calculatedScore,
        answers: sanitizedAnswers,
        evaluatedAt: new Date(),
        academicContextHash: authUser.academicContextHash || '',
        academicContextVersion: authUser.academicContextVersion || 1,
        academicContext: {
          degree: authUser.degree || '',
          department: authUser.department || '',
          specialization: authUser.specialization || '',
          institution: authUser.institution || '',
        },
        isCurrentContext: true,
        proctoring: proctoring
          ? {
              violationsCount: proctoring.violationsCount || 0,
              violationsLog: Array.isArray(proctoring.violationsLog) ? proctoring.violationsLog : [],
              terminatedEarly: !!proctoring.terminatedEarly,
              integrityScore: typeof proctoring.integrityScore === 'number' ? proctoring.integrityScore : 100,
            }
          : undefined,
      });
    } catch (attemptErr: any) {
      console.warn('[submitAssessment] Non-fatal attempt logging warning:', attemptErr.message);
    }

    // Determine if attempt qualifies as verified evidence per central security policy
    const hasProctoring = proctoring && typeof proctoring.integrityScore === 'number';
    const isProctoredValid =
      hasProctoring &&
      proctoring.integrityScore >= SCORING_POLICY.verification.minimumProctoringIntegrity &&
      !proctoring.terminatedEarly;

    const totalAttempts = await AssessmentAttempt.countDocuments();
    const lowerScores = await AssessmentAttempt.countDocuments({ score: { $lt: calculatedScore } });
    const rankPercentile = totalAttempts > 0 ? Math.round((lowerScores / totalAttempts) * 100) : calculatedScore;

    let profile = await SkillProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = new SkillProfile({
        userId: targetUserId,
        degree: authUser.degree || '',
        overallScore: calculatedScore,
        rankPercentile,
        skills: [],
        gapAnalysis: [],
        lastAssessmentDate: new Date().toISOString().split('T')[0],
      });
    } else {
      const userDegree = (authUser.degree || '').trim().toLowerCase();
      const profileDegree = (profile.degree || '').trim().toLowerCase();
      if (userDegree && profileDegree && userDegree !== profileDegree) {
        if (!profile.historicalContexts) profile.historicalContexts = [];
        if (profile.skills && profile.skills.length > 0) {
          profile.historicalContexts.push({
            contextHash: profile.academicContextHash || '',
            version: profile.academicContextVersion || 1,
            degree: profile.degree || '',
            department: profile.academicContext?.department || '',
            specialization: profile.academicContext?.specialization || '',
            institution: profile.academicContext?.institution || '',
            archivedAt: new Date(),
            skills: profile.skills,
            overallScore: profile.overallScore || 0,
            gapAnalysis: profile.gapAnalysis || [],
          });
        }
        profile.skills = [];
        profile.gapAnalysis = [];
      }
    }

    if (!Array.isArray(profile.skills)) {
      profile.skills = [];
    }

    // Update existing skills or append newly tested categories with data-driven benchmarks & evidence
    const existingSkillsMap = new Map(profile.skills.map((s) => [s.name.toLowerCase(), s]));
    for (const [catName, stats] of categoryScores.entries()) {
      const catScore = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
      const benchmarkData = await getBenchmarkForSkill(catName);
      const existing = existingSkillsMap.get(catName.toLowerCase());

      const evidenceItem = isProctoredValid
        ? {
            sourceType: 'assessment' as const,
            referenceId: attemptRecord ? attemptRecord._id.toString() : undefined,
            verifiedAt: new Date(),
            verifiedBy: 'Proctored Diagnostic Assessment Engine',
            scoreOrRating: catScore,
            notes: `Proctored test integrity score: ${proctoring.integrityScore}%`,
          }
        : null;

      if (existing) {
        existing.level = Math.max(existing.level || 0, catScore);
        if (benchmarkData.available) {
          existing.industryBenchmark = benchmarkData.benchmarkLevel;
          existing.benchmarkStatus = 'available';
          existing.benchmarkSource = benchmarkData.source;
        } else if (existing.industryBenchmark === undefined) {
          existing.industryBenchmark = null;
          existing.benchmarkStatus = 'insufficient_data';
          existing.benchmarkReason = benchmarkData.reason;
        }

        if (isProctoredValid && evidenceItem) {
          if (!Array.isArray(existing.verificationSources)) {
            existing.verificationSources = [];
          }
          existing.verificationSources.push(evidenceItem as any);
          existing.verificationStatus = 'verified';
          existing.verified = true;
        }
      } else {
        const verificationSources = isProctoredValid && evidenceItem ? [evidenceItem] : [];
        profile.skills.push({
          name: catName,
          level: catScore,
          industryBenchmark: benchmarkData.available ? benchmarkData.benchmarkLevel : null,
          benchmarkStatus: benchmarkData.available ? 'available' : 'insufficient_data',
          benchmarkSource: benchmarkData.source,
          benchmarkReason: benchmarkData.reason,
          verified: isProctoredValid,
          verificationStatus: isProctoredValid ? 'verified' : 'unverified',
          verificationSources,
          category: 'Diagnostic Assessment',
        } as any);
      }
    }

    profile.overallScore = calculatedScore;
    profile.rankPercentile = rankPercentile;
    profile.lastAssessmentDate = new Date().toISOString().split('T')[0];

    // Recalibrate gap analysis safely for the student's actual assessed categories
    try {
      const assessedDomains = Array.from(categoryScores.keys());
      if (assessedDomains.length > 0) {
        const gapResult = await analyzeSkillGaps(profile.skills, assessedDomains);
        profile.gapAnalysis = gapResult.gapAnalysisList;
      }
    } catch (gapErr: any) {
      console.warn('[submitAssessment] Gap analysis warning:', gapErr.message);
    }

    profile.status = 'current';
    profile.academicContextHash = authUser.academicContextHash || '';
    profile.academicContextVersion = authUser.academicContextVersion || 1;
    profile.academicContext = {
      degree: authUser.degree || '',
      department: authUser.department || '',
      specialization: authUser.specialization || '',
      institution: authUser.institution || '',
      academicField: authUser.academicField || '',
    };

    await profile.save();

    emitToUser(targetUserId, 'assessment:evaluated', {
      score: calculatedScore,
      evaluatedAt: new Date(),
    });

    res.json({
      data: {
        score: calculatedScore,
        profile,
      },
    });
  } catch (err: any) {
    console.error('[submitAssessment] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getPortfolioData = async (req: Request, res: Response) => {
  try {
    const requestingUser = (req as any).user;
    const { userId } = req.query;
    const isElevated = requestingUser?.role === 'admin' || requestingUser?.role === 'academician' || requestingUser?.role === 'industry';
    const targetUserId = (isElevated && userId) ? userId.toString() : requestingUser?._id?.toString();

    if (!targetUserId) {
      return res.json({
        data: {
          certificates: [],
          projects: [],
        },
      });
    }

    const portfolio = await Portfolio.findOne({ userId: targetUserId });

    res.json({
      data: {
        certificates: portfolio ? portfolio.certificates : [],
        projects: portfolio ? portfolio.projects : [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const addPortfolioProject = async (req: Request, res: Response) => {
  try {
    const requestingUser = (req as any).user;
    if (!requestingUser) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { userId, title, role, technologies, description, link, startDate, endDate } = req.body;
    // OWASP A01 / API1: Strictly scope portfolio modifications to authenticated owner unless admin
    const targetUserId = (requestingUser.role === 'admin' && userId) ? userId : requestingUser._id.toString();

    let portfolio = await Portfolio.findOne({ userId: targetUserId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: targetUserId, certificates: [], projects: [] });
    }

    const newProject = {
      title,
      role,
      technologies: Array.isArray(technologies) ? technologies : (technologies || '').split(',').map((t: string) => t.trim()),
      description,
      link,
      startDate: startDate || '2026-01-01',
      endDate: endDate || '2026-05-01',
    };

    portfolio.projects.unshift(newProject as any);
    await portfolio.save();

    res.status(201).json({ data: { ...newProject, id: `proj_${Date.now()}` } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
