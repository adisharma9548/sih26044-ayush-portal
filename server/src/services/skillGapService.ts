import { ISkillProfileItem, ISkillGapItem } from '../models/SkillProfile';
import { LearningProgram } from '../models/LearningProgram';

export interface SkillGapAnalysisResult {
  matchingSkills: { name: string; studentLevel: number; requiredBenchmark: number }[];
  missingSkills: string[];
  partialSkills: { name: string; studentLevel: number; requiredBenchmark: number; gap: number }[];
  overallCompatibility: number;
  gapAnalysisList: ISkillGapItem[];
  explanation: string;
}

export const analyzeSkillGaps = async (
  studentSkills: ISkillProfileItem[],
  requiredSkillNames: string[]
): Promise<SkillGapAnalysisResult> => {
  const matchingSkills: { name: string; studentLevel: number; requiredBenchmark: number }[] = [];
  const partialSkills: { name: string; studentLevel: number; requiredBenchmark: number; gap: number }[] = [];
  const missingSkills: string[] = [];
  const gapAnalysisList: ISkillGapItem[] = [];

  // Query learning programs to map bridge courses
  const programs = await LearningProgram.find({}).lean();

  requiredSkillNames.forEach((reqName) => {
    const found = studentSkills.find(
      (s) => s.name.toLowerCase().includes(reqName.toLowerCase()) || reqName.toLowerCase().includes(s.name.toLowerCase())
    );

    if (!found) {
      missingSkills.push(reqName);
      // Map to bridge program if available
      const matchedProg = programs.find((p) =>
        p.skillsCovered.some((sc: string) => sc.toLowerCase().includes(reqName.toLowerCase()))
      );

      gapAnalysisList.push({
        skill: reqName,
        currentLevel: 0,
        requiredLevel: 80,
        gapPercentage: 80,
        priority: 'High',
        recommendedProgramId: matchedProg ? matchedProg._id.toString() : undefined,
      });
    } else if (found.level >= found.industryBenchmark) {
      matchingSkills.push({
        name: found.name,
        studentLevel: found.level,
        requiredBenchmark: found.industryBenchmark,
      });
    } else {
      const gap = found.industryBenchmark - found.level;
      partialSkills.push({
        name: found.name,
        studentLevel: found.level,
        requiredBenchmark: found.industryBenchmark,
        gap,
      });

      const matchedProg = programs.find((p) =>
        p.skillsCovered.some((sc: string) => sc.toLowerCase().includes(found.name.toLowerCase()))
      );

      gapAnalysisList.push({
        skill: found.name,
        currentLevel: found.level,
        requiredLevel: found.industryBenchmark,
        gapPercentage: gap,
        priority: gap > 15 ? 'High' : 'Medium',
        recommendedProgramId: matchedProg ? matchedProg._id.toString() : undefined,
      });
    }
  });

  const totalRequired = Math.max(1, requiredSkillNames.length);
  const matchRatio = (matchingSkills.length + partialSkills.length * 0.6) / totalRequired;
  const overallCompatibility = Math.min(98, Math.max(50, Math.round(matchRatio * 100)));

  const explanation = `Matched ${matchingSkills.length} of ${totalRequired} core competencies with high proficiency. ${
    partialSkills.length > 0 ? `${partialSkills.length} competencies have moderate gaps that can be resolved via bridge training.` : ''
  } ${missingSkills.length > 0 ? `Missing exposure in: ${missingSkills.join(', ')}.` : ''}`.trim();

  return {
    matchingSkills,
    missingSkills,
    partialSkills,
    overallCompatibility,
    gapAnalysisList,
    explanation,
  };
};
