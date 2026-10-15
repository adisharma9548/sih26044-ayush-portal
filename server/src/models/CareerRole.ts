import mongoose, { Schema, Document } from 'mongoose';
import { RequirementSpec } from '../services/skillGapService';

export interface ICareerRole extends Document {
  name: string;
  slug: string;
  category: string;
  description: string;
  requiredSkills: RequirementSpec[];
  preferredSkills?: RequirementSpec[];
  source: 'government_framework' | 'industry_standard' | 'curriculum' | 'custom';
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CareerRoleSchema = new Schema<ICareerRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    requiredSkills: [
      {
        name: { type: String, required: true, trim: true },
        requiredLevel: { type: Number, required: true, min: 0, max: 100 },
        importance: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'high',
        },
        weight: { type: Number, default: 1.0 },
      },
    ],
    preferredSkills: [
      {
        name: { type: String, required: true, trim: true },
        requiredLevel: { type: Number, default: 50, min: 0, max: 100 },
        importance: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'medium',
        },
        weight: { type: Number, default: 0.5 },
      },
    ],
    source: {
      type: String,
      enum: ['government_framework', 'industry_standard', 'curriculum', 'custom'],
      default: 'industry_standard',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CareerRoleSchema.set('toJSON', {
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

export const CareerRole = mongoose.model<ICareerRole>('CareerRole', CareerRoleSchema);
