import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { LearningPath, ILearningPathMilestone } from '../models/LearningPath';
import { SkillProfile } from '../models/SkillProfile';
import { User } from '../models/User';
import { callGroq } from '../services/aiClient';

/**
 * GET /api/learning/path/current
 * Retrieves the current active visual learning roadmap for the authenticated student.
 */
export const getCurrentLearningPath = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const path = await LearningPath.findOne({
      userId: user._id,
      isArchived: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ data: path });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/learning/path/generate
 * Generates an individualized, progressive visual learning roadmap using the Groq AI API
 * based on authentic student academic background, assessed skill levels, and target career goals.
 */
export const generateLearningPath = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { targetRole, targetSkill, customGoal } = req.body || {};

    // 1. Fetch real student background and skill profile from database
    const studentUser = await User.findById(user._id).lean();
    const skillProfile = await SkillProfile.findOne({ userId: user._id }).lean();

    const degree = studentUser?.degree || user.degree || 'Degree Program';
    const department = studentUser?.department || user.department || 'Technical & Scientific Studies';
    const specialization = studentUser?.specialization || user.specialization || '';
    const academicDomain = studentUser?.ayushDomain || user.ayushDomain || 'Ayush & Modern Sciences';

    // Extract genuine assessed competencies and detected gaps
    const assessedSkills = (skillProfile?.skills || [])
      .map((s: any) => `${s.name} (level: ${s.level}%)`)
      .slice(0, 10)
      .join(', ');

    const gapSkills = (skillProfile?.gapAnalysis || [])
      .map((g: any) => g.skillName)
      .slice(0, 8)
      .join(', ');

    // Determine the goal
    const goalTitle =
      (customGoal || '').trim() ||
      (targetRole || '').trim() ||
      (targetSkill || '').trim() ||
      (gapSkills ? `Bridging Core Gaps: ${gapSkills}` : `${degree} Professional Mastery Pathway`);

    // 2. Build AI Prompt for Structured Visual Roadmap
    const prompt = `You are a premier technical university curriculum director and career development architect.
Generate a structured, sequential visual learning roadmap for an undergraduate/postgraduate student.

Student Academic Context:
- Degree: "${degree}"
- Department: "${department}"
- Specialization: "${specialization}"
- Domain: "${academicDomain}"
- Currently Assessed Skills: ${assessedSkills || 'Foundation level'}
- Identified Competency Gaps: ${gapSkills || 'None specifically flagged'}
- Target Career Role / Goal: "${goalTitle}"

Requirements:
1. Provide a comprehensive "title" for this learning pathway (e.g. "Full-Stack Distributed Systems Engineering Pathway" or "Clinical Ayurvedic Pharmacology & Formulation Pathway").
2. Provide a 2-sentence "overview" explaining how this pathway systematically bridges the student's background to the target goal.
3. Generate exactly 4 to 6 sequential milestones representing a clear learning journey:
   - Milestone 1: Core Fundamentals & Prerequisite Competencies
   - Milestone 2: Intermediate Implementation & Protocols
   - Milestone 3: Advanced Architecture & Applied Specialization
   - Milestone 4: Industry Capstone Project & Benchmark Readiness
   (Optional Milestones 5-6 if needed for depth)
4. Each milestone MUST have:
   - "id": "step-1", "step-2", "step-3", etc.
   - "stepNumber": integer 1, 2, 3...
   - "title": Clear, professional milestone title
   - "description": 2-sentence description of concepts learned
   - "estimatedHours": realistic timeframe (e.g. "15-20 Hours")
   - "difficulty": "Beginner" | "Intermediate" | "Advanced"
   - "topics": Array of 3 to 4 specific technical concepts or methodologies
   - "learningOutcomes": Array of 2 to 3 practical actionable takeaways
   - "resources": Array of 1 to 2 authoritative learning references with:
       - "title": Resource name
       - "url": Direct URL (e.g., https://roadmap.sh, MDN, official docs)
       - "type": "guide" | "documentation" | "practice"

Return strictly valid JSON only:
{
  "title": "...",
  "overview": "...",
  "milestones": [
    {
      "id": "step-1",
      "stepNumber": 1,
      "title": "...",
      "description": "...",
      "estimatedHours": "15 Hours",
      "difficulty": "Beginner",
      "topics": ["Topic A", "Topic B", "Topic C"],
      "learningOutcomes": ["Outcome 1", "Outcome 2"],
      "resources": [
        { "title": "Official Guide", "url": "https://roadmap.sh", "type": "guide" }
      ]
    }
  ]
}`;

    const aiResult = await callGroq(
      prompt,
      'You are an expert curriculum architect. Respond strictly with a JSON object. Do not include markdown fences, comments, or prose.'
    );

    if (!aiResult || !Array.isArray(aiResult.milestones) || aiResult.milestones.length === 0) {
      throw new Error('AI was unable to format structured milestones. Please retry.');
    }

    // Format milestones with initial progression state (first milestone is 'current', rest are 'locked')
    const formattedMilestones: ILearningPathMilestone[] = aiResult.milestones.map((m: any, idx: number) => ({
      id: m.id || `step-${idx + 1}`,
      stepNumber: m.stepNumber || idx + 1,
      title: m.title || `Milestone ${idx + 1}`,
      description: m.description || 'Curriculum milestone.',
      estimatedHours: m.estimatedHours || '15 Hours',
      difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(m.difficulty) ? m.difficulty : 'Intermediate',
      topics: Array.isArray(m.topics) ? m.topics : ['Core Concepts'],
      learningOutcomes: Array.isArray(m.learningOutcomes) ? m.learningOutcomes : ['Demonstrated Competence'],
      status: idx === 0 ? 'current' : 'locked',
      resources: Array.isArray(m.resources) && m.resources.length > 0
        ? m.resources.map((r: any) => ({
            title: r.title || 'Curriculum Reference',
            url: r.url || 'https://roadmap.sh',
            type: r.type || 'guide',
          }))
        : [{ title: 'Roadmap & Curriculum Guide', url: 'https://roadmap.sh', type: 'guide' }],
    }));

    // Archive previous active paths for this user
    await LearningPath.updateMany(
      { userId: user._id, isArchived: { $ne: true } },
      { $set: { isArchived: true } }
    );

    // Save authentic new LearningPath in MongoDB
    const newPath = new LearningPath({
      userId: user._id,
      title: aiResult.title || `${goalTitle} Visual Pathway`,
      targetRole: goalTitle,
      domain: academicDomain,
      overview: aiResult.overview || `Systematic progression toward ${goalTitle}.`,
      milestones: formattedMilestones,
      overallProgress: 0,
      isArchived: false,
    });

    await newPath.save();

    res.status(201).json({ data: newPath });
  } catch (err: any) {
    console.error('[generateLearningPath] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to generate visual learning path' } });
  }
};

