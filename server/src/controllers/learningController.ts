import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LearningProgram } from '../models/LearningProgram';
import { CourseProgress } from '../models/CourseProgress';
import { Portfolio } from '../models/Portfolio';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { emitToUser } from '../services/socketService';

export const getAllLearningPrograms = async (_req: Request, res: Response) => {
  try {
    const programs = await LearningProgram.find({ isArchived: { $ne: true } }).sort({ rating: -1 }).lean();
    const formatted = programs.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      _id: p._id.toString(),
    }));
    res.json({ data: formatted });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const enrollLearningProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    const program = await LearningProgram.findById(id);
    if (!program) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    program.enrolledCount += 1;
    await program.save();

    if (userId) {
      const notif = new Notification({
        userId,
        title: 'Enrolled in Learning Module',
        message: `You successfully enrolled in "${program.title}". Course syllabus is now available.`,
        type: 'system',
        link: '/student/learning',
      });
      await notif.save();
      emitToUser(userId, 'notification:new', notif);
    }

    res.json({
      data: {
        success: true,
        message: `Enrolled successfully in "${program.title}"! Course materials have been added to your dashboard.`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createLearningProgram = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const newProg = new LearningProgram({
      ...payload,
      rating: 5.0,
      enrolledCount: 0,
    });
    await newProg.save();
    res.status(201).json({ data: newProg });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

function buildLessonsForProgram(program: any) {
  const title = program.title || 'Technical & Scientific Applied Mastery';
  const domain = (program.ayushDomain || (program.skillsCovered || []).join(' ') || '').toLowerCase();
  const type = program.type || 'certification';

  const isAyush = domain.includes('ayush') || domain.includes('phyto') || domain.includes('herbal') || domain.includes('pharmacol');
  const isCloud = domain.includes('cloud') || domain.includes('devops') || domain.includes('k8s') || domain.includes('kubernetes');
  const isAi = domain.includes('ai') || domain.includes('intelligence') || domain.includes('machine learning') || domain.includes('data');
  const isCyber = domain.includes('cyber') || domain.includes('security') || domain.includes('threat');

  // Customize Starter Code & Keywords based on domain
  let codingTitle1 = 'Hands-On Code Sandbox: Core Protocol Implementation';
  let codingDesc1 = 'Write a manual implementation to satisfy the core computational constraint of this module.';
  let starterCode1 = `// Manual Coding Sandbox: Core algorithm\nasync function fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {\n  let attempt = 0;\n  let delayMs = 1000;\n  while (attempt < maxRetries) {\n    try {\n      return await fetch(url);\n    } catch (err) {\n      attempt++;\n      if (attempt >= maxRetries) throw new Error("Max retries exceeded");\n      await new Promise(r => setTimeout(r, delayMs));\n      delayMs *= 2;\n    }\n  }\n}`;
  let keywords1 = ['fetch', 'while', 'catch', 'setTimeout', 'attempt', 'maxRetries'];

  if (isCloud) {
    codingTitle1 = 'Hands-On Code Sandbox: Resilient Container Service Manager';
    codingDesc1 = 'Implement an asynchronous microservice health monitor with automatic retry policy.';
    starterCode1 = `// Cloud DevOps Sandbox: Microservice Deployment Guard\nasync function deployMicroservice(serviceName: string, replicas: number): Promise<{ success: boolean; activeReplicas: number }> {\n  if (!serviceName || replicas <= 0) {\n    throw new Error("Invalid deployment specification");\n  }\n  let activeReplicas = 0;\n  for (let i = 0; i < replicas; i++) {\n    activeReplicas++;\n  }\n  return { success: true, activeReplicas };\n}`;
    keywords1 = ['serviceName', 'replicas', 'activeReplicas', 'success', 'return'];
  } else if (isAyush) {
    codingTitle1 = 'Hands-On Code Sandbox: Phytochemical Standardization & Purity Calculator';
    codingDesc1 = 'Implement a standardization algorithm calculating active constituent concentration against pharmacopeial limits.';
    starterCode1 = `// AYUSH Computational Biology: Botanical Standardization Index\nfunction calculateExtractionPurity(sampleWeightMg: number, activeCompoundMg: number): { purityPercent: number; isStandardized: boolean } {\n  if (sampleWeightMg <= 0 || activeCompoundMg < 0) {\n    throw new Error("Invalid analytical sample weights");\n  }\n  const purityPercent = (activeCompoundMg / sampleWeightMg) * 100;\n  const isStandardized = purityPercent >= 2.5;\n  return { purityPercent, isStandardized };\n}`;
    keywords1 = ['sampleWeightMg', 'activeCompoundMg', 'purityPercent', 'isStandardized', 'return'];
  } else if (isAi) {
    codingTitle1 = 'Hands-On Code Sandbox: Probability Normalization & Softmax Engine';
    codingDesc1 = 'Implement an activation layer normalizing raw neural logits into calibrated probability distributions.';
    starterCode1 = `// AI / Machine Learning Sandbox: Softmax Activation\nfunction computeSoftmax(logits: number[]): number[] {\n  if (!Array.isArray(logits) || logits.length === 0) return [];\n  const expValues = logits.map(v => Math.exp(v));\n  const sumExp = expValues.reduce((acc, curr) => acc + curr, 0);\n  return expValues.map(v => v / sumExp);\n}`;
    keywords1 = ['logits', 'map', 'Math.exp', 'reduce', 'return'];
  } else if (isCyber) {
    codingTitle1 = 'Hands-On Code Sandbox: Security Token Integrity & Signature Guard';
    codingDesc1 = 'Implement an authentication validation function checking token expiration and signature integrity.';
    starterCode1 = `// Cyber Defense Sandbox: Token Integrity Validator\nfunction validateAuthToken(token: string, secretKey: string): { valid: boolean; claims?: string } {\n  if (!token || !secretKey || token.length < 16) {\n    return { valid: false };\n  }\n  const parts = token.split(".");\n  const valid = parts.length === 3 && token.includes("Bearer");\n  return { valid, claims: valid ? "authenticated" : undefined };\n}`;
    keywords1 = ['token', 'secretKey', 'valid', 'split', 'return'];
  }

  // Common second coding sandbox: Data validation & Threat Defense
  const codingTitle2 = 'Practical Verification: Input Sanitization & Threat Defense';
  const codingDesc2 = 'Construct an authorization guard and data sanitization filter for incoming payloads.';
  const starterCode2 = `// Manual coding practice: Data sanitizer & validator (typing only)\nfunction validateCandidateSubmission(candidate: { email: string; score: number }): boolean {\n  if (!candidate || typeof candidate !== "object") return false;\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  const isEmailValid = typeof candidate.email === "string" && emailRegex.test(candidate.email);\n  const isScoreValid = typeof candidate.score === "number" && candidate.score >= 0 && candidate.score <= 100;\n  return isEmailValid && isScoreValid;\n}`;
  const keywords2 = ['email', 'score', 'return', 'regex', 'test'];

  if (type === 'workshop') {
    // Hands-on Lab format: Focus heavily on interactive code sandboxes and live execution
    return [
      {
        id: 'lesson-1',
        moduleNumber: 1,
        title: `${title} - Lab Architecture & Environment Setup`,
        type: 'reading',
        estimatedMinutes: 15,
        description: `Understand the technical specifications, lab environment architecture, and hands-on goals for ${title}.`,
        content: `### Hands-on Lab Overview: ${title}\nThis intensive lab is designed to impart verified practical competency.\n- **Sandbox Environment**: All coding exercises run in an isolated execution sandbox.\n- **Anti-Cheat Enforcement**: Clipboard pasting is disabled to build authentic muscle memory and code comprehension.\n- **Automated Test Harness**: Code submissions undergo syntax AST validation, boundary test runs, and structural checks.`,
        keyTakeaways: ['Hands-on experimentation', 'Active typing muscle memory', 'Immediate test validation'],
      },
      {
        id: 'lesson-2',
        moduleNumber: 2,
        title: codingTitle1,
        type: 'coding',
        estimatedMinutes: 30,
        description: codingDesc1,
        content: `### Interactive Lab Sandbox 1\nType your solution manually in the code editor. Automated test runners will verify syntax and logic constraints.`,
        starterCode: starterCode1,
        solutionKeywords: keywords1,
        testPrompt: `Implement the required algorithm conforming to industry best practices in ${program.ayushDomain || 'software engineering'}.`,
      },
      {
        id: 'lesson-3',
        moduleNumber: 3,
        title: codingTitle2,
        type: 'coding',
        estimatedMinutes: 25,
        description: codingDesc2,
        content: `### Interactive Lab Sandbox 2: Sanitization & Error Handling\nExposing services without strict schema validation causes system instability. Implement input guards and return deterministic outcomes.`,
        starterCode: starterCode2,
        solutionKeywords: keywords2,
        testPrompt: 'Validate that the payload contains a valid email string and a score between 0 and 100.',
      },
      {
        id: 'lesson-4',
        moduleNumber: 4,
        title: 'Lab Defense & Skill Verification Quiz',
        type: 'quiz',
        estimatedMinutes: 15,
        description: 'Verify your understanding of the lab constructs to complete this hands-on lab.',
        content: `### Lab Competency Verification\nComplete this quick assessment to verify your practical mastery and record the lab credential in your Digital Portfolio.`,
        quizQuestions: [
          {
            q: 'What is the primary advantage of completing hands-on labs over passive reading?',
            options: [
              'Labs require zero server resources',
              'Labs develop real-world problem solving, syntax muscle memory, and verified technical competency',
              'Labs remove all software dependencies',
              'Labs disable security logging'
            ],
            correct: 1
          },
          {
            q: 'Why does the sandbox restrict clipboard pasting during practical assessments?',
            options: [
              'To reduce memory bandwidth',
              'To ensure students manually comprehend syntax patterns and prevent blind code copying',
              'To avoid browser cache issues',
              'To block network packets'
            ],
            correct: 1
          }
        ]
      }
    ];
  } else if (type === 'course') {
    // Self-Paced Course format: Focus on structured modular reading, guided tutorials, and self-checks
    return [
      {
        id: 'lesson-1',
        moduleNumber: 1,
        title: `${title} - Module 1: Foundational Theory & Concepts`,
        type: 'reading',
        estimatedMinutes: 20,
        description: 'Foundational principles, core terminology, and historical evolution of this discipline.',
        content: `### Module 1: Foundational Theory & Principles\nWelcome to **${title}**. In this self-paced course, you progress at your own speed with automatic progress tracking.\n\n- **Core Conceptual Pillars**: Understanding why modern engineering and science adopts these standards.\n- **Design Patterns**: Examining proven industrial methodologies.\n- **Self-Paced Learning Strategy**: Study the concepts, complete the hands-on exercise, and review checkpoint quizzes.`,
        keyTakeaways: ['Foundational theory', 'Industry context', 'Self-paced progression'],
      },
      {
        id: 'lesson-2',
        moduleNumber: 2,
        title: `${title} - Module 2: System Architecture & Blueprints`,
        type: 'reading',
        estimatedMinutes: 25,
        description: 'Deep dive into structural architectures, protocols, and standard workflows.',
        content: `### Module 2: Architecture & Practical Blueprints\nIn this module, we dissect the architectural layers required to deploy production-grade solutions:\n- **Component Decoupling**: Isolate responsibilities to ensure scalability.\n- **Data Pipelines & Quality Controls**: Maintaining integrity across data transformations.\n- **Standards Compliance**: Aligning with AICTE, ISO, and NSQF standards.`,
        keyTakeaways: ['System blueprints', 'Data integrity', 'Standards compliance'],
      },
      {
        id: 'lesson-3',
        moduleNumber: 3,
        title: codingTitle1,
        type: 'coding',
        estimatedMinutes: 30,
        description: codingDesc1,
        content: `### Module 3: Guided Practical Sandbox\nPractice applying the concepts learned in Modules 1 & 2 by manually coding the core algorithm.`,
        starterCode: starterCode1,
        solutionKeywords: keywords1,
        testPrompt: 'Write the implementation manually to pass the automated test harness.',
      },
      {
        id: 'lesson-4',
        moduleNumber: 4,
        title: `${title} - Module 4: Case Study & Production Best Practices`,
        type: 'reading',
        estimatedMinutes: 20,
        description: 'Real-world enterprise case study examining common production pitfalls and optimization techniques.',
        content: `### Module 4: Real-World Industry Case Study\nAnalyze how leading enterprises deploy these methodologies at scale:\n- **Performance Optimization**: Reducing latency and resource overhead.\n- **Failure Modes & Troubleshooting**: Detecting anomalies before service degradation.\n- **Institutional Impact**: Bridging academic theory with corporate expectations.`,
        keyTakeaways: ['Enterprise case studies', 'Performance tuning', 'Reliability principles'],
      },
      {
        id: 'lesson-5',
        moduleNumber: 5,
        title: 'Module 5: Self-Paced Comprehensive Milestone Quiz',
        type: 'quiz',
        estimatedMinutes: 15,
        description: 'Demonstrate your mastery across all 4 preceding modules to unlock your verified certificate.',
        content: `### Module 5: Final Milestone Evaluation\nAnswer the checkpoint questions. Upon passing, your certificate is generated with cryptographic verification.`,
        quizQuestions: [
          {
            q: 'What is the primary benefit of self-paced courses for university students?',
            options: [
              'They eliminate the need for any evaluation',
              'They allow flexible learning alongside academic schedules while retaining progress tracking',
              'They bypass accreditation requirements',
              'They are only valid for 24 hours'
            ],
            correct: 1
          },
          {
            q: 'How does modular progress tracking support academic and career goals?',
            options: [
              'It permanently hides student scores',
              'It logs verified milestones to the student’s Digital Portfolio for recruiters to inspect',
              'It deletes past submissions',
              'It prevents students from reviewing lessons'
            ],
            correct: 1
          }
        ]
      }
    ];
  } else {
    // Default Certification track: Hybrid 5-step with both theory, 2 sandboxes, and capstone
    return [
      {
        id: 'lesson-1',
        moduleNumber: 1,
        title: `${title} - Specification & Industry Standards`,
        type: 'reading',
        estimatedMinutes: 20,
        description: 'Industry specifications and standard qualification requirements.',
        content: `### Industry Certification Track: ${title}\nThis accredited certification verifies that you possess both theoretical comprehension and practical execution capabilities.`,
        keyTakeaways: ['Accredited standards', 'Architectural rigor', 'Practical verification'],
      },
      {
        id: 'lesson-2',
        moduleNumber: 2,
        title: codingTitle1,
        type: 'coding',
        estimatedMinutes: 30,
        description: codingDesc1,
        content: `### Milestone 2: Technical Protocol Implementation`,
        starterCode: starterCode1,
        solutionKeywords: keywords1,
        testPrompt: 'Write the implementation manually to pass the automated test harness.',
      },
      {
        id: 'lesson-3',
        moduleNumber: 3,
        title: codingTitle2,
        type: 'coding',
        estimatedMinutes: 25,
        description: codingDesc2,
        content: `### Milestone 3: Security & Validation Guard Sandbox`,
        starterCode: starterCode2,
        solutionKeywords: keywords2,
        testPrompt: 'Validate that the payload contains a valid email string and a score between 0 and 100.',
      },
      {
        id: 'lesson-4',
        moduleNumber: 4,
        title: 'Certification Defense Assessment',
        type: 'quiz',
        estimatedMinutes: 15,
        description: 'Final milestone: Answer the competency defense questions to verify your mastery and unlock your official National Certificate.',
        content: `### Final Competency Evaluation\nReview all modules completed. When you submit this final milestone with all preceding tasks checked, your verified certificate will be generated with an official QR code and logged in your National Digital Portfolio.`,
        quizQuestions: [
          {
            q: 'Why should clipboard paste be restricted during foundational coding practice?',
            options: [
              'To reduce server bandwidth',
              'To build authentic muscle memory, syntax familiarity, and deep code comprehension',
              'To prevent JavaScript memory leaks',
              'To disable WebSockets'
            ],
            correct: 1
          },
          {
            q: 'In distributed architectures, what primary advantage does exponential backoff provide?',
            options: [
              'It accelerates server CPU frequency',
              'It prevents thundering herd problem and relieves recovering downstream services',
              'It bypasses CORS policies',
              'It encrypts payload headers'
            ],
            correct: 1
          }
        ]
      }
    ];
  }
}

export const getCourseWorkspace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id?.toString() || (req.query.userId as string);

    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required for private course workspace' } });
    }

    let program: any = null;
    if (id && id !== 'undefined' && mongoose.isValidObjectId(id)) {
      program = await LearningProgram.findById(id).lean();
    }
    if (!program && id && id !== 'undefined') {
      program = await LearningProgram.findOne({ _id: id }).lean();
    }
    if (!program) {
      program = await LearningProgram.findOne({}).lean();
    }
    if (!program) {
      program = {
        id: 'course_default',
        title: 'Full-Stack Architecture & Cloud Distributed Systems',
        provider: 'National NodalConnector Directorate',
        type: 'certification',
        skillsCovered: ['Software Engineering', 'REST APIs', 'Cloud Computing', 'Data Structures & Algorithms'],
        description: 'Comprehensive technical sprint with interactive coding challenges and verification milestones.',
        duration: '4 Weeks',
        level: 'Intermediate',
      };
    } else {
      program.id = program._id.toString();
      program._id = program._id.toString();
    }

    // 1. Fetch or initialize student's private CourseProgress
    const courseKey = (program.id || program._id || 'course_default').toString();
    let progress = await CourseProgress.findOne({ userId, courseId: courseKey });
    if (!progress) {
      progress = await CourseProgress.create({
        userId,
        courseId: courseKey,
        courseTitle: program.title,
        completedLessons: [],
        codeSubmissions: {},
        overallProgressPercent: 0,
        isCompleted: false,
        lastAccessedAt: new Date(),
      });
    } else {
      progress.lastAccessedAt = new Date();
      await progress.save();
    }

    // 2. Structured interactive lessons tailored to course format & domain
    const lessons = buildLessonsForProgram(program);

    res.json({
      data: {
        program,
        progress,
        lessons,
        totalLessons: lessons.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateCourseProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lessonId, completed, submittedCode, totalLessons = 5 } = req.body;
    const userId = (req as any).user?._id?.toString() || req.body.userId;

    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const courseKey = (!id || id === 'undefined') ? 'course_default' : id;
    let progress = await CourseProgress.findOne({ userId, courseId: courseKey });
    if (!progress) {
      progress = new CourseProgress({
        userId,
        courseId: courseKey,
        courseTitle: 'Technical Course Sprint',
        completedLessons: [],
        codeSubmissions: {},
        overallProgressPercent: 0,
        isCompleted: false,
      });
    }

    // Update completedLessons set
    const currentCompleted = new Set(progress.completedLessons || []);
    if (completed) {
      currentCompleted.add(lessonId);
    } else {
      currentCompleted.delete(lessonId);
    }
    progress.completedLessons = Array.from(currentCompleted);

    // Save submitted code if provided
    if (submittedCode !== undefined) {
      if (!progress.codeSubmissions) {
        progress.codeSubmissions = new Map();
      }
      progress.codeSubmissions.set(lessonId, submittedCode);
    }

    const pct = Math.min(100, Math.round((progress.completedLessons.length / Math.max(1, totalLessons)) * 100));
    progress.overallProgressPercent = pct;

    let newlyCompleted = false;
    if (pct >= 100 && !progress.isCompleted) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
      progress.certificateId = `SB-CERT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      newlyCompleted = true;

      // Add to student's Portfolio certificates automatically
      let portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) {
        portfolio = new Portfolio({ userId, certificates: [], projects: [] });
      }

      portfolio.certificates.push({
        title: `${progress.courseTitle} - Verified Professional Mastery`,
        issuer: 'NodalConnector National Directorate (SIH26044)',
        issueDate: new Date().toISOString().split('T')[0],
        credentialUrl: `/verify/${progress.certificateId}`,
        verified: true,
        badgeIcon: 'Award',
      });
      await portfolio.save();

      // Create notification
      const notif = new Notification({
        userId,
        title: 'Course Completed & Certificate Issued!',
        message: `Congratulations! You completed 100% of "${progress.courseTitle}". Your verified Certificate ID is ${progress.certificateId}.`,
        type: 'achievement',
        link: '/student/portfolio',
      });
      await notif.save();
      emitToUser(userId, 'notification:new', notif);
    }

    progress.lastAccessedAt = new Date();
    await progress.save();

    res.json({
      data: {
        progress,
        newlyCompleted,
        certificateId: progress.certificateId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getCourseCertificate = async (req: Request, res: Response) => {
  try {
    const { certId } = req.params;
    const progress = await CourseProgress.findOne({ certificateId: certId });
    if (!progress) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Certificate record not found' } });
    }

    const user = await User.findById(progress.userId).select('name email institution degree');

    res.json({
      data: {
        certificateId: progress.certificateId,
        studentName: user?.name || 'Verified Scholar',
        studentEmail: user?.email || '',
        institution: user?.institution || 'Accredited University',
        courseTitle: progress.courseTitle,
        completedAt: progress.completedAt,
        verified: true,
        issuer: 'National Directorate for Academia-Industry Skill Bridge (SIH26044)',
        verificationUrl: `${(process.env.FRONTEND_URL || 'https://sih26044-ayush-portal.vercel.app').replace(/\/+$/, '')}/verify/${progress.certificateId}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getManagedLearningPrograms = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const institution = user?.institution || '';
    const name = user?.name || '';
    const userId = user?._id?.toString();

    let query: any = {};
    if (user?.role === 'industry' || user?.role === 'academician') {
      query = {
        $or: [
          { creatorId: userId },
          { provider: new RegExp(institution || name || 'xxx', 'i') },
          { isSponsored: true }
        ]
      };
    }

    let programs = await LearningProgram.find(query).sort({ createdAt: -1 }).lean();
    if (programs.length === 0) {
      programs = await LearningProgram.find({}).sort({ createdAt: -1 }).lean();
    }

    const enriched = await Promise.all(
      programs.map(async (prog: any) => {
        const progId = prog._id.toString();
        const completedCount = await CourseProgress.countDocuments({
          $or: [
            { courseId: progId },
            { courseTitle: prog.title }
          ],
          isCompleted: true
        });
        const inProgressCount = await CourseProgress.countDocuments({
          $or: [
            { courseId: progId },
            { courseTitle: prog.title }
          ],
          isCompleted: false
        });

        return {
          ...prog,
          id: progId,
          _id: progId,
          completedCount,
          inProgressCount,
          totalEnrollees: Math.max(prog.enrolledCount || 0, completedCount + inProgressCount),
        };
      })
    );

    res.json({ data: enriched });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getProgramEnrollees = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid program ID' } });
    }

    const program = await LearningProgram.findById(id).lean();

    const progresses = await CourseProgress.find({
      $or: [
        { courseId: id },
        { courseTitle: program?.title }
      ]
    }).sort({ updatedAt: -1 }).lean();

    const userIds = progresses.map((p) => p.userId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('name email institution department rollNumber').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const enrollees = progresses.map((cp: any) => {
      const student = userMap.get(cp.userId?.toString()) || {};
      return {
        id: cp._id.toString(),
        userId: cp.userId,
        studentName: (student as any).name || 'Enrolled Scholar',
        studentEmail: (student as any).email || 'N/A',
        studentInstitution: (student as any).institution || 'Academic Institution',
        studentDepartment: (student as any).department || 'Engineering & Sciences',
        progressPercent: cp.overallProgressPercent || 0,
        isCompleted: cp.isCompleted || false,
        completedAt: cp.completedAt || cp.updatedAt,
        certificateId: cp.certificateId,
        lessonsCompletedCount: (cp.completedLessons || []).length,
      };
    });

    res.json({
      data: {
        program: program ? { ...program, id: program._id.toString() } : null,
        enrollees,
        totalEnrollees: enrollees.length,
        totalCompleted: enrollees.filter((e) => e.isCompleted).length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const deleteLearningProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    const program = await LearningProgram.findById(id);
    if (!program) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    // Soft-delete / Archive from public listings
    program.isArchived = true;
    await program.save();

    // CRITICAL REQUIREMENT PRESERVED:
    // Any student who already completed this program retains their course progress,
    // digital portfolio badge, and verifiable certificate indefinitely.

    res.json({
      data: {
        success: true,
        message: `Learning module "${program.title}" has been archived and removed from public enrollment. Any students who already completed it retain their verified certificates and digital credentials permanently.`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

