import { SkillBenchmark, ISkillBenchmark } from '../models/SkillBenchmark';
import { Opportunity } from '../models/Opportunity';

export interface BenchmarkLookupResult {
  available: boolean;
  benchmarkLevel: number | null;
  displayName: string;
  source?: string;
  sourceReference?: string;
  sampleSize?: number;
  reason?: string;
}

/**
 * Normalizes a skill string for uniform comparison.
 */
export const normalizeSkillName = (name: string): string => {
  return name.trim().toLowerCase().replace(/[-_.]+/g, ' ');
};

/**
 * Retrieves the genuine industry benchmark for a given skill.
 *
 * Data Hierarchy:
 * 1. Persistent SkillBenchmark record in MongoDB (industry/academic framework or aggregate).
 * 2. Dynamic aggregation from active Opportunity requirements (jobs/internships).
 * 3. If no active data exists: Returns clearly defined "Benchmark unavailable / Insufficient industry data".
 *    NEVER invents a number or silently returns 75/80.
 */
export const getBenchmarkForSkill = async (skillName: string): Promise<BenchmarkLookupResult> => {
  if (!skillName || typeof skillName !== 'string' || !skillName.trim()) {
    return {
      available: false,
      benchmarkLevel: null,
      displayName: skillName || 'Unknown Skill',
      reason: 'Skill name is empty or invalid.',
    };
  }

  const normalized = normalizeSkillName(skillName);

  // 1. Check persistent SkillBenchmark collection
  try {
    const dbBenchmark = await SkillBenchmark.findOne({
      $or: [
        { skill: normalized },
        { displayName: new RegExp(`^${skillName.trim()}$`, 'i') },
      ],
    }).lean();

    if (dbBenchmark && typeof dbBenchmark.benchmarkLevel === 'number') {
      return {
        available: true,
        benchmarkLevel: dbBenchmark.benchmarkLevel,
        displayName: dbBenchmark.displayName || skillName,
        source: dbBenchmark.source,
        sourceReference: dbBenchmark.sourceReference,
        sampleSize: dbBenchmark.sampleSize,
      };
    }
  } catch (err: any) {
    console.warn('[benchmarkService] MongoDB SkillBenchmark query error:', err.message);
  }

  // 2. Query active opportunities to aggregate live industry requirements
  try {
    const opportunities = await Opportunity.find({
      status: 'active',
      $or: [
        { 'skillRequirements.name': new RegExp(`^${skillName.trim()}$`, 'i') },
        { skillsRequired: new RegExp(`^${skillName.trim()}$`, 'i') },
      ],
    }).lean();

    const requirementLevels: number[] = [];
    opportunities.forEach((opp: any) => {
      if (Array.isArray(opp.skillRequirements)) {
        const req = opp.skillRequirements.find(
          (sr: any) => sr && normalizeSkillName(sr.name) === normalized
        );
        if (req && typeof req.requiredLevel === 'number') {
          requirementLevels.push(req.requiredLevel);
        }
      }
    });

    if (requirementLevels.length > 0) {
      const avgLevel = Math.round(
        requirementLevels.reduce((a, b) => a + b, 0) / requirementLevels.length
      );
      return {
        available: true,
        benchmarkLevel: avgLevel,
        displayName: skillName,
        source: 'industry_aggregate',
        sampleSize: requirementLevels.length,
        sourceReference: `Aggregated across ${requirementLevels.length} active industry postings`,
      };
    }
  } catch (oppErr: any) {
    console.warn('[benchmarkService] Opportunity requirements lookup error:', oppErr.message);
  }

  // 3. No real requirement data found in database
  return {
    available: false,
    benchmarkLevel: null,
    displayName: skillName,
    reason: `Insufficient industry data: No active job requirements or competency frameworks currently specify a benchmark for "${skillName}".`,
  };
};

/**
 * Looks up benchmarks for an array of skills in parallel.
 */
export const getBenchmarksForSkills = async (
  skillNames: string[]
): Promise<Map<string, BenchmarkLookupResult>> => {
  const map = new Map<string, BenchmarkLookupResult>();
  const results = await Promise.all(skillNames.map((s) => getBenchmarkForSkill(s)));
  skillNames.forEach((name, i) => {
    map.set(normalizeSkillName(name), results[i]);
  });
  return map;
};

/**
 * Registers or updates an industry benchmark in MongoDB from a posted opportunity.
 */
export const recordOpportunityBenchmark = async (
  skillName: string,
  requiredLevel: number,
  opportunityId?: string,
  domain?: string
): Promise<void> => {
  if (!skillName || typeof requiredLevel !== 'number') return;
  const normalized = normalizeSkillName(skillName);

  try {
    const existing = await SkillBenchmark.findOne({ skill: normalized });
    if (existing) {
      // Running average across samples
      const currentTotal = existing.benchmarkLevel * (existing.sampleSize || 1);
      const newSampleSize = (existing.sampleSize || 1) + 1;
      const updatedAvg = Math.round((currentTotal + requiredLevel) / newSampleSize);

      existing.benchmarkLevel = updatedAvg;
      existing.sampleSize = newSampleSize;
      existing.lastUpdated = new Date();
      if (domain && !existing.domain) existing.domain = domain;
      await existing.save();
    } else {
      await SkillBenchmark.create({
        skill: normalized,
        displayName: skillName.trim(),
        benchmarkLevel: requiredLevel,
        source: 'job_posting',
        sourceReference: opportunityId,
        domain,
        sampleSize: 1,
        lastUpdated: new Date(),
      });
    }
  } catch (err: any) {
    console.warn('[benchmarkService] Failed to record opportunity benchmark:', err.message);
  }
};
