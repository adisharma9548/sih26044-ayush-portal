import { ISkillProfileItem, ISkillGapItem, SkillGapStatus } from '../models/SkillProfile';
import { LearningProgram } from '../models/LearningProgram';
import { getBenchmarkForSkill, normalizeSkillName } from './benchmarkService';
import { SCORING_POLICY, calculatePriority } from '../config/scoringPolicy';

export interface RequirementSpec {
  name: string;
  requiredLevel?: number;
  importance?: 'critical' | 'high' | 'medium' | 'low';
  weight?: number;
}

export interface SkillGapAnalysisResult {
  matchingSkills: { name: string; studentLevel: number; requiredBenchmark: number }[];
  missingSkills: string[];
  partialSkills: { name: string; studentLevel: number; requiredBenchmark: number; gap: number }[];
  unbenchmarkedSkills: { name: string; studentLevel: number; reason: string }[];
  overallCompatibility: number;
  gapAnalysisList: ISkillGapItem[];
  breakdown: {
    skill: string;
    studentLevel: number;
    requiredLevel: number | null;
    status: SkillGapStatus;
    gap: number | null;
    explanation: string;
  }[];
  explanation: string;
}

/**
 * Performs a data-driven skill gap analysis comparing actual student competency
 * against actual required competency from job postings or competency benchmarks.
 *
 * Guaranteed Properties:
 * - NO hardcoded fallback numbers (75, 80, etc.).
 * - If no requirement or benchmark exists, returns NO_BENCHMARK_DATA with requiredLevel: null.
 * - Compatibility is computed using an importance-weighted fulfillment ratio (NO magic * 0.6).
 * - Generates clear, explainable output per requirement.
 */
