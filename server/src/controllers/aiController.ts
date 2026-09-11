import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  generateDiagnosticQuestions,
  evaluateDiagnosticAnswers,
  generateStudyTimeline,
  getDynamicSpecializations,
  generateOpportunityDraft,
  generateProposalDraft,
  evaluateProposalSynergy,
  generateLearningModuleDraft,
  generateLearningMarketInsight,
  synthesizeMouTerms,
  generateLearningTitleSuggestions,
} from '../services/aiService';
import { searchRoadmapsForLaggingSkills } from '../services/roadmapService';
import { SkillProfile } from '../models/SkillProfile';
import { AssessmentAttempt } from '../models/Assessment';
import { User } from '../models/User';
import { recordAuditLog } from '../services/auditService';
import { SCORING_POLICY } from '../config/scoringPolicy';

export const getSpecializations = async (req: AuthRequest, res: Response) => {
  try {
    const degree = (req.query.degree as string) || req.user?.degree || 'Higher Education';
    const data = await getDynamicSpecializations(degree);
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SPECIALIZATION_ERROR', message: err.message } });
  }
};

export const getDiagnosticQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const degree = (req.query.degree as string) || req.user?.degree || '';
    const specialization =
      (req.query.specialization as string) ||
      (req.query.domain as string) ||
      req.user?.specialization ||
      req.user?.currentDomain ||
      '';
    const targetDomain = (req.query.targetDomain as string) || req.user?.targetDomain || '';

    // If user is authenticated and provided fields, persist them
    if (req.user && (degree || specialization || targetDomain)) {
      if (degree) req.user.degree = degree;
      if (specialization) {
        req.user.specialization = specialization;
        req.user.currentDomain = specialization;
      }
      if (targetDomain) req.user.targetDomain = targetDomain;
      await req.user.save();
    }

    const questions = await generateDiagnosticQuestions(degree, specialization, targetDomain, specialization);

    res.json({
      data: {
        degree,
        specialization,
        domain: specialization,
        targetDomain,
        questions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_DIAGNOSTIC_ERROR', message: err.message } });
  }
};

export const getStudyTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const { domain, targetDomain, failedQuestions, correctCount, totalAnswered } = req.body;
    const activeDomain = domain || req.user?.currentDomain || req.user?.degree || 'Computer Science & Engineering';
    const activeTarget = targetDomain || req.user?.targetDomain || 'Industry Software Engineering';

    const timeline = await generateStudyTimeline(
      activeDomain,
      activeTarget,
      failedQuestions || [],
      { correct: correctCount, total: totalAnswered }
    );

    // Save studyRoadmap to user record if user is logged in
    if (req.user) {
      req.user.studyRoadmap = {
        recommendedDays: timeline.recommendedDays,
        recommendedTimeline: timeline.recommendedTimeline,
        retryAfterDate: timeline.retryAfterDate,
        targetedTopics: timeline.targetedTopics,
        studyAdvice: timeline.studyAdvice,
        score: timeline.score,
        totalQuestions: timeline.totalQuestions,
        correctAnswers: timeline.correctAnswers,
        wrongAnswers: timeline.wrongAnswers,
        mandatoryNotice: timeline.mandatoryNotice,
        roadmaps: timeline.roadmaps,
        createdAt: new Date(),
      };
      if (domain) req.user.currentDomain = domain;
      if (targetDomain) req.user.targetDomain = targetDomain;
      await req.user.save();
    }

    await recordAuditLog({
      req,
      action: 'AI_STUDY_TIMELINE_GENERATED',
      entity: 'User',
      entityId: req.user?._id?.toString(),
      details: { domain: activeDomain, score: timeline.score, recommendedTimeline: timeline.recommendedTimeline },
    });

    res.json({ data: timeline });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'TIMELINE_ERROR', message: err.message } });
  }
};

export const getRoadmapsForSkills = async (req: Request, res: Response) => {
  try {
    const skills = req.body.skills || (req.query.skills ? (req.query.skills as string).split(',') : []);
    const degree = (req.query.degree as string) || (req.body.degree as string) || '';
    const roadmaps = await searchRoadmapsForLaggingSkills(skills, degree);
    res.json({ data: roadmaps });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'ROADMAP_ERROR', message: err.message } });
  }
};

