import { searchRoadmapsForLaggingSkills, RoadmapGuidance } from './roadmapService';

export interface DiagnosticQuestion {
  id: number;
  category: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SkillRadarItem {
  subject: string;
  score: number;
  benchmark: number;
}

export interface DiagnosticEvaluation {
  overallScore: number;
  radar: SkillRadarItem[];
  strengths: string[];
  gaps: { skill: string; gapPercentage: number; priority: 'High' | 'Medium' | 'Low' }[];
  recommendations: { title: string; provider: string; duration: string; type: string }[];
  mandatoryNotice?: string;
  roadmaps?: RoadmapGuidance[];
}

export interface StudyTimelineResult {
  recommendedDays: number;
  recommendedTimeline: string;
  retryAfterDate: string;
  targetedTopics: string[];
  studyAdvice: string;
  recommendedResources: { title: string; type: string; url?: string }[];
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  mandatoryNotice?: string;
  roadmaps?: RoadmapGuidance[];
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'qwen/qwen3.8-27b';

async function callGroq(prompt: string, jsonMode: boolean = true): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert academic evaluator and skill diagnostic engine for university students (covering B.Tech Engineering, Computer Science, Health-Tech, and Ayush medical sciences). Always respond with strictly valid JSON only. Do not include markdown code blocks or text outside the JSON.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq HTTP ${res.status}: ${errText}`);
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      // Clean markdown code fence if present
      const cleaned = content.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Groq AI ${model} Notice]: ${err.message}. Trying next model if available.`);
    }
  }

  throw lastError;
}

