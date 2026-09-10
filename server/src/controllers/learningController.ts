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
    const programs = await LearningProgram.find({}).sort({ rating: -1 }).lean();
    res.json({ data: programs });
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

export const getCourseWorkspace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id?.toString() || (req.query.userId as string);

    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required for private course workspace' } });
    }

    let program: any = null;
    if (mongoose.isValidObjectId(id)) {
      program = await LearningProgram.findById(id).lean();
    }
    if (!program) {
      program = {
        id: id || 'course_default',
        title: 'Full-Stack Architecture & Cloud Distributed Systems',
        provider: 'National NodalConnector Directorate',
        skillsCovered: ['Software Engineering', 'REST APIs', 'Cloud Computing', 'Data Structures & Algorithms'],
        description: 'Comprehensive technical sprint with interactive coding challenges and verification milestones.',
        duration: '4 Weeks',
        level: 'Intermediate',
      };
    }

    // 1. Fetch or initialize student's private CourseProgress
    const courseKey = (program.id || program._id || id).toString();
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

    // 2. Structured interactive lessons / todo list
    const lessons = [
      {
        id: 'lesson-1',
        moduleNumber: 1,
        title: 'Core Architectural Concepts & Distributed State',
        type: 'reading',
        estimatedMinutes: 20,
        description: 'Understand the foundational pillars of scalable systems, synchronous vs asynchronous processing, and separation of concerns.',
        content: `### 1. Fundamental Architecture Patterns\nModern digital services operate on distributed architectures where state and computation are decoupled. In this lesson, we study:\n- **Monolithic vs Modular Microservices**: When to decouple business domains into bounded contexts.\n- **Stateless Application Servers**: Ensuring that web tier containers do not store session affinity, allowing elastic scaling.\n- **Idempotency & Fault Tolerance**: Designing RESTful APIs where repeated mutations (PUT/DELETE) produce deterministic state.`,
        keyTakeaways: ['High cohesion and loose coupling', 'Stateless request lifecycles', 'Idempotent HTTP transactions'],
      },
      {
        id: 'lesson-2',
        moduleNumber: 2,
        title: 'Real-Time Signaling & Peer-to-Peer Communication',
        type: 'reading',
        estimatedMinutes: 25,
        description: 'Deep dive into event-driven design, WebSockets, and peer-to-peer signaling mechanics.',
        content: `### 2. Event-Driven Messaging Mechanics\nDirect client-to-client communication requires a signaling mediator to exchange session descriptions (SDP) and ICE candidates before establishing a direct P2P mesh.\n- **Signaling Server Responsibilities**: Relaying room handshake tokens without processing media streams.\n- **STUN & TURN Protocol**: Traversing symmetric NAT barriers through reflexive transport candidates.\n- **Backpressure & Reliability**: Handling socket disconnects gracefully with heartbeat pings.`,
        keyTakeaways: ['Socket.IO room multiplexing', 'NAT hole punching via STUN', 'Dynamic peer reconnection'],
      },
      {
        id: 'lesson-3',
        moduleNumber: 3,
        title: 'Hands-On Code Sandbox: Resilient API Client & Exponential Backoff',
        type: 'coding',
        estimatedMinutes: 30,
        description: 'Hands-on practical: Manually write a robust TypeScript request handler that features exponential backoff retry logic. (Note: Pasting is disabled to reinforce manual muscle memory).',
        content: `### 3. Active Coding Assignment: Exponential Backoff Retry Pattern\nIn cloud distributed systems, transient network failures are common. A robust API client must never fail abruptly; it must retry idempotent calls with exponential jitter.\n\n**Requirements:**\n1. Write a function \`async function fetchWithRetry(url: string, maxRetries: number = 3)\`.\n2. In a loop, attempt to call the network request.\n3. If it throws an error, increase the delay exponentially before retrying.\n4. If attempts exceed maxRetries, throw a descriptive Error.`,
        starterCode: `// Write your solution below manually (typing only - clipboard paste is disabled)
async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {
  let attempt = 0;
  let delayMs = 1000;

  while (attempt < maxRetries) {
    try {
      // Perform request
      return await fetch(url);
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw new Error("Max retries exceeded");
      await new Promise(r => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }
}`,
        solutionKeywords: ['fetch', 'while', 'catch', 'setTimeout', 'attempt', 'maxRetries'],
        testPrompt: 'Write an async function that catches network errors and retries with increasing delay.',
      },
      {
        id: 'lesson-4',
        moduleNumber: 4,
        title: 'Practical Verification: Input Sanitization & Threat Defense',
        type: 'coding',
        estimatedMinutes: 25,
        description: 'Construct an authorization guard and data sanitization filter for incoming payloads.',
        content: `### 4. Input Sanitization & Integrity Validation\nExposing API endpoints without strict schema validation leads to injection attacks and unhandled exceptions.\n\n**Requirements:**\n1. Write a validation utility that inspects candidate submission objects for valid email and score range (0-100).\n2. Return true if valid, false otherwise.`,
        starterCode: `// Manual coding practice: Data sanitizer & validator (typing only)
function validateCandidateSubmission(candidate: { email: string; score: number }): boolean {
  if (!candidate || typeof candidate !== "object") return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = typeof candidate.email === "string" && emailRegex.test(candidate.email);
  const isScoreValid = typeof candidate.score === "number" && candidate.score >= 0 && candidate.score <= 100;
  
  return isEmailValid && isScoreValid;
}`,
        solutionKeywords: ['email', 'score', 'return', 'regex', 'test'],
        testPrompt: 'Validate that the payload contains a valid email string and a score between 0 and 100.',
      },
      {
        id: 'lesson-5',
        moduleNumber: 5,
        title: 'Milestone Assessment: Defense & Certification Unlock',
        type: 'quiz',
        estimatedMinutes: 15,
        description: 'Final milestone: Answer the competency defense questions to verify your mastery and unlock your official National NodalConnector Certificate.',
        content: `### 5. Final Competency Evaluation\nReview all modules completed. When you submit this final milestone with all preceding tasks checked, your verified certificate will be generated with an official QR code and logged in your National Digital Portfolio.`,
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

    let progress = await CourseProgress.findOne({ userId, courseId: id });
    if (!progress) {
      progress = new CourseProgress({
        userId,
        courseId: id,
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