export const submitDiagnosticAnswers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const { answers, degree, proctoring } = req.body;
    const targetDegree = degree || req.user.degree || '';

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Diagnostic answers are required' } });
    }

    const evaluation = await evaluateDiagnosticAnswers(targetDegree, answers);

    // Save or update in MongoDB SkillProfile
    let profile = await SkillProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new SkillProfile({
        userId: req.user._id,
        degree: targetDegree,
      });
    }

    profile.status = 'current';
    profile.academicContextHash = req.user.academicContextHash || '';
    profile.academicContextVersion = req.user.academicContextVersion || 1;
    profile.academicContext = {
      degree: targetDegree || req.user.degree || '',
      department: req.user.department || '',
      specialization: req.user.specialization || '',
      institution: req.user.institution || '',
      academicField: req.user.academicField || '',
    };
    profile.overallScore = evaluation.overallScore;
    const totalProfiles = await SkillProfile.countDocuments({ _id: { $ne: profile._id } });
    const lowerProfiles = await SkillProfile.countDocuments({
      _id: { $ne: profile._id },
      overallScore: { $lt: evaluation.overallScore },
    });
    const isProctoredValid =
      proctoring &&
      typeof proctoring.integrityScore === 'number' &&
      proctoring.integrityScore >= SCORING_POLICY.verification.minimumProctoringIntegrity &&
      !proctoring.terminatedEarly;

    profile.skills = evaluation.radar.map((r) => ({
      name: r.subject,
      level: r.score,
      industryBenchmark: r.benchmark,
      benchmarkStatus: r.benchmarkStatus || (r.benchmark !== null ? 'available' : 'insufficient_data'),
      benchmarkReason: r.reason,
      verified: !!isProctoredValid,
      verificationStatus: isProctoredValid ? 'verified' : 'unverified',
      verificationSources: isProctoredValid
        ? [
            {
              sourceType: 'assessment' as const,
              verifiedAt: new Date(),
              verifiedBy: 'AI Adaptive Diagnostic Assessment',
              scoreOrRating: r.score,
              notes: `Proctored test integrity score: ${proctoring.integrityScore}%`,
            },
          ]
        : [],
      category: 'Diagnostic Assessment',
    }));
    profile.strengths = evaluation.strengths;
    profile.gapAnalysis = evaluation.gaps.map((g) => {
      const match = evaluation.radar.find((r) => r.subject.toLowerCase() === g.skill.toLowerCase());
      const currentLevel = match ? match.score : evaluation.overallScore;
      const requiredLevel = match && match.benchmark !== null ? match.benchmark : null;
      return {
        skill: g.skill,
        currentLevel,
        requiredLevel,
        gapPercentage: g.gapPercentage,
        status: (requiredLevel === null ? 'NO_BENCHMARK_DATA' : 'PARTIAL') as any,
        priority: g.priority,
      };
    });
    profile.lastAssessmentDate = new Date().toISOString().split('T')[0];

    await profile.save();

    // Persist assessment attempt with proctoring audit trail (resilient)
    try {
      const attempt = new AssessmentAttempt({
        userId: req.user._id.toString(),
        score: evaluation.overallScore,
        answers: answers.reduce((acc: any, curr: any) => {
          if (curr.questionId !== undefined) {
            acc[curr.questionId.toString()] = curr.selectedIndex;
          }
          return acc;
        }, {}),
        evaluatedAt: new Date(),
        academicContextHash: req.user.academicContextHash || '',
        academicContextVersion: req.user.academicContextVersion || 1,
        academicContext: {
          degree: targetDegree || req.user.degree || '',
          department: req.user.department || '',
          specialization: req.user.specialization || '',
          institution: req.user.institution || '',
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
      await attempt.save();
    } catch (attemptErr: any) {
      console.warn('[submitDiagnosticAnswers] Non-fatal attempt logging warning:', attemptErr.message);
    }

    await recordAuditLog({
      req,
      action: 'AI_DIAGNOSTIC_EVALUATION',
      entity: 'SkillProfile',
      entityId: profile._id.toString(),
      details: {
        degree: targetDegree,
        overallScore: evaluation.overallScore,
        violationsCount: proctoring?.violationsCount || 0,
        integrityScore: proctoring?.integrityScore ?? 100,
      },
    });

    res.json({
      data: {
        evaluation,
        profile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'EVALUATION_ERROR', message: err.message } });
  }
};

export const generateOpportunityDraftController = async (req: AuthRequest, res: Response) => {
  try {
    const { oppType, facultySubtype, domain, organization, prompt } = req.body;
    const org = organization || req.user?.institution || req.user?.name || '';
    const draft = await generateOpportunityDraft({
      oppType: oppType || 'internship',
      facultySubtype,
      domain: domain || 'Technology & Engineering',
      organization: org,
      prompt,
    });
    res.json({ data: draft });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_DRAFT_ERROR', message: err.message } });
  }
};

export const generateProposalDraftController = async (req: AuthRequest, res: Response) => {
  try {
    const {
      opportunityTitle,
      organization,
      opportunityType,
      description,
      requirements,
      focusArea,
    } = req.body;

    const draft = await generateProposalDraft({
      opportunityTitle: opportunityTitle || 'Research Immersion',
      organization: organization || 'Corporate Partner',
      opportunityType: opportunityType || 'Immersion',
      description: description || '',
      requirements: Array.isArray(requirements) ? requirements : [],
      facultyName: req.user?.name || 'Faculty Researcher',
      institution: req.user?.institution || '',
      focusArea,
    });
    res.json({ data: draft });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_PROPOSAL_ERROR', message: err.message } });
  }
};

export const evaluateProposalSynergyController = async (req: AuthRequest, res: Response) => {
  try {
    const {
      opportunityTitle,
      organization,
      opportunityType,
      requirements,
      facultyName,
      institution,
      proposalText,
      experience,
    } = req.body;

    const evaluation = await evaluateProposalSynergy({
      opportunityTitle: opportunityTitle || '',
      organization: organization || '',
      opportunityType: opportunityType || '',
      requirements: Array.isArray(requirements) ? requirements : [],
      facultyName: facultyName || '',
      institution: institution || '',
      proposalText: proposalText || '',
      experience: experience || '',
    });
    res.json({ data: evaluation });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_SYNERGY_ERROR', message: err.message } });
  }
};

export const generateLearningModuleDraftController = async (req: AuthRequest, res: Response) => {
  try {
    const { domain, type, level, cost, prompt } = req.body;
    if (!domain) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Domain is required to generate curriculum' } });
    }

    const draft = await generateLearningModuleDraft({
      domain,
      type,
      level,
      cost,
      provider: req.user?.institution || req.user?.name,
      prompt,
    });
    res.json({ data: draft });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_LEARNING_DRAFT_ERROR', message: err.message } });
  }
};

