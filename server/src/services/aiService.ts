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
const PRIMARY_MODEL = 'groq/compound-mini';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

async function callGroq(prompt: string, jsonMode: boolean = true): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        signal: controller.signal,
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
      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      lastError = err;
      console.warn(`[Groq AI ${model} Notice]: ${err.message}. Trying next model if available.`);
    }
  }

  throw lastError;
}

export interface DynamicSpecializationResponse {
  degree: string;
  academicField: string;
  specializations: string[];
  suggestedCareers: string[];
  recommendedTopics: string[];
}

export const getDynamicSpecializations = async (degree: string): Promise<DynamicSpecializationResponse> => {
  const cleanDeg = (degree || '').trim();
  if (!cleanDeg) {
    throw new Error('Degree name is required to retrieve AI-generated specializations.');
  }

  const prompt = `You are a higher education curriculum and accreditation director under UGC, AICTE, Ministry of Ayush, BCI, and MCI.
For the academic degree "${cleanDeg}", dynamically generate verified specializations/academic majors, associated career paths, and core curriculum topics.

Rules:
1. Dynamically tailor specializations based on the exact degree without hardcoding:
   - If Law (e.g. LL.B, B.A. LL.B, LL.M): include "Constitutional Law", "Corporate & Commercial Law", "Criminal Jurisprudence & Litigation", "Cyber Law & Intellectual Property Rights", "Taxation & Financial Law", "International Law & Arbitration".
   - If Ayush (e.g. BAMS, MD Ayurveda, BHMS): include "Dravyaguna Vigyana", "Rasashastra & Bhaishajya Kalpana", "Panchakarma Therapy", "Kayachikitsa", etc.
   - If Engineering / Tech: include modern engineering specializations.
   - For all other degrees: generate authentic recognized specializations.
2. Return strictly JSON:
{
  "degree": "${cleanDeg}",
  "academicField": "Broad academic discipline",
  "specializations": ["Specialization 1", "Specialization 2", "Specialization 3", "Specialization 4", "Specialization 5", "Specialization 6"],
  "suggestedCareers": ["Career 1", "Career 2", "Career 3", "Career 4", "Career 5"],
  "recommendedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
}`;

  const aiResult = await callGroq(prompt);
  if (!aiResult || !Array.isArray(aiResult.specializations) || aiResult.specializations.length === 0) {
    throw new Error(`AI was unable to generate specializations for degree "${cleanDeg}".`);
  }

  return {
    degree: cleanDeg,
    academicField: aiResult.academicField || 'Higher Education Studies',
    specializations: aiResult.specializations,
    suggestedCareers: Array.isArray(aiResult.suggestedCareers) ? aiResult.suggestedCareers : [],
    recommendedTopics: Array.isArray(aiResult.recommendedTopics) ? aiResult.recommendedTopics : [],
  };
};

export const generateDiagnosticQuestions = async (
  degree: string,
  domain?: string,
  targetDomain?: string,
  specialization?: string
): Promise<DiagnosticQuestion[]> => {
  const activeDegree = (degree || '').trim();
  const activeSpecialization = (specialization || domain || '').trim();
  const activeTarget = (targetDomain || '').trim();

  if (!activeDegree && !activeSpecialization) {
    throw new Error('Degree or specialization is required to generate AI diagnostic questions.');
  }

  const combinedContext = `Degree: "${activeDegree || 'University Degree'}", Specialization/Discipline: "${activeSpecialization || 'Core Curriculum'}", Target Career Track: "${activeTarget || 'Industry Specialist'}"`;

  const prompt = `You are a university academic examination director and subject-matter expert.
Generate an adaptive 7-question multiple-choice technical/academic assessment tailored strictly to:
${combinedContext}

Strict Subject Alignment Rules:
1. Questions MUST directly reflect the exact degree and specialization requested.
   - For example:
     - If the degree or specialization is Law / Constitutional Law, questions MUST strictly cover constitutional law, Article 21, Fundamental Rights, judicial review, Basic Structure Doctrine, writ jurisdiction, and landmark Supreme Court cases.
     - If AYUSH / BAMS, questions MUST cover Dravyaguna, Schedule T GMP, Clinical Rog Nidan, or classical pharmacology.
     - If Engineering / Computer Science, questions MUST cover Algorithms, Distributed Systems, Databases, or Cloud.
     - If Pharmacy, cover Pharmacokinetics, Drug Design, QC & Pharmacology.
     - If Management / MBA, cover Strategic Analysis, Corporate Finance, and Operations.
2. The questions must progress through three clear difficulty tiers:
   - Questions 1 & 2: Basic / Foundational level
   - Questions 3, 4 & 5: Intermediate level
   - Questions 6 & 7: Advanced / Industry-grade level

Return a JSON object with a key "questions" containing an array of 7 objects. Each object must have:
- "id": number (1 to 7)
- "category": string (specific sub-topic within this specialization)
- "difficulty": "Basic" | "Intermediate" | "Advanced"
- "question": string (clear, academic, realistic problem-solving question)
- "options": array of 4 distinct answer strings
- "correctIndex": number (0 to 3)
- "explanation": string (brief explanation of why this answer is correct)`;

  const result = await callGroq(prompt);
  if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
    throw new Error(`AI was unable to generate assessment questions for ${activeDegree} - ${activeSpecialization}.`);
  }

  return result.questions.map((q: any, idx: number) => ({
    id: idx + 1,
    category: q.category || activeSpecialization || 'Core Discipline',
    difficulty: (q.difficulty as any) || (idx < 2 ? 'Basic' : idx < 5 ? 'Intermediate' : 'Advanced'),
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation || '',
  }));
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

