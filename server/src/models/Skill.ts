import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill extends Document {
  name: string;
  category: 'Phytochemistry' | 'Clinical Practice' | 'Regulatory & GMP' | 'Research Methodology' | 'Pharmacovigilance' | 'General';
  description: string;
  industryBenchmark: number; // 0 - 100
  type: 'technical' | 'domain' | 'tools' | 'soft';
  ayushDomain: string;
  status: 'active' | 'deprecated';
}

const SkillSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      index: true,
    },
    description: { type: String, default: '' },
    industryBenchmark: { type: Number, required: true, min: 0, max: 100, default: 75 },
    type: { type: String, enum: ['technical', 'domain', 'tools', 'soft'], default: 'technical' },
    ayushDomain: { type: String, default: 'Ayurveda' },
    status: { type: String, enum: ['active', 'deprecated'], default: 'active' },
  },
  { timestamps: true }
);

export const Skill = mongoose.model<ISkill>('Skill', SkillSchema);