// Curated fallbacks for offline or unauthenticated situations
const FALLBACK_QUESTIONS: Record<string, DiagnosticQuestion[]> = {
  technical: [
    {
      id: 1,
      category: 'Data Structures & Algorithms',
      difficulty: 'Basic',
      question: 'What is the time complexity of searching for an element in an unsorted array of size N?',
      options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
      correctIndex: 2,
      explanation: 'In an unsorted array, linear search checks each element one by one, resulting in O(N) time complexity.',
    },
    {
      id: 2,
      category: 'Full-Stack Architecture',
      difficulty: 'Basic',
      question: 'In modern RESTful APIs, which HTTP method should be used to fetch or retrieve a resource without side effects?',
      options: ['GET', 'POST', 'PUT', 'DELETE'],
      correctIndex: 0,
      explanation: 'GET is designed specifically for safe and idempotent retrieval of server resources.',
    },
    {
      id: 3,
      category: 'Data Structures & Algorithms',
      difficulty: 'Intermediate',
      question: 'What is the average time complexity of searching in a balanced Binary Search Tree (AVL / Red-Black Tree)?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctIndex: 1,
      explanation: 'Balanced BSTs maintain height proportional to log(n), ensuring O(log n) search, insertion, and deletion.',
    },
    {
      id: 4,
      category: 'Database Systems',
      difficulty: 'Intermediate',
      question: 'In relational databases, which isolation level prevents Dirty Reads, Non-repeatable Reads, and Phantom Reads?',
      options: ['Read Committed', 'Repeatable Read', 'Serializable', 'Read Uncommitted'],
      correctIndex: 2,
      explanation: 'Serializable is the strictest ACID isolation level and eliminates phantom reads and non-repeatable reads.',
    },
    {
      id: 5,
      category: 'Cloud & DevOps',
      difficulty: 'Intermediate',
      question: 'What is the primary architectural purpose of container orchestration tools like Kubernetes?',
      options: [
        'To compile TypeScript code into WebAssembly',
        'To automate container deployment, scaling, healing, and traffic routing',
        'To provide local disk encryption',
        'To replace standard TCP/IP networking',
      ],
      correctIndex: 1,
      explanation: 'Kubernetes automates scaling, rolling deployments, load balancing, and self-healing across container clusters.',
    },
    {
      id: 6,
      category: 'System Design & Architecture',
      difficulty: 'Advanced',
      question: 'In distributed systems, according to the CAP theorem, what must a network partition force a system to choose between?',
      options: ['Speed vs Security', 'Consistency vs Availability', 'Bandwidth vs Latency', 'Read throughput vs Write throughput'],
      correctIndex: 1,
      explanation: 'During a network partition (P), a distributed system must sacrifice either Consistency (C) or Availability (A).',
    },
    {
      id: 7,
      category: 'Machine Learning & Analytics',
      difficulty: 'Advanced',
      question: 'What machine learning phenomenon occurs when a model performs exceptionally on training data but fails to generalize to unseen test data?',
      options: ['Underfitting', 'Overfitting', 'Data leakage', 'Gradient clipping'],
      correctIndex: 1,
      explanation: 'Overfitting occurs when high-variance models memorize noise and training patterns instead of generalizable features.',
    },
  ],
  ayush: [
    {
      id: 1,
      category: 'Dravyaguna Vigyana',
      difficulty: 'Basic',
      question: 'Which of the following classical herbs contains withanolides and withaferin A as its primary therapeutic phytochemicals?',
      options: ['Tinospora cordifolia (Guduchi)', 'Withania somnifera (Ashwagandha)', 'Bacopa monnieri (Brahmi)', 'Commiphora mukul (Guggulu)'],
      correctIndex: 1,
      explanation: 'Withania somnifera (Ashwagandha) is rich in steroidal lactones known as withanolides.',
    },
    {
      id: 2,
      category: 'Formulation & Rasashastra',
      difficulty: 'Basic',
      question: 'In classical Rasashastra, what is the primary pharmaceutical objective of the Shodhana process?',
      options: ['To add artificial flavor', 'To purify raw mineral/metal toxicities and enhance bio-absorbability', 'To reduce shelf life', 'To increase total mass'],
      correctIndex: 1,
      explanation: 'Shodhana eliminates toxic impurities and prepares metals/minerals for Marana (calcination into micro-nano Bhasmas).',
    },
    {
      id: 3,
      category: 'Analytical QC & Pharmacognosy',
      difficulty: 'Intermediate',
      question: 'Which modern analytical chromatographic technique is standard for establishing fingerprint profiles of raw polyherbal extracts against API standards?',
      options: ['HPTLC (High-Performance Thin-Layer Chromatography)', 'Simple Litmus Paper test', 'Centrifugal separator', 'Gel electrophoresis'],
      correctIndex: 0,
      explanation: 'HPTLC provides reproducible retention factors (Rf) and densitometric peaks for botanical identification and quality assurance.',
    },
    {
      id: 4,
      category: 'Clinical Research & Regulations',
      difficulty: 'Intermediate',
      question: 'Under Ministry of Ayush and CDSCO regulations, which council is the apex research body for formulating preclinical and clinical standards in Ayurveda?',
      options: ['ICMR', 'CCRAS (Central Council for Research in Ayurvedic Sciences)', 'CSIR', 'PCI'],
      correctIndex: 1,
      explanation: 'CCRAS is the apex scientific organization under the Ministry of Ayush for Ayurvedic medical research.',
    },
    {
      id: 5,
      category: 'Good Manufacturing Practice',
      difficulty: 'Advanced',
      question: 'In Ayush-GMP (Schedule T of Drugs and Cosmetics Rules), what is the core regulatory requirement regarding heavy metal limits in finished polyherbal products?',
      options: ['No testing is required', 'Testing for Lead, Cadmium, Arsenic, and Mercury below defined permissible limits (PPM)', 'Only color inspection', 'Mandatory addition of synthetic preservatives'],
      correctIndex: 1,
      explanation: 'Schedule T mandates atomic absorption or ICP-MS testing for Pb, Cd, As, and Hg to safeguard patient safety.',
    },
  ],
};