export interface VerifiedInstitution {
  id: string;
  name: string;
  shortName?: string;
  type: 'Central University' | 'State University' | 'Deemed University' | 'Institute of National Importance' | 'Affiliated College' | 'Autonomous College' | 'Private University';
  affiliatingUniversity?: string | null;
  state: string;
  city: string;
  accreditationStatus: string;
  isRecognized: boolean;
}

export interface VerifiedProgram {
  name: string;
  fullName: string;
  level: 'Undergraduate' | 'Postgraduate' | 'Doctorate' | 'Diploma' | 'Integrated';
  academicField: string;
  isVerified: boolean;
}

export interface VerifiedDepartment {
  name: string;
  specializations: string[];
}

export interface ProgramHierarchyResponse {
  institution: string;
  degree: string;
  academicField: string;
  departments: VerifiedDepartment[];
}

export interface AcademicValidationResult {
  isValid: boolean;
  institution: string;
  degree: string;
  academicField: string | null;
  department?: string;
  specialization?: string;
  message: string;
  reason?: string;
}

/**
 * 1. Search and verify recognized Indian higher education institutions against UGC/AICTE official data.
 * Zero hardcoded catalogs or static fallbacks.
 */
export const verifyAndSearchInstitutions = async (
  query: string
): Promise<VerifiedInstitution[]> => {
  const cleanQ = (query || '').trim();
  if (!cleanQ || cleanQ.length < 2) {
    return [];
  }

  try {
    const prompt = `You are a strict UGC (University Grants Commission) and AICTE official accreditation directory for India.
The user is searching for Indian higher education institutions with query: "${cleanQ}".
Search and return ONLY legitimate, UGC/AICTE-recognized universities or colleges matching this query.
If the institution is an affiliated college, explicitly identify its affiliating university.
Return a JSON array of up to 8 matching recognized institutions:
[
  {
    "id": "normalized-unique-slug",
    "name": "Full Official Name",
    "shortName": "Acronym/Abbreviation or empty string",
    "type": "Central University" | "State University" | "Deemed University" | "Institute of National Importance" | "Affiliated College" | "Autonomous College" | "Private University",
    "affiliatingUniversity": "Affiliating University Name or null if independent/autonomous/university itself",
    "state": "State Name",
    "city": "City Name",
    "accreditationStatus": "e.g. Recognized by UGC under Section 2(f) & 12(B) / AICTE Approved",
    "isRecognized": true
  }
]
If the query does NOT match any legitimate, recognized Indian higher education institution, return strictly [].`;

    const aiResult = await callGroq(prompt);
    if (Array.isArray(aiResult)) {
      return aiResult
        .filter((item: any) => item && item.name && item.isRecognized)
        .map((item: any) => ({
          id: item.id || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          name: item.name.trim(),
          shortName: item.shortName || undefined,
          type: item.type || 'Affiliated College',
          affiliatingUniversity: item.affiliatingUniversity || null,
          state: item.state || 'India',
          city: item.city || '',
          accreditationStatus: item.accreditationStatus || 'Recognized by UGC',
          isRecognized: true,
        }));
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Institution verification error:', err.message);
  }

  return [];
};

/**
 * 2. Retrieve exact programs/degrees verified as offered by a specific institution.
 * Strictly respects affiliated college constraints without assuming the college offers all university degrees.
 */
export const getInstitutionPrograms = async (
  institution: string,
  affiliatingUniversity?: string
): Promise<VerifiedProgram[]> => {
  const cleanInst = (institution || '').trim();
  if (!cleanInst) return [];

  try {
    const prompt = `You are a strict Indian university registrar and UGC accreditation directory.
Return ONLY exact degrees and programs that are ACTUALLY offered by the selected institution: "${cleanInst}"${
      affiliatingUniversity ? ` (Affiliated to: "${affiliatingUniversity}")` : ''
    }.
Do NOT infer or generalize programs that this institution does not offer.
If the institution is an affiliated college, list ONLY programs offered at that specific college, NOT all programs of the affiliating university.
Distinguish exact degree types (e.g. B.Tech, B.E., B.Sc., BCA, MBA, MCA, LLB, LLM, M.Tech, M.Sc., Diploma, PhD, Integrated programs).
Return a JSON array of verified programs:
[
  {
    "name": "B.Tech",
    "fullName": "Bachelor of Technology",
    "level": "Undergraduate",
    "academicField": "Engineering & Technology",
    "isVerified": true
  }
]
If the institution has no verified programs or cannot be verified, return strictly [].`;

    const aiResult = await callGroq(prompt);
    if (Array.isArray(aiResult)) {
      return aiResult
        .filter((item: any) => item && item.name && item.fullName)
        .map((item: any) => ({
          name: item.name.trim(),
          fullName: item.fullName.trim(),
          level: item.level || 'Undergraduate',
          academicField: item.academicField || 'Higher Education',
          isVerified: true,
        }));
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Institution programs retrieval error:', err.message);
  }

  return [];
};

/**
 * 3. Retrieve academic field, physical departments, and specializations for institution + degree.
 */
export const getInstitutionHierarchy = async (
  institution: string,
  degree: string
): Promise<ProgramHierarchyResponse | null> => {
  const cleanInst = (institution || '').trim();
  const cleanDeg = (degree || '').trim();
  if (!cleanInst || !cleanDeg) return null;

  try {
    const prompt = `You are a strict Indian university academic curriculum and department verifier.
For the institution "${cleanInst}" and verified degree "${cleanDeg}":
1. Determine the official academic field (e.g. Engineering & Technology, Computer Applications, Management Studies, Ayush & Medical Sciences).
2. List ONLY the actual academic departments/divisions that physically exist at "${cleanInst}" for this program.
3. For each department, list verified specializations/tracks offered at this institution (or ["General"] if standard curriculum).
Return JSON strictly:
{
  "institution": "${cleanInst}",
  "degree": "${cleanDeg}",
  "academicField": "Official Academic Field Name",
  "departments": [
    {
      "name": "Department Name",
      "specializations": ["Specialization Track 1", "General"]
    }
  ]
}
If this degree is NOT offered by this institution or cannot be verified, return:
{
  "institution": "${cleanInst}",
  "degree": "${cleanDeg}",
  "academicField": "",
  "departments": []
}`;

    const aiResult = await callGroq(prompt);
    if (aiResult && Array.isArray(aiResult.departments)) {
      return {
        institution: cleanInst,
        degree: cleanDeg,
        academicField: aiResult.academicField || 'Academic Studies',
        departments: aiResult.departments.map((d: any) => ({
          name: d.name || 'General Department',
          specializations: Array.isArray(d.specializations) && d.specializations.length > 0
            ? d.specializations
            : ['General'],
        })),
      };
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Hierarchy retrieval error:', err.message);
  }

  return null;
};

/**
 * 4. End-to-end combination validation for College + Degree (+ Department + Specialization).
 * Returns strict invalidation message when combinations do not exist.
 */
export const validateAcademicHierarchy = async (
  institution: string,
  degree: string,
  department?: string,
  specialization?: string
): Promise<AcademicValidationResult> => {
  const cleanInst = (institution || '').trim();
  const cleanDeg = (degree || '').trim();
  const cleanDept = (department || '').trim();
  const cleanSpec = (specialization || '').trim();

  if (!cleanInst || !cleanDeg) {
    return {
      isValid: false,
      institution: cleanInst,
      degree: cleanDeg,
      academicField: null,
      message: 'Both College/Institution and Degree/Program must be specified for verification.',
    };
  }

  try {
    const prompt = `You are a strict UGC and Indian university accreditation validation engine.
Evaluate whether the exact combination of institution, degree, and optional department/specialization is verified to exist.
Institution: "${cleanInst}"
Degree: "${cleanDeg}"
Department: "${cleanDept || 'Not specified'}"
Specialization: "${cleanSpec || 'Not specified'}"

Validation Rules:
1. Prioritize official institution websites, university statutes, and UGC official records.
2. Do not assume or generalize. If the institution does NOT offer this exact degree (e.g. IIT Delhi offering LLM, or Ayurveda college offering B.Tech), isValid MUST be false.
3. If department is specified, verify that the department physically exists at this institution for this degree.
4. If invalid, the message MUST be: "This degree could not be verified as being offered by the selected institution. Please select a valid college or degree/program." (or specific accurate explanation if department/specialization is invalid).
Return JSON strictly:
{
  "isValid": boolean,
  "institution": "${cleanInst}",
  "degree": "${cleanDeg}",
  "academicField": "Official Academic Field Name or null",
  "department": "${cleanDept}",
  "specialization": "${cleanSpec}",
  "message": "Human-readable explanation of verification outcome"
}`;

    const aiResult = await callGroq(prompt);
    if (aiResult && typeof aiResult.isValid === 'boolean') {
      return {
        isValid: aiResult.isValid,
        institution: cleanInst,
        degree: cleanDeg,
        academicField: aiResult.academicField || null,
        department: cleanDept || undefined,
        specialization: cleanSpec || undefined,
        message: aiResult.message || (aiResult.isValid
          ? 'Academic combination verified successfully.'
          : 'This degree could not be verified as being offered by the selected institution. Please select a valid college or degree/program.'),
      };
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Combination validation error:', err.message);
  }

  return {
    isValid: false,
    institution: cleanInst,
    degree: cleanDeg,
    academicField: null,
    message: 'Unable to verify academic combination due to verification service unavailability. Please try again.',
  };
};

/**
 * 5. Dynamic search for UGC Section 22 recognized degrees or fields.
 * ZERO static catalog fallback. Returns pure dynamically verified items.
 */
export const searchUGCDegrees = async (
  query: string,
  type: 'degree' | 'field' = 'degree'
): Promise<UGCDegreeSuggestion[]> => {
  const cleanQ = (query || '').trim();
  if (!cleanQ || cleanQ.length < 2) {
    return [];
  }

  try {
    const prompt = `You are a strict UGC (University Grants Commission, India) academic accreditation engine.
The user is searching for: "${cleanQ}" (category: ${type === 'degree' ? 'Official UGC Degree' : 'Specialization/Field'}).
Return ONLY degrees or fields that are officially approved and recognized by the UGC under Section 22 of the UGC Act 1956 or AICTE/NCISM.
Do NOT include unrecognized private certificate titles or unaccredited diplomas.
Return a JSON array of up to 6 matching approved degrees/fields:
[
  {
    "name": "B.Tech",
    "fullName": "Bachelor of Technology",
    "category": "Engineering & Technology",
    "ugcApproved": true,
    "level": "Undergraduate"
  }
]
If no recognized UGC degrees match, return strictly [].`;

    const aiResult = await callGroq(prompt);
    if (Array.isArray(aiResult) && aiResult.length > 0) {
      return aiResult
        .filter((item: any) => item && item.name && item.fullName)
        .map((item: any) => ({
          name: item.name.trim(),
          fullName: item.fullName.trim(),
          category: item.category || (type === 'degree' ? 'Higher Education' : 'Academic Stream'),
          ugcApproved: true,
          level: item.level || 'Undergraduate',
        }));
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] UGC dynamic search error:', err.message);
  }

  return [];
};

export interface OpportunityDraftParams {
  oppType: 'internship' | 'job' | 'faculty';
  facultySubtype?: 'Immersion' | 'FDP' | 'Research Collaboration' | 'Consultancy';
  domain: string;
  organization?: string;
  prompt?: string;
}

export const generateOpportunityDraft = async (params: OpportunityDraftParams) => {
  const { oppType, facultySubtype, domain, organization, prompt: userPrompt } = params;

  const targetCategory =
    oppType === 'faculty'
      ? `Faculty Academic Program (${facultySubtype || 'Industry Immersion'})`
      : oppType === 'internship'
      ? 'Student Internship'
      : 'Full-Time Job Placement';

  const systemPrompt = `You are an expert enterprise recruitment architect and AICTE/NEP 2020 academia-industry coordinator.
Generate a realistic, comprehensive, and high-impact draft for an opening in the domain of "${domain}".
Opportunity Target Category: ${targetCategory}
Organization: ${organization || 'Accredited Enterprise'}
${userPrompt ? `User guidance/focus: "${userPrompt}"` : ''}

Respond with strictly valid JSON only with this structure:
{
  "title": "Clear, professional position or sabbatical program title",
  "stipendOrSalary": "${oppType === 'faculty' ? 'e.g. ₹60,000 / month Fellowship or ₹12,00,000 Grant' : oppType === 'internship' ? 'e.g. ₹22,000 / month' : 'e.g. ₹8.5 LPA'}",
  "durationOrExp": "${oppType === 'faculty' ? 'e.g. 6 Weeks Sabbatical or 6 Months Joint Mandate' : oppType === 'internship' ? 'e.g. 6 Months' : 'e.g. 0-2 Years'}",
  "openings": 2,
  "skillsRequired": ["Specific Skill 1", "Specific Skill 2", "Specific Skill 3", "Specific Skill 4"],
  "description": "Comprehensive 2-3 sentence overview of the role, laboratory/industrial exposure, and technical stack.",
  "responsibilities": [
    "Key responsibility or institutional outcome 1",
    "Key responsibility or institutional outcome 2",
    "Key responsibility or institutional outcome 3"
  ],
  "requirements": [
    "${oppType === 'faculty' ? 'Academic qualification (e.g. Ph.D. or Master in relevant field)' : 'Eligibility criteria 1'}",
    "${oppType === 'faculty' ? 'Minimum teaching/research experience or publication record' : 'Eligibility criteria 2'}",
    "${oppType === 'faculty' ? 'Institutional NOC from Head of Department' : 'Eligibility criteria 3'}"
  ]
}`;

  try {
    const result = await callGroq(systemPrompt);
    if (result && result.title) {
      return result;
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Opportunity draft generation fallback:', err.message);
  }

  return {
    title:
      oppType === 'faculty'
        ? `${domain} Industrial Immersion & Research Sabbatical`
        : `${domain} Associate Specialist`,
    stipendOrSalary:
      oppType === 'faculty'
        ? '₹70,000 / month Fellowship'
        : oppType === 'internship'
        ? '₹25,000 / month'
        : '₹8.5 LPA',
    durationOrExp:
      oppType === 'faculty' ? '6 Weeks Sabbatical' : oppType === 'internship' ? '6 Months' : '1 Year',
    openings: 2,
    skillsRequired: [domain, 'Quality Assurance', 'Analytical Techniques', 'Research Documentation'],
    description: `Engage with enterprise industrial pipelines in ${domain}, working on production, characterization, and compliance workflows.`,
    responsibilities: [
      'Lead and participate in hands-on technical protocols',
      'Collaborate with multi-disciplinary research teams',
      'Synthesize findings into technical documentation and institutional reports',
    ],
    requirements: [
      oppType === 'faculty'
        ? 'Ph.D. or Master degree in relevant domain'
        : 'Bachelor degree or final-year student in related field',
      oppType === 'faculty'
        ? 'Minimum 3 years teaching or research experience'
        : 'Demonstrated competency in domain fundamentals',
      oppType === 'faculty' ? 'Institutional NOC required' : 'Strong problem-solving ability',
    ],
  };
};

export interface ProposalDraftParams {
  opportunityTitle: string;
  organization: string;
  opportunityType: string;
  description: string;
  requirements?: string[];
  facultyName?: string;
  institution?: string;
  focusArea?: string;
}

export const generateProposalDraft = async (params: ProposalDraftParams) => {
  const {
    opportunityTitle,
    organization,
    opportunityType,
    description,
    requirements,
    facultyName,
    institution,
    focusArea,
  } = params;

  const prompt = `You are an experienced university professor and research principal investigator submitting an Expression of Interest / Research Proposal for an Industry Immersion / Joint Grant opportunity.
Opportunity Title: "${opportunityTitle}"
Offering Organization: "${organization}"
Opportunity Type: "${opportunityType}"
Description: "${description}"
${requirements && requirements.length ? `Requirements: ${requirements.join(', ')}` : ''}
Applicant Faculty: "${facultyName || 'Faculty Researcher'}"
Applicant Institution: "${institution || 'Accredited University'}"
${focusArea ? `Specific Focus / Angle: "${focusArea}"` : ''}

Generate a compelling, academic-grade proposal with:
1. "proposalText": A 3-paragraph research abstract and sabbatical plan explaining: (a) Problem statement & academic alignment, (b) Proposed laboratory methodology, instrumentation access, and experimental trial scope, and (c) Two-way deliverables (joint publication, syllabus upgrade, student project mentoring, patent filing).
2. "experience": A concise statement of academic credentials, years of university teaching, and published research.
3. "expectedDeliverables": Array of 3 key deliverables.

Respond strictly with valid JSON only:
{
  "proposalText": "...",
  "experience": "...",
  "expectedDeliverables": ["...", "...", "..."]
}`;

  try {
    const result = await callGroq(prompt);
    if (result && result.proposalText) {
      return result;
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Proposal draft generation fallback:', err.message);
  }

  return {
    proposalText: `In alignment with ${organization}'s initiative for "${opportunityTitle}", our university research group proposes a multi-stage collaborative methodology. We aim to conduct rigorous laboratory characterization and computational modeling, validating empirical benchmarks against current industrial standards.\n\nDuring this tenure, we will integrate advanced experimental protocols with hands-on scholar mentorship, establishing a reproducible pipeline. The outcomes will directly translate into updated curriculum modules and joint intellectual property filings.\n\nInstitutional facilities and research clearance will be provided by ${
      institution || 'our institution'
    } to ensure seamless execution.`,
    experience: `Senior Faculty Member with 8+ years of university teaching, multiple peer-reviewed international publications, and prior institutional consultancy experience.`,
    expectedDeliverables: [
      'Joint technical publication in a recognized peer-reviewed journal',
      'Curriculum modernization module for university scholars',
      'Empirical benchmark dossier submitted to corporate R&D committee',
    ],
  };
};

export interface ProposalSynergyParams {
  opportunityTitle: string;
  organization: string;
  opportunityType: string;
  requirements: string[];
  facultyName: string;
  institution?: string;
  proposalText: string;
  experience?: string;
}

export const evaluateProposalSynergy = async (params: ProposalSynergyParams) => {
  const {
    opportunityTitle,
    organization,
    opportunityType,
    requirements,
    facultyName,
    institution,
    proposalText,
    experience,
  } = params;

  const prompt = `You are an expert corporate R&D committee reviewer evaluating a faculty research proposal for an Industry Immersion / Joint Collaboration Grant.
Opportunity: "${opportunityTitle}" (${opportunityType}) by "${organization}"
Criteria: ${(requirements || []).join('; ')}
Candidate: ${facultyName} (${institution || 'Academician'})
Proposal Abstract: "${proposalText}"
Experience: "${experience || 'Not provided'}"

Evaluate the technical synergy and return on investment for the enterprise.
Return strictly valid JSON:
{
  "synergyScore": 88,
  "verdict": "Highly Recommended",
  "strengths": ["Clear strength 1", "Clear strength 2"],
  "industrialFeasibility": "Concise 1-2 sentence assessment of commercial and laboratory feasibility.",
  "academicImpact": "Concise 1-2 sentence assessment of student mentorship and institutional value.",
  "recommendedAction": "e.g. Schedule live video conference to finalize MoU scope."
}`;

  try {
    const result = await callGroq(prompt);
    if (result && typeof result.synergyScore === 'number') {
      return result;
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Proposal synergy evaluation fallback:', err.message);
  }

  return {
    synergyScore: 88,
    verdict: 'Highly Recommended',
    strengths: [
      'Strong alignment between proposed methodology and enterprise technical focus',
      'Well-defined student training and curriculum modernization plan',
    ],
    industrialFeasibility:
      'The proposed protocol leverages standard industrial equipment and fits the tenure duration well.',
    academicImpact:
      'Offers high institutional value with planned curriculum modules and student research co-authorship.',
    recommendedAction:
      'Schedule a live WebRTC technical discussion to review equipment access and project milestones.',
  };
};

export interface LearningModuleDraftParams {
  domain: string;
  type?: 'certification' | 'workshop' | 'course';
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  cost?: string;
  provider?: string;
  prompt?: string;
}

export const generateLearningModuleDraft = async (params: LearningModuleDraftParams) => {
  const { domain, type = 'certification', level = 'Intermediate', cost = 'Free', provider, prompt: userPrompt } = params;

  const typeLabel =
    type === 'workshop'
      ? 'Hands-On Technical Workshop'
      : type === 'course'
      ? 'Self-Paced Comprehensive Course'
      : 'Industry-Accredited Professional Certification';

  const systemPrompt = `You are a chief curriculum architect, corporate training director, and NSQF skill certification specialist.
Create a structured, industry-relevant curriculum draft for a learning module in the domain of "${domain}".
Module Format: ${typeLabel}
Difficulty Level: ${level}
Sponsoring Enterprise: ${provider || 'Accredited Industry Partner'}
${userPrompt ? `Special Topic Focus: "${userPrompt}"` : ''}

Respond with strictly valid JSON only:
{
  "title": "Engaging, professional course or certification title",
  "duration": "e.g. 4 Weeks / 20 Hours or 2 Days Intensive",
  "level": "${level}",
  "cost": "${cost || 'Free'}",
  "skillsCovered": ["Specific Skill 1", "Specific Skill 2", "Specific Skill 3", "Specific Skill 4", "Specific Skill 5"],
  "description": "2-3 sentences summarizing the curriculum objectives, practical training, industry tools used, and assessment methods.",
  "syllabus": [
    "Module 1: Foundations & Architecture Setup",
    "Module 2: Core Engineering Patterns & Hands-on Labs",
    "Module 3: Industry Best Practices, Security & Real-World Integration",
    "Module 4: Capstone Implementation & Evaluation"
  ]
}`;

  try {
    const result = await callGroq(systemPrompt);
    if (result && result.title && Array.isArray(result.skillsCovered)) {
      return result;
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Learning module draft fallback:', err.message);
  }

  return {
    title: `${domain} Professional Masterclass`,
    duration: '4 Weeks / 20 Hours',
    level,
    cost: cost || 'Free',
    skillsCovered: [domain, 'Architecture Design', 'Hands-on Implementation', 'Best Practices', 'Industry Compliance'],
    description: `Master industry-standard practices and practical methodologies in ${domain} through comprehensive instructor-led modules and real-world projects.`,
    syllabus: [
      'Module 1: Foundations, Industry Context & Environment Setup',
      'Module 2: Core Protocols, Toolchains & Hands-on Labs',
      'Module 3: Advanced Optimization, Security & Standards',
      'Module 4: Real-World Industry Capstone & Assessment',
    ],
  };
};

export interface LearningMarketInsightParams {
  domain: string;
  type?: 'certification' | 'workshop' | 'course';
  provider?: string;
}

export interface LearningMarketInsightResponse {
  subtitle: string;
  marketInsight: string;
  gapStatistic: string;
  trendingTopics: string[];
  emergingDomains: string[];
}

export const generateLearningMarketInsight = async (
  params: LearningMarketInsightParams
): Promise<LearningMarketInsightResponse> => {
  const { domain, type = 'certification', provider } = params;
  const formatLabel =
    type === 'workshop' ? 'Hands-On Lab' : type === 'course' ? 'Self-Paced Course' : 'Industry Certification';

  const prompt = `You are a higher education labor market analyst and industry-academia curriculum coordinator.
For the domain "${domain}" and learning format "${formatLabel}" offered by "${provider || 'Industry Partner'}", generate dynamic market demand intelligence.

Return strictly valid JSON:
{
  "subtitle": "A concise, engaging 1-sentence mission statement summarizing how this ${formatLabel} bridges university scholar competency gaps in ${domain}.",
  "marketInsight": "A sharp 2-sentence labor market intelligence summary highlighting current corporate recruitment demands, hiring velocity, or technological breakthroughs.",
  "gapStatistic": "A realistic data point such as '78% of graduating engineering scholars lack production-grade experience in this domain'",
  "trendingTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "emergingDomains": ["Emerging Interdisciplinary Track 1", "Emerging Track 2", "Emerging Track 3"]
}`;

  try {
    const result = await callGroq(prompt);
    if (result && result.subtitle && Array.isArray(result.trendingTopics)) {
      return {
        subtitle: result.subtitle,
        marketInsight:
          result.marketInsight ||
          `High corporate demand observed across accredited universities for practical ${domain} capabilities.`,
        gapStatistic:
          result.gapStatistic || `75% of academic applicants show competency deficits in applied ${domain}.`,
        trendingTopics: result.trendingTopics.slice(0, 5),
        emergingDomains: Array.isArray(result.emergingDomains) ? result.emergingDomains.slice(0, 4) : [],
      };
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Market insight fallback:', err.message);
  }

  return {
    subtitle: `Empower university scholars with production-grade ${domain} methodologies certified by ${
      provider || 'Enterprise Industry Leaders'
    }.`,
    marketInsight: `Accelerated enterprise demand for verified ${domain} competencies across modern software and bio-pharma engineering clusters.`,
    gapStatistic: `73% of university applicants require practical toolchain and sandbox exposure in ${domain}.`,
    trendingTopics: [
      `${domain} Core Fundamentals & Tooling`,
      'Production Architecture & Scalability',
      'Security, Compliance & Industry Standards',
      'Real-World Capstone Project',
    ],
    emergingDomains: [
      'Cloud Native & Edge Intelligence',
      'Bioinformatics & Computational Drug Design',
      'Autonomous Systems & Embedded Robotics',
      'Applied Data Science & Machine Learning Ops',
    ],
  };
};

export interface SynthesizeMouParams {
  initiatorRole: 'academician' | 'industry';
  initiatorOrg: string;
  targetOrg: string;
  focusArea?: string;
}

export interface SynthesizedMouResponse {
  title: string;
  scope: string;
  ipTerms: string;
  internshipQuota: number;
  grantFunding: string;
  validityYears: number;
}

export const synthesizeMouTerms = async (
  params: SynthesizeMouParams
): Promise<SynthesizedMouResponse> => {
  const { initiatorRole, initiatorOrg, targetOrg, focusArea } = params;

  const prompt = `You are a legal and academic affairs counsel specializing in university-industry partnerships under UGC, AICTE, and Ministry guidelines.
Draft a balanced, bilateral Memorandum of Understanding (MoU) proposal between:
- Initiating Organization: "${initiatorOrg || 'Initiating Partner'}" (${
    initiatorRole === 'industry' ? 'Industry Enterprise' : 'Academic University'
  })
- Target Partner: "${targetOrg || 'Target Partner'}"
${focusArea ? `- Primary Collaboration Focus: "${focusArea}"` : ''}

Generate realistic, equitable institutional terms.
Return strictly valid JSON:
{
  "title": "A formal MoU agreement title (e.g. Bilateral Strategic Partnership for Technology Transfer, Skill Labs & Talent Pipeline)",
  "scope": "A detailed 2-paragraph operational scope outlining shared laboratory resources, faculty sabbaticals, joint curriculum co-design, and student internship pathways.",
  "ipTerms": "A fair intellectual property distribution clause (e.g. '50/50 Joint Commercialization & Research Publication Rights' or 'Shared Academic IP with Enterprise Commercial Royalty Licensing')",
  "internshipQuota": 30,
  "grantFunding": "A realistic funding commitment (e.g. '₹15,00,000 Annual Innovation & Student Prototype Grant')",
  "validityYears": 3
}`;

  try {
    const result = await callGroq(prompt);
    if (result && result.title && result.scope) {
      return {
        title: result.title,
        scope: result.scope,
        ipTerms: result.ipTerms || '50/50 Joint Commercialization & Research Publication Rights',
        internshipQuota: Number(result.internshipQuota) || 25,
        grantFunding: result.grantFunding || '₹15,00,000 Annual Innovation Grant',
        validityYears: Number(result.validityYears) || 3,
      };
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] MoU synthesis fallback:', err.message);
  }

  return {
    title: `Strategic Industry-Academia Bilateral Partnership on ${focusArea || 'Advanced Technical Skill Development'}`,
    scope: `This Memorandum of Understanding establishes a formal bilateral framework between ${initiatorOrg} and ${targetOrg} to co-develop accredited curriculum tracks, establish experiential sandbox laboratories, and facilitate structured student internship pipelines.\n\nBoth institutions will designate faculty mentors and technical leads to conduct quarterly progress reviews, ensuring alignment with UGC National Skills Qualifications Framework (NSQF) and industry operational standards.`,
    ipTerms: '50/50 Joint Commercialization & Research Publication Rights',
    internshipQuota: 25,
    grantFunding: '₹15,00,000 Annual Innovation & Student Prototype Grant',
    validityYears: 3,
  };
};

export const generateLearningTitleSuggestions = async (domain: string, type?: string): Promise<string[]> => {
  const format =
    type === 'workshop' ? 'Hands-On Lab' : type === 'course' ? 'Self-Paced Course' : 'Industry Certification';
  const prompt = `Generate 4 punchy, modern, industry-accredited program titles for a ${format} in the field of "${domain}". Return strictly JSON: { "titles": ["Title 1", "Title 2", "Title 3", "Title 4"] }`;

  try {
    const result = await callGroq(prompt);
    if (result && Array.isArray(result.titles) && result.titles.length > 0) {
      return result.titles;
    }
  } catch (err: any) {
    console.warn('[AI Service Notice] Title suggestions fallback:', err.message);
  }

  return [
    `Applied ${domain}: Production Engineering Masterclass`,
    `Enterprise ${domain} & Systems Architecture`,
    `${domain} Accelerated Bootcamp & Sandbox Labs`,
    `Next-Gen ${domain}: Principles to Deployment`,
  ];
};


