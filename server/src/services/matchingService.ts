import { IOpportunity } from '../models/Opportunity';
import { IUser } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
import { analyzeSkillGaps } from './skillGapService';

export interface MatchingResult {
  compatibilityScore: number;
  eligibilityStatus: 'Eligible' | 'Needs Bridge Training' | 'Ineligible';
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

export const calculateCandidateOpportunityMatch = async (
  userId: string,
  opportunity: IOpportunity
): Promise<MatchingResult> => {
  const profile = await SkillProfile.findOne({ userId });
  const studentSkills = profile ? profile.skills : [];

  const gapResult = await analyzeSkillGaps(studentSkills, opportunity.skillsRequired);

  const matchedSkills = gapResult.matchingSkills.map((m) => m.name);
  const missingSkills = gapResult.missingSkills;

  let eligibilityStatus: 'Eligible' | 'Needs Bridge Training' | 'Ineligible' = 'Eligible';
  const reasons: string[] = [];

  if (gapResult.overallCompatibility >= 80) {
    eligibilityStatus = 'Eligible';
    reasons.push('Meets high threshold in core laboratory and clinical competencies.');
  } else if (gapResult.overallCompatibility >= 60) {
    eligibilityStatus = 'Needs Bridge Training';
    reasons.push('Candidate has good foundational skills but requires bridge certification.');
  } else {
    eligibilityStatus = 'Ineligible';
    reasons.push('Major prerequisite competencies missing for this specialized posting.');
  }

  return {
    compatibilityScore: gapResult.overallCompatibility,
    eligibilityStatus,
    matchedSkills,
    missingSkills,
    reasons,
  };
};
