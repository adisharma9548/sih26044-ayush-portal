import mongoose, { Schema, Document } from 'mongoose';

export interface ISkillProfileItem {
  name: string;
  level: number;
  industryBenchmark: number;
  verified: boolean;
  category: string;
}

export interface ISkillGapItem {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gapPercentage: number;
  priority: 'High' | 'Medium' | 'Low';
  recommendedProgramId?: string;
}

export interface ISkillProfile extends Document {
  userId: string;
  degree?: string;
  overallScore: number;
  rankPercentile: number;
  skills: ISkillProfileItem[];
  gapAnalysis: ISkillGapItem[];
  strengths?: string[];
  lastAssessmentDate: string;
}

const SkillProfileSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    degree: { type: String },
    overallScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
    rankPercentile: { type: Number, default: 0 },
    strengths: [{ type: String }],
    skills: [
      {
        name: { type: String, required: true },
        level: { type: Number, required: true, min: 0, max: 100 },
        industryBenchmark: { type: Number, required: true },
        verified: { type: Boolean, default: false },
        category: { type: String, default: 'General' },
      },
    ],
    gapAnalysis: [
      {
        skill: { type: String, required: true },
        currentLevel: { type: Number, required: true },
        requiredLevel: { type: Number, required: true },
        gapPercentage: { type: Number, required: true },
        priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
        recommendedProgramId: { type: String },
      },
    ],
    lastAssessmentDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true }
);

export const SkillProfile = mongoose.model<ISkillProfile>('SkillProfile', SkillProfileSchema);
