import mongoose, { Schema, Document } from 'mongoose';

export interface ISkillRequirement {
  name: string;
  requiredLevel: number;
  importance?: 'critical' | 'high' | 'medium' | 'low';
  weight?: number;
}

export interface IOpportunity extends Document {
  title: string;
  type: 'internship' | 'job';
  company: string;
  companyLogo?: string;
  location: string;
  isRemote: boolean;
  stipend?: string;
  salary?: string;
  duration?: string;
  experienceLevel?: string;
  skillsRequired: string[];
  skillRequirements?: ISkillRequirement[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedDate: string;
  deadline: string;
  status: 'active' | 'closed' | 'draft';
  ayushDomain: string;
  openings: number;
  postedBy?: string;
}

const OpportunitySchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    type: { type: String, required: true, enum: ['internship', 'job'], index: true },
    company: { type: String, required: true, trim: true, index: true },
    companyLogo: { type: String, default: '' },
    location: { type: String, required: true },
    isRemote: { type: Boolean, default: false },
    stipend: { type: String },
    salary: { type: String },
    duration: { type: String },
    experienceLevel: { type: String },
    skillsRequired: [{ type: String, index: true }],
    skillRequirements: [
      {
        name: { type: String, required: true },
        requiredLevel: { type: Number, required: true, min: 0, max: 100 },
        importance: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
        weight: { type: Number, default: 1.0 },
      },
    ],
    description: { type: String, required: true },
    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    postedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    deadline: { type: String, required: true },
    status: { type: String, enum: ['active', 'closed', 'draft'], default: 'active', index: true },
    ayushDomain: { type: String, default: 'Ayurveda', index: true },
    openings: { type: Number, default: 1 },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

OpportunitySchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
    return ret;
  },
});

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