export const generateDiagnosticQuestions = async (
  degree: string,
  domain?: string,
  targetDomain?: string
): Promise<DiagnosticQuestion[]> => {
  const combinedContext = `${degree || 'Technical Degree'} - Domain: ${domain || 'Computer Science & Engineering'}, Target Career: ${targetDomain || 'Industry Software Engineering'}`;

  const prompt = `Generate an adaptive 7-question technical skill diagnostic multiple-choice assessment for a university student.
Context: ${combinedContext}.
The questions must progress through three clear difficulty tiers:
- Questions 1 & 2: Basic / Foundational level
- Questions 3, 4 & 5: Intermediate level
- Questions 6 & 7: Advanced / Industry-grade level

Return a JSON object with a key "questions" containing an array of 7 objects. Each object must have:
- "id": number (1 to 7)
- "category": string (e.g. Data Structures, Cloud, REST APIs, Databases, Bio-informatics, etc.)
- "difficulty": string ("Basic", "Intermediate", or "Advanced")
- "question": string (clear, academic, realistic problem-solving question)
- "options": array of 4 distinct answer strings
- "correctIndex": number (0 to 3)
- "explanation": string (brief explanation of why this answer is correct)`;

  try {
    const result = await callGroq(prompt);
    if (result && Array.isArray(result.questions) && result.questions.length >= 5) {
      return result.questions.map((q: any, idx: number) => ({
        id: idx + 1,
        category: q.category || 'Core Engineering',
        difficulty: (q.difficulty as any) || (idx < 2 ? 'Basic' : idx < 5 ? 'Intermediate' : 'Advanced'),
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || '',
      }));
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Groq generation fallback used:', err.message);
  }

  const isTechnical =
    degree.toLowerCase().includes('b.tech') ||
    degree.toLowerCase().includes('btech') ||
    degree.toLowerCase().includes('engineering') ||
    degree.toLowerCase().includes('computer') ||
    degree.toLowerCase().includes('it') ||
    (domain && domain.toLowerCase().includes('computer'));

  return isTechnical ? FALLBACK_QUESTIONS.technical : FALLBACK_QUESTIONS.ayush;
};

export const evaluateDiagnosticAnswers = async (
  degree: string,
  answers: { questionId: number; selectedIndex: number; correctIndex: number; category: string }[]
): Promise<DiagnosticEvaluation> => {
  let correctCount = 0;
  answers.forEach((a) => {
    if (a.selectedIndex === a.correctIndex) {
      correctCount++;
    }
  });

  const authenticScore = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  const prompt = `A university student in "${degree}" completed an academic diagnostic assessment and answered ${correctCount} out of ${answers.length} questions correctly, obtaining an overall score of ${authenticScore}%.
Answer categories evaluated: ${answers.map((a) => a.category).join(', ')}.
Compute an academic skill evaluation as a JSON object with:
- "overallScore": number (${authenticScore})
- "radar": array of 6 objects { "subject": string, "score": number (0-100 reflecting actual competency), "benchmark": number (70-85) } representing 6 core competency domains for ${degree}.
- "strengths": array of 2 strings representing their strongest competencies.
- "gaps": array of 2-3 objects { "skill": string, "gapPercentage": number (0-100), "priority": "High" | "Medium" | "Low" }.
- "recommendations": array of 3 objects { "title": string, "provider": string, "duration": string, "type": "Bridge Course" | "Advanced Module" }`;

  try {
    const result = await callGroq(prompt);
    if (result && result.radar && Array.isArray(result.radar) && result.radar.length >= 5) {
      return {
        overallScore: authenticScore,
        radar: result.radar.map((r: any) => ({
          subject: r.subject || 'Core Domain',
          score: Math.min(100, Math.max(0, Number(r.score) || 0)),
          benchmark: Math.min(100, Math.max(50, Number(r.benchmark) || 75)),
        })),
        strengths: result.strengths || ['Technical Problem Solving', 'Core Foundational Concepts'],
        gaps: result.gaps || [{ skill: 'Advanced Industry Architecture', gapPercentage: 100 - authenticScore, priority: 'High' }],
        recommendations: result.recommendations || [
          { title: 'Industry Bridge Specialization', provider: 'National Ayush & Tech Portal', duration: '4 Weeks', type: 'Bridge Course' },
        ],
      };
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Groq evaluation fallback used:', err.message);
  }

  // Authentic heuristic evaluation derived directly from candidate answers
  const categoryStats: Record<string, { correct: number; total: number }> = {};
  answers.forEach((a) => {
    const cat = a.category || 'General';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { correct: 0, total: 0 };
    }
    categoryStats[cat].total++;
    if (a.selectedIndex === a.correctIndex) {
      categoryStats[cat].correct++;
    }
  });

  const isTechnical = degree.toLowerCase().includes('tech') || degree.toLowerCase().includes('computer');
  const baseSubjects = isTechnical
    ? [
        { subject: 'Algorithms & Data Structures', benchmark: 80 },
        { subject: 'Full-Stack Web & APIs', benchmark: 75 },
        { subject: 'Database & Cloud Architecture', benchmark: 78 },
        { subject: 'System Design & OS', benchmark: 72 },
        { subject: 'Machine Learning & Analytics', benchmark: 70 },
        { subject: 'DevOps & CI/CD Pipeline', benchmark: 68 },
      ]
    : [
        { subject: 'Dravyaguna (Herbal Taxonomy)', benchmark: 82 },
        { subject: 'Phytochemical QC & Fingerprinting', benchmark: 75 },
        { subject: 'Rasashastra & Bhaishajya Formulations', benchmark: 80 },
        { subject: 'Clinical Trials & GCP Protocol', benchmark: 74 },
        { subject: 'Ayush-GMP (Schedule T Standards)', benchmark: 76 },
        { subject: 'Preclinical Pharmacodynamics', benchmark: 72 },
      ];

  const radarCategories = baseSubjects.map((b) => {
    const matchedCategory = Object.keys(categoryStats).find(
      (c) => c.toLowerCase().includes(b.subject.toLowerCase()) || b.subject.toLowerCase().includes(c.toLowerCase())
    );
    let catScore = authenticScore;
    if (matchedCategory && categoryStats[matchedCategory].total > 0) {
      catScore = Math.round((categoryStats[matchedCategory].correct / categoryStats[matchedCategory].total) * 100);
    }
    return {
      subject: b.subject,
      score: Math.min(100, Math.max(0, catScore)),
      benchmark: b.benchmark,
    };
  });

  const laggingSkills = radarCategories.filter((r) => r.score < r.benchmark);
  const leadingSkills = radarCategories.filter((r) => r.score >= r.benchmark);

  const gaps = laggingSkills.length > 0
    ? laggingSkills.slice(0, 3).map((s) => ({
        skill: s.subject,
        gapPercentage: Math.max(5, s.benchmark - s.score),
        priority: (s.benchmark - s.score) >= 25 ? ('High' as const) : ('Medium' as const),
      }))
    : [{ skill: 'Specialized Advanced Research', gapPercentage: 10, priority: 'Low' as const }];

  const strengths = leadingSkills.length > 0
    ? leadingSkills.slice(0, 2).map((s) => s.subject)
    : [isTechnical ? 'Foundational Computational Concepts' : 'Foundational Pharmacological Concepts'];

  const gapSkills = gaps.map((g) => g.skill);
  const roadmaps = await searchRoadmapsForLaggingSkills(gapSkills, degree);

  return {
    overallScore: authenticScore,
    radar: radarCategories,
    strengths,
    gaps,
    recommendations: isTechnical
      ? [
          { title: 'Full-Stack Cloud & DevOps Mastery', provider: 'IIT Delhi & AICTE', duration: '6 Weeks', type: 'Advanced Module' },
          { title: 'Scalable Microservices with Node.js & Docker', provider: 'Ministry Tech Cell', duration: '4 Weeks', type: 'Bridge Course' },
          { title: 'Bioinformatics & Machine Learning Pipeline', provider: 'CDAC & Ayush Grid', duration: '3 Weeks', type: 'Bridge Course' },
        ]
      : [
          { title: 'Advanced Phytochemical Characterization (HPTLC & GC-MS)', provider: 'National Ayush R&D & AIIA', duration: '4 Weeks', type: 'Bridge Course' },
          { title: 'Good Clinical Practice (GCP) for Ayush Clinical Trials', provider: 'CCRAS New Delhi', duration: '3 Weeks', type: 'Bridge Course' },
          { title: 'Ayush-GMP Regulatory Auditing & Schedule T Compliance', provider: 'National Institute of Ayurveda', duration: '5 Weeks', type: 'Advanced Module' },
        ],
    mandatoryNotice: 'The Competency Assessment Test is mandatory before applying for any upcoming or ongoing internships or jobs.',
    roadmaps,
  };
};

export const generateStudyTimeline = async (
  domain: string,
  targetDomain: string,
  failedQuestions: { question: string; category: string; explanation?: string }[],
  scoreData?: { correct?: number; total?: number }
): Promise<StudyTimelineResult> => {
  const total = scoreData?.total || Math.max(7, failedQuestions.length + (scoreData?.correct || 0));
  const correct = scoreData?.correct !== undefined ? scoreData.correct : Math.max(0, total - failedQuestions.length);
  const calculatedScore = Math.round((correct / Math.max(1, total)) * 100);

  const laggingSkills = failedQuestions.map(q => q.category).filter((v, i, a) => a.indexOf(v) === i);
  const roadmaps = await searchRoadmapsForLaggingSkills(laggingSkills, domain);
  const mandatoryNotice = 'The Competency Assessment Test is mandatory before applying for any upcoming or ongoing internships or jobs.';

  const prompt = `A university student in ${domain} (aspiring for ${targetDomain || 'Industry Engineering'}) took an adaptive diagnostic assessment and made 5 errors in the following topics:
${failedQuestions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join('\n')}

Act as an empathetic senior mentor and academic counselor. Analyze the conceptual depth of these mistakes and determine a realistic, non-discouraging preparation timeline for this student before re-attempting the diagnostic test.
Return a JSON object with:
- "recommendedDays": number (between 3 and 10 days, reflecting a realistic preparation sprint for a student)
- "recommendedTimeline": string (e.g. "5 Days of Focused Concept Revision")
- "targetedTopics": array of 3-5 specific conceptual topics they need to master based on what they missed
- "studyAdvice": string (constructive, motivating advice explaining what fundamentals to focus on)
- "recommendedResources": array of 3 objects { "title": string, "type": "Documentation" | "Practice" | "Video Tutorial" }`;

  try {
    const result = await callGroq(prompt);
    if (result && result.recommendedTimeline && Array.isArray(result.targetedTopics)) {
      const days = Number(result.recommendedDays) || 5;
      const retryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      return {
        recommendedDays: days,
        recommendedTimeline: result.recommendedTimeline,
        retryAfterDate: retryDate,
        targetedTopics: result.targetedTopics,
        studyAdvice: result.studyAdvice || 'Review foundational principles and practice hands-on coding problems before your next assessment.',
        recommendedResources: result.recommendedResources || [
          { title: 'Standard Computer Science & Engineering Core Foundations', type: 'Documentation' },
          { title: 'Interactive Algorithmic & System Design Drills', type: 'Practice' },
          { title: 'National Academic Video Lecture Series (NPTEL)', type: 'Video Tutorial' }
        ],
        score: calculatedScore,
        totalQuestions: total,
        correctAnswers: correct,
        wrongAnswers: failedQuestions.length,
        mandatoryNotice,
        roadmaps,
      };
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Study timeline generation fallback:', err.message);
  }

  // Realistic fallback
  const days = 5;
  const retryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return {
    recommendedDays: days,
    recommendedTimeline: '5 Days of Targeted Foundations Review',
    retryAfterDate: retryDate,
    targetedTopics: laggingSkills.slice(0, 4),
    studyAdvice: 'Do not be discouraged! Technical mastery takes iterative practice. Take 5 days to revise these foundational topics thoroughly, experiment with practical exercises, and launch your re-assessment when confident.',
    recommendedResources: [
      { title: 'Core Conceptual Fundamentals & API Specifications', type: 'Documentation' },
      { title: 'Hands-on Problem Solving & Architecture Drills', type: 'Practice' },
      { title: 'Open-Access National Academic Video Lectures (NPTEL)', type: 'Video Tutorial' }
    ],
    score: calculatedScore,
    totalQuestions: total,
    correctAnswers: correct,
    wrongAnswers: failedQuestions.length,
    mandatoryNotice,
    roadmaps,
  };
};

export interface UGCDegreeSuggestion {
  name: string;
  fullName: string;
  category: string;
  ugcApproved: boolean;
  level: string;
}

// Authoritative UGC Section 22 official approved degrees
const UGC_DEGREES_CATALOG: UGCDegreeSuggestion[] = [
  // Engineering & Technology (AICTE / UGC)
  { name: 'B.Tech', fullName: 'Bachelor of Technology', category: 'Engineering & Technology', ugcApproved: true, level: 'Undergraduate' },
  { name: 'B.E.', fullName: 'Bachelor of Engineering', category: 'Engineering & Technology', ugcApproved: true, level: 'Undergraduate' },
  { name: 'M.Tech', fullName: 'Master of Technology', category: 'Engineering & Technology', ugcApproved: true, level: 'Postgraduate' },
  { name: 'M.E.', fullName: 'Master of Engineering', category: 'Engineering & Technology', ugcApproved: true, level: 'Postgraduate' },
  { name: 'B.Arch', fullName: 'Bachelor of Architecture', category: 'Architecture & Planning', ugcApproved: true, level: 'Undergraduate' },
  { name: 'M.Arch', fullName: 'Master of Architecture', category: 'Architecture & Planning', ugcApproved: true, level: 'Postgraduate' },
  { name: 'B.Plan', fullName: 'Bachelor of Planning', category: 'Architecture & Planning', ugcApproved: true, level: 'Undergraduate' },

  // Computer Applications & IT
  { name: 'BCA', fullName: 'Bachelor of Computer Applications', category: 'Computer Applications', ugcApproved: true, level: 'Undergraduate' },
  { name: 'MCA', fullName: 'Master of Computer Applications', category: 'Computer Applications', ugcApproved: true, level: 'Postgraduate' },
  { name: 'B.Sc (Computer Science)', fullName: 'Bachelor of Science in Computer Science', category: 'Computer Applications', ugcApproved: true, level: 'Undergraduate' },
  { name: 'B.Sc (Information Technology)', fullName: 'Bachelor of Science in IT', category: 'Computer Applications', ugcApproved: true, level: 'Undergraduate' },
  { name: 'M.Sc (Computer Science)', fullName: 'Master of Science in Computer Science', category: 'Computer Applications', ugcApproved: true, level: 'Postgraduate' },

  // Ayush & Traditional Medicine (NCISM / NCH / UGC)
  { name: 'BAMS', fullName: 'Bachelor of Ayurvedic Medicine and Surgery', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BHMS', fullName: 'Bachelor of Homoeopathic Medicine and Surgery', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BUMS', fullName: 'Bachelor of Unani Medicine and Surgery', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BNYS', fullName: 'Bachelor of Naturopathy and Yogic Sciences', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BSMS', fullName: 'Bachelor of Siddha Medicine and Surgery', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'MD (Ayurveda)', fullName: 'Doctor of Medicine in Ayurveda', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Postgraduate' },
  { name: 'MS (Ayurveda)', fullName: 'Master of Surgery in Ayurveda', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'Postgraduate' },

  // Pharmacy & Medical Sciences
  { name: 'B.Pharm', fullName: 'Bachelor of Pharmacy', category: 'Pharmacy & Health Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'M.Pharm', fullName: 'Master of Pharmacy', category: 'Pharmacy & Health Sciences', ugcApproved: true, level: 'Postgraduate' },
  { name: 'Pharm.D', fullName: 'Doctor of Pharmacy', category: 'Pharmacy & Health Sciences', ugcApproved: true, level: 'Doctorate' },
  { name: 'MBBS', fullName: 'Bachelor of Medicine and Bachelor of Surgery', category: 'Medical Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BDS', fullName: 'Bachelor of Dental Surgery', category: 'Dental Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BPT', fullName: 'Bachelor of Physiotherapy', category: 'Allied Health Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'B.Sc Nursing', fullName: 'Bachelor of Science in Nursing', category: 'Nursing & Health Sciences', ugcApproved: true, level: 'Undergraduate' },

  // Commerce, Management & Sciences
  { name: 'B.Com', fullName: 'Bachelor of Commerce', category: 'Commerce & Finance', ugcApproved: true, level: 'Undergraduate' },
  { name: 'B.Com (Hons)', fullName: 'Bachelor of Commerce (Honours)', category: 'Commerce & Finance', ugcApproved: true, level: 'Undergraduate' },
  { name: 'M.Com', fullName: 'Master of Commerce', category: 'Commerce & Finance', ugcApproved: true, level: 'Postgraduate' },
  { name: 'BBA', fullName: 'Bachelor of Business Administration', category: 'Management Studies', ugcApproved: true, level: 'Undergraduate' },
  { name: 'MBA', fullName: 'Master of Business Administration', category: 'Management Studies', ugcApproved: true, level: 'Postgraduate' },
  { name: 'B.Sc', fullName: 'Bachelor of Science', category: 'Basic Sciences', ugcApproved: true, level: 'Undergraduate' },
  { name: 'M.Sc', fullName: 'Master of Science', category: 'Basic Sciences', ugcApproved: true, level: 'Postgraduate' },
  { name: 'B.Des', fullName: 'Bachelor of Design', category: 'Design & Innovation', ugcApproved: true, level: 'Undergraduate' },
  { name: 'BA', fullName: 'Bachelor of Arts', category: 'Humanities', ugcApproved: true, level: 'Undergraduate' },
  { name: 'LLB', fullName: 'Bachelor of Legislative Law', category: 'Legal Studies', ugcApproved: true, level: 'Undergraduate' },
];

const UGC_FIELDS_CATALOG: UGCDegreeSuggestion[] = [
  { name: 'Computer Science & Engineering', fullName: 'Computer Science & Software Systems', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Artificial Intelligence & Data Science', fullName: 'AI, Machine Learning and Deep Systems', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Information Technology', fullName: 'Information Technology and Network Systems', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Electronics & Communication', fullName: 'Electronics and Communication Engineering', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Cloud Computing & DevOps', fullName: 'Cloud Architecture, Containerization and DevOps', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Cybersecurity & Threat Defense', fullName: 'Network Security and Cyber Defense Systems', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Biotechnology & Bioinformatics', fullName: 'Computational Biology and Biotechnology', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Biomedical Engineering', fullName: 'Biomedical Devices and Health Informatics', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Mechanical Engineering', fullName: 'Mechanical Systems and Robotics', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Electrical & Electronics', fullName: 'Electrical Power and Embedded Hardware', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Civil & Environmental Engineering', fullName: 'Infrastructure and Environmental Engineering', category: 'Engineering & Technology', ugcApproved: true, level: 'All Levels' },
  { name: 'Ayurveda - Kayachikitsa', fullName: 'Internal Medicine and Therapeutics', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Ayurveda - Dravyaguna', fullName: 'Phytochemistry, Pharmacology and Pharmacognosy', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Ayurveda - Rasa Shastra', fullName: 'Ayurvedic Pharmaceutical Chemistry', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Ayurveda - Panchakarma', fullName: 'Clinical Detoxification and Therapy', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Yoga & Naturopathy Sciences', fullName: 'Therapeutic Yoga and Naturopathic Medicine', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Unani - Ilmul Advia', fullName: 'Unani Pharmacology and Formulations', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Homoeopathic Therapeutics', fullName: 'Classical Homoeopathy and Materia Medica', category: 'Ayush & Medical Sciences', ugcApproved: true, level: 'All Levels' },
  { name: 'Commerce & Accountancy', fullName: 'Financial Accounting, Auditing and Taxation', category: 'Commerce & Finance', ugcApproved: true, level: 'All Levels' },
  { name: 'Finance & Banking Services', fullName: 'Corporate Finance and Financial Technology', category: 'Commerce & Finance', ugcApproved: true, level: 'All Levels' },
  { name: 'Marketing & Digital Strategy', fullName: 'Strategic Brand and Digital Marketing', category: 'Management Studies', ugcApproved: true, level: 'All Levels' },
];

export const searchUGCDegrees = async (
  query: string,
  type: 'degree' | 'field' = 'degree'
): Promise<UGCDegreeSuggestion[]> => {
  const cleanQ = (query || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const catalog = type === 'degree' ? UGC_DEGREES_CATALOG : UGC_FIELDS_CATALOG;

  if (!cleanQ) {
    return catalog.slice(0, 10);
  }

  // 1. Authoritative local filter matching acronyms or full names
  const localMatches = catalog.filter((item) => {
    const itemCode = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const itemFull = item.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const itemCat = item.category.toLowerCase().replace(/[^a-z0-9]/g, '');
    return itemCode.includes(cleanQ) || itemFull.includes(cleanQ) || itemCat.includes(cleanQ) || cleanQ.includes(itemCode);
  });

  // If we already have strong matches or query is short, return local authoritative catalog
  if (localMatches.length >= 2 || cleanQ.length < 3) {
    return localMatches;
  }

  // 2. Query Groq AI for dynamic UGC validation
  try {
    const prompt = `You are a strict UGC (University Grants Commission, India) academic accreditation engine.
The user is searching for: "${query}" (category: ${type === 'degree' ? 'Official Degree' : 'Specialization/Field'}).
Return ONLY degrees or fields that are officially approved and recognized by the UGC under Section 22 of the UGC Act 1956 or AICTE/NCISM.
Do NOT include unrecognized private certificate titles or unaccredited diplomas.
Return a JSON array of up to 5 matching approved degrees/fields:
[
  {
    "name": "B.Tech",
    "fullName": "Bachelor of Technology",
    "category": "Engineering & Technology",
    "ugcApproved": true,
    "level": "Undergraduate"
  }
]`;

    const aiResult = await callGroq(prompt);
    if (Array.isArray(aiResult) && aiResult.length > 0) {
      const formatted = aiResult
        .filter((item: any) => item.name && item.fullName)
        .map((item: any) => ({
          name: item.name,
          fullName: item.fullName,
          category: item.category || (type === 'degree' ? 'Higher Education' : 'Academic Stream'),
          ugcApproved: true,
          level: item.level || 'Undergraduate'
        }));

      // Combine and deduplicate
      const seen = new Set<string>();
      const combined: UGCDegreeSuggestion[] = [];
      for (const item of [...localMatches, ...formatted]) {
        const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
      return combined.slice(0, 10);
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] UGC search AI fallback:', err.message);
  }

  return localMatches;
};