/**
 * PATCH /api/learning/path/milestone/:milestoneId
 * Updates the completion or current status of an individual milestone along the visual path,
 * automatically recalculating overall completion percentage and unlocking the next milestone.
 */
export const updateMilestoneStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const { milestoneId } = req.params;
    const { status } = req.body;

    if (!['locked', 'current', 'completed'].includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Status must be locked, current, or completed' } });
    }

    const path = await LearningPath.findOne({
      userId: user._id,
      isArchived: { $ne: true },
    });

    if (!path) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Active learning path not found' } });
    }

    const targetIndex = path.milestones.findIndex((m) => m.id === milestoneId);
    if (targetIndex === -1) {
      return res.status(404).json({ error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found in pathway' } });
    }

    path.milestones[targetIndex].status = status;
    if (status === 'completed') {
      path.milestones[targetIndex].completedAt = new Date();

      // Automatically advance: unlock the next milestone if it is locked
      if (targetIndex + 1 < path.milestones.length && path.milestones[targetIndex + 1].status === 'locked') {
        path.milestones[targetIndex + 1].status = 'current';
      }
    }

    // Recompute overall progress
    const completedCount = path.milestones.filter((m) => m.status === 'completed').length;
    path.overallProgress = Math.round((completedCount / path.milestones.length) * 100);

    await path.save();

    res.json({ data: path });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
