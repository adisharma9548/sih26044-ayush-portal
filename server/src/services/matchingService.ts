import { IOpportunity } from '../models/Opportunity';
import { SkillProfile } from '../models/SkillProfile';
import { analyzeSkillGaps } from './skillGapService';
import { SCORING_POLICY } from '../config/scoringPolicy';

export interface MatchingResult {
  compatibilityScore: number;
  eligibilityStatus: 'Eligible' | 'Needs Bridge Training' | 'Ineligible';
  matchedSkills: string[];
  missingSkills: string[];
  partialSkills: { name: string; studentLevel: number; requiredBenchmark: number; gap: number }[];
  breakdown: string[];
  reasons: string[];
  explanation: string;
}

/**
 * Calculates genuine, explainable candidate-to-opportunity compatibility
 * based on actual student competencies versus actual opportunity requirements.
 */
export const calculateCandidateOpportunityMatch = async (
  userId: string,
  opportunity: IOpportunity
): Promise<MatchingResult> => {
  const profile = await SkillProfile.findOne({ userId });
  const studentSkills = profile ? profile.skills : [];

  // Prefer structured requirements with specific levels and weights; fallback to string array
  const requirements =
    Array.isArray(opportunity.skillRequirements) && opportunity.skillRequirements.length > 0
      ? opportunity.skillRequirements
      : opportunity.skillsRequired || [];

  const gapResult = await analyzeSkillGaps(studentSkills, requirements);

  const matchedSkills = gapResult.matchingSkills.map((m) => m.name);
  const missingSkills = gapResult.missingSkills;
  const partialSkills = gapResult.partialSkills;

  // Determine eligibility status using central, documented scoring policy
  const { eligible, needsBridge } = SCORING_POLICY.compatibility.eligibilityThresholds;
  let eligibilityStatus: 'Eligible' | 'Needs Bridge Training' | 'Ineligible' = 'Ineligible';

  if (gapResult.overallCompatibility >= eligible) {
    eligibilityStatus = 'Eligible';
  } else if (gapResult.overallCompatibility >= needsBridge) {
    eligibilityStatus = 'Needs Bridge Training';
  } else {
    eligibilityStatus = 'Ineligible';
  }

  // Build transparent, explainable reasons for students and recruiters
  const breakdownStrings = gapResult.breakdown.map((b) => b.explanation);
  const reasons: string[] = [];

  if (eligibilityStatus === 'Eligible') {
    reasons.push(
      `Candidate demonstrates strong alignment with ${opportunity.company}'s requirements (${gapResult.overallCompatibility}% overall compatibility).`
    );
  } else if (eligibilityStatus === 'Needs Bridge Training') {
    reasons.push(
      `Candidate possesses foundational competencies but requires bridge training in ${partialSkills.length + missingSkills.length} key areas.`
    );
  } else {
    reasons.push(
      `Candidate does not currently meet the prerequisite thresholds for this posting (${gapResult.overallCompatibility}% compatibility).`
    );
  }

  // Add specific breakdown lines
  if (gapResult.breakdown.length > 0) {
    reasons.push(...breakdownStrings.slice(0, 4));
  }

  return {
    compatibilityScore: gapResult.overallCompatibility,
    eligibilityStatus,
    matchedSkills,
    missingSkills,
    partialSkills,
    breakdown: breakdownStrings,
    reasons,
    explanation: gapResult.explanation,
  };
};