export const analyzeSkillGaps = async (
  studentSkills: ISkillProfileItem[],
  requirements: (string | RequirementSpec)[]
): Promise<SkillGapAnalysisResult> => {
  const matchingSkills: { name: string; studentLevel: number; requiredBenchmark: number }[] = [];
  const partialSkills: { name: string; studentLevel: number; requiredBenchmark: number; gap: number }[] = [];
  const missingSkills: string[] = [];
  const unbenchmarkedSkills: { name: string; studentLevel: number; reason: string }[] = [];
  const gapAnalysisList: ISkillGapItem[] = [];
  const breakdown: SkillGapAnalysisResult['breakdown'] = [];

  if (!requirements || requirements.length === 0) {
    return {
      matchingSkills: [],
      missingSkills: [],
      partialSkills: [],
      unbenchmarkedSkills: [],
      overallCompatibility: 100,
      gapAnalysisList: [],
      breakdown: [],
      explanation: 'No specific skill requirements specified.',
    };
  }

  // Normalize student skills for robust matching
  const studentMap = new Map<string, ISkillProfileItem>();
  (studentSkills || []).forEach((s) => {
    if (s && s.name) {
      studentMap.set(normalizeSkillName(s.name), s);
    }
  });

  // Query learning programs for gap bridge recommendations
  let programs: any[] = [];
  try {
    programs = await LearningProgram.find({ isArchived: { $ne: true } }).lean();
  } catch (err: any) {
    console.warn('[skillGapService] LearningProgram lookup error:', err.message);
  }

  let totalWeightedFulfillment = 0;
  let totalWeight = 0;

  for (const rawReq of requirements) {
    const req: RequirementSpec =
      typeof rawReq === 'string'
        ? { name: rawReq }
        : rawReq;

    const reqName = req.name.trim();
    const normalizedReq = normalizeSkillName(reqName);

    // Determine weight from requirement importance
    const importance = req.importance || 'medium';
    const importanceMultiplier =
      SCORING_POLICY.compatibility.importanceWeights[importance] || 1.0;
    const itemWeight = (req.weight !== undefined ? req.weight : 1.0) * importanceMultiplier;

    // Sourcing Benchmark / Required Level:
    // 1. Explicitly provided in requirement spec
    // 2. Looked up dynamically from database benchmarks / active postings
    // 3. Null if unavailable (never fabricate!)
    let targetLevel: number | null = null;
    let benchmarkReason: string | undefined = undefined;

    if (typeof req.requiredLevel === 'number' && req.requiredLevel >= 0) {
      targetLevel = req.requiredLevel;
    } else {
      const benchmarkData = await getBenchmarkForSkill(reqName);
      if (benchmarkData.available && benchmarkData.benchmarkLevel !== null) {
        targetLevel = benchmarkData.benchmarkLevel;
      } else {
        benchmarkReason = benchmarkData.reason;
      }
    }

    // Match student skill
    let foundStudentSkill: ISkillProfileItem | undefined = studentMap.get(normalizedReq);
    if (!foundStudentSkill) {
      // Fuzzy substring match if exact normalized match not found
      for (const [sNorm, sItem] of studentMap.entries()) {
        if (sNorm.includes(normalizedReq) || normalizedReq.includes(sNorm)) {
          foundStudentSkill = sItem;
          break;
        }
      }
    }

    const studentLevel = foundStudentSkill ? foundStudentSkill.level : 0;

    // Bridge program matching helper
    const findBridgeProgram = (skillTarget: string) => {
      const norm = normalizeSkillName(skillTarget);
      return programs.find(
        (p) =>
          Array.isArray(p?.skillsCovered) &&
          p.skillsCovered.some((sc: string) => {
            if (!sc || typeof sc !== 'string') return false;
            const normSc = normalizeSkillName(sc);
            return normSc === norm || normSc.includes(norm) || norm.includes(normSc);
          })
      );
    };

    // Evaluate gap status and fulfillment ratio
    if (targetLevel === null) {
      // NO BENCHMARK DATA: Cannot compute a fake numeric gap
      unbenchmarkedSkills.push({
        name: reqName,
        studentLevel,
        reason: benchmarkReason || 'No benchmark data available',
      });

      gapAnalysisList.push({
        skill: reqName,
        currentLevel: studentLevel,
        requiredLevel: null,
        gapPercentage: null,
        status: 'NO_BENCHMARK_DATA',
        priority: null,
        reason: benchmarkReason || 'No industry requirement or competency benchmark found in database.',
      });

      breakdown.push({
        skill: reqName,
        studentLevel,
        requiredLevel: null,
        status: 'NO_BENCHMARK_DATA',
        gap: null,
        explanation: `${reqName}: ${studentLevel}% documented (Benchmark unavailable / Insufficient industry data)`,
      });

      // For compatibility: If student has competency, grant fulfillment proportional to level
      const fulfillment = studentLevel > 0 ? studentLevel / 100 : 0;
      totalWeightedFulfillment += fulfillment * itemWeight;
      totalWeight += itemWeight;
    } else if (foundStudentSkill && studentLevel >= targetLevel) {
      // MATCHED: Meets or exceeds actual required benchmark
      matchingSkills.push({
        name: reqName,
        studentLevel,
        requiredBenchmark: targetLevel,
      });

      gapAnalysisList.push({
        skill: reqName,
        currentLevel: studentLevel,
        requiredLevel: targetLevel,
        gapPercentage: 0,
        status: 'MATCHED',
        priority: 'Low',
      });

      breakdown.push({
        skill: reqName,
        studentLevel,
        requiredLevel: targetLevel,
        status: 'MATCHED',
        gap: 0,
        explanation: `${reqName}: ${studentLevel}/${targetLevel} → Meets requirement`,
      });

      totalWeightedFulfillment += 1.0 * itemWeight;
      totalWeight += itemWeight;
    } else if (foundStudentSkill) {
      // PARTIAL: Has competency, but below required benchmark
      const gap = Math.max(0, targetLevel - studentLevel);
      partialSkills.push({
        name: reqName,
        studentLevel,
        requiredBenchmark: targetLevel,
        gap,
      });

      const matchedProg = findBridgeProgram(reqName);
      const priority = calculatePriority(gap, req.importance);

      gapAnalysisList.push({
        skill: reqName,
        currentLevel: studentLevel,
        requiredLevel: targetLevel,
        gapPercentage: gap,
        status: 'PARTIAL',
        priority,
        recommendedProgramId: matchedProg ? (matchedProg._id?.toString() || matchedProg.id) : undefined,
        reason: `Student level is ${studentLevel}%, requiring ${targetLevel}% (${gap}-point gap).`,
      });

      breakdown.push({
        skill: reqName,
        studentLevel,
        requiredLevel: targetLevel,
        status: 'PARTIAL',
        gap,
        explanation: `${reqName}: ${studentLevel}/${targetLevel} → ${gap}-point gap`,
      });

      const fulfillment = Math.max(0, studentLevel / Math.max(1, targetLevel));
      totalWeightedFulfillment += fulfillment * itemWeight;
      totalWeight += itemWeight;
    } else {
      // MISSING: Student has zero evaluated competency for this requirement
      missingSkills.push(reqName);
      const matchedProg = findBridgeProgram(reqName);
      const priority = calculatePriority(targetLevel, req.importance);

      gapAnalysisList.push({
        skill: reqName,
        currentLevel: 0,
        requiredLevel: targetLevel,
        gapPercentage: targetLevel,
        status: 'MISSING',
        priority,
        recommendedProgramId: matchedProg ? (matchedProg._id?.toString() || matchedProg.id) : undefined,
        reason: `Missing competency required by posting (${targetLevel}% benchmark).`,
      });

      breakdown.push({
        skill: reqName,
        studentLevel: 0,
        requiredLevel: targetLevel,
        status: 'MISSING',
        gap: targetLevel,
        explanation: `${reqName}: 0/${targetLevel} → Missing prerequisite (${targetLevel}-point gap)`,
      });

      // Zero fulfillment for completely missing skills
      totalWeight += itemWeight;
    }
  }

  // Importance-weighted mathematical compatibility score
  const safeTotalWeight = Math.max(1, totalWeight);
  const overallCompatibility = Math.min(
    100,
    Math.max(0, Math.round((totalWeightedFulfillment / safeTotalWeight) * 100))
  );

  // Generate transparent, human-readable summary
  const summaryParts: string[] = [
    `Overall Match: ${overallCompatibility}%.`,
    `Matched ${matchingSkills.length} of ${requirements.length} required competencies.`,
  ];
  if (partialSkills.length > 0) {
    summaryParts.push(`${partialSkills.length} competencies require bridge training.`);
  }
  if (missingSkills.length > 0) {
    summaryParts.push(`Missing prerequisites in: ${missingSkills.join(', ')}.`);
  }
  if (unbenchmarkedSkills.length > 0) {
    summaryParts.push(`${unbenchmarkedSkills.length} skills currently have no industry benchmark published.`);
  }

  return {
    matchingSkills,
    missingSkills,
    partialSkills,
    unbenchmarkedSkills,
    overallCompatibility,
    gapAnalysisList,
    breakdown,
    explanation: summaryParts.join(' ').trim(),
  };
};