export const generateLearningMarketInsightController = async (req: AuthRequest, res: Response) => {
  try {
    const { domain, type } = req.body;
    if (!domain) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Domain is required for market insight' } });
    }
    const insight = await generateLearningMarketInsight({
      domain,
      type,
      provider: req.user?.institution || req.user?.name,
    });
    res.json({ data: insight });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_INSIGHT_ERROR', message: err.message } });
  }
};

export const synthesizeMouTermsController = async (req: AuthRequest, res: Response) => {
  try {
    const { initiatorRole, initiatorOrg, targetOrg, focusArea } = req.body;
    const initiator = initiatorOrg || req.user?.institution || req.user?.name || 'Initiating Partner';
    const synthesized = await synthesizeMouTerms({
      initiatorRole: initiatorRole || (req.user?.role === 'industry' ? 'industry' : 'academician'),
      initiatorOrg: initiator,
      targetOrg: targetOrg || 'Target Partner Organization',
      focusArea,
    });
    res.json({ data: synthesized });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_MOU_SYNTHESIS_ERROR', message: err.message } });
  }
};

export const generateLearningTitlesController = async (req: AuthRequest, res: Response) => {
  try {
    const { domain, type } = req.body;
    if (!domain) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Domain is required for title generation' } });
    }
    const titles = await generateLearningTitleSuggestions(domain, type);
    res.json({ data: titles });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_TITLES_ERROR', message: err.message } });
  }
};


