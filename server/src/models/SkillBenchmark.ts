import mongoose, { Schema, Document } from 'mongoose';

export type BenchmarkSourceType =
  | 'industry_aggregate'
  | 'job_posting'
  | 'internship_posting'
  | 'academic_framework'
  | 'industry_standard';

export interface ISkillBenchmark extends Document {
  skill: string; // normalized lowercased skill name
  displayName: string; // proper casing, e.g. "React", "Node.js"
  benchmarkLevel: number; // 0 - 100
  source: BenchmarkSourceType;
  sourceReference?: string;
  domain?: string;
  sampleSize: number;
  weight?: number;
  lastUpdated: Date;
}

const SkillBenchmarkSchema = new Schema(
  {
    skill: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    benchmarkLevel: { type: Number, required: true, min: 0, max: 100 },
    source: {
      type: String,
      enum: ['industry_aggregate', 'job_posting', 'internship_posting', 'academic_framework', 'industry_standard'],
      default: 'industry_aggregate',
      index: true,
    },
    sourceReference: { type: String },
    domain: { type: String, index: true },
    sampleSize: { type: Number, default: 1 },
    weight: { type: Number, default: 1.0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SkillBenchmark = mongoose.model<ISkillBenchmark>('SkillBenchmark', SkillBenchmarkSchema);
