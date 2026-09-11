import mongoose, { Schema, Document } from 'mongoose';

export type VerificationStatus = 'verified' | 'pending' | 'unverified';
export type VerificationSourceType =
  | 'assessment'
  | 'faculty_endorsement'
  | 'certificate'
  | 'project'
  | 'industry_validation';

export interface ISkillEvidence {
  sourceType: VerificationSourceType;
  referenceId?: string;
  evidenceUrl?: string;
  verifiedAt: Date;
  verifiedBy?: string;
  scoreOrRating?: number;
  notes?: string;
}

export interface ISkillProfileItem {
  name: string;
  level: number;
  industryBenchmark?: number | null;
  benchmarkStatus?: 'available' | 'insufficient_data';
  benchmarkSource?: string;
  benchmarkReason?: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  verificationSources?: ISkillEvidence[];
  category: string;
}

export type SkillGapStatus = 'MATCHED' | 'PARTIAL' | 'MISSING' | 'NO_BENCHMARK_DATA';

export interface ISkillGapItem {
  skill: string;
  currentLevel: number;
  requiredLevel?: number | null;
  gapPercentage?: number | null;
  status: SkillGapStatus;
  priority?: 'High' | 'Medium' | 'Low' | null;
  recommendedProgramId?: string;
  reason?: string;
}

export interface ISkillProfileContext {
  degree?: string;
  department?: string;
  specialization?: string;
  institution?: string;
  academicField?: string;
}

export interface IHistoricalContextSnapshot {
  contextHash: string;
  version: number;
  degree?: string;
  department?: string;
  specialization?: string;
  institution?: string;
  archivedAt: Date;
  skills: ISkillProfileItem[];
  overallScore: number;
  gapAnalysis: ISkillGapItem[];
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
  status: 'current' | 'stale' | 'not_assessed';
  academicContextHash?: string;
  academicContextVersion?: number;
  academicContext?: ISkillProfileContext;
  historicalContexts?: IHistoricalContextSnapshot[];
}

const SkillProfileSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    degree: { type: String },
    overallScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
    rankPercentile: { type: Number, default: 0 },
    strengths: [{ type: String }],
    status: {
      type: String,
      enum: ['current', 'stale', 'not_assessed'],
      default: 'not_assessed',
      index: true,
    },
    academicContextHash: { type: String, default: '' },
    academicContextVersion: { type: Number, default: 1 },
    academicContext: {
      degree: { type: String, default: '' },
      department: { type: String, default: '' },
      specialization: { type: String, default: '' },
      institution: { type: String, default: '' },
      academicField: { type: String, default: '' },
    },
    historicalContexts: [
      {
        contextHash: { type: String },
        version: { type: Number },
        degree: { type: String },
        department: { type: String },
        specialization: { type: String },
        institution: { type: String },
        archivedAt: { type: Date, default: Date.now },
        skills: { type: Array, default: [] },
        overallScore: { type: Number, default: 0 },
        gapAnalysis: { type: Array, default: [] },
      },
    ],
    skills: [
      {
        name: { type: String, required: true },
        level: { type: Number, required: true, min: 0, max: 100 },
        industryBenchmark: { type: Number, default: null },
        benchmarkStatus: { type: String, enum: ['available', 'insufficient_data'], default: 'available' },
        benchmarkSource: { type: String },
        benchmarkReason: { type: String },
        verified: { type: Boolean, default: false },
        verificationStatus: {
          type: String,
          enum: ['verified', 'pending', 'unverified'],
          default: 'unverified',
        },
        verificationSources: [
          {
            sourceType: {
              type: String,
              enum: ['assessment', 'faculty_endorsement', 'certificate', 'project', 'industry_validation'],
              required: true,
            },
            referenceId: { type: String },
            evidenceUrl: { type: String },
            verifiedAt: { type: Date, default: Date.now },
            verifiedBy: { type: String },
            scoreOrRating: { type: Number },
            notes: { type: String },
          },
        ],
        category: { type: String, default: 'General' },
      },
    ],
    gapAnalysis: [
      {
        skill: { type: String, required: true },
        currentLevel: { type: Number, required: true },
        requiredLevel: { type: Number, default: null },
        gapPercentage: { type: Number, default: null },
        status: {
          type: String,
          enum: ['MATCHED', 'PARTIAL', 'MISSING', 'NO_BENCHMARK_DATA'],
          default: 'PARTIAL',
        },
        priority: { type: String, enum: ['High', 'Medium', 'Low'], default: null },
        recommendedProgramId: { type: String },
        reason: { type: String },
      },
    ],
    lastAssessmentDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true }
);

SkillProfileSchema.index({ overallScore: 1 });

export const SkillProfile = mongoose.model<ISkillProfile>('SkillProfile', SkillProfileSchema);
