import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningProgram extends Document {
  title: string;
  provider: string;
  providerLogo?: string;
  type: 'course' | 'certification' | 'workshop';
  duration: string;
  skillsCovered: string[];
  description: string;
  rating: number;
  enrolledCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  isSponsored: boolean;
  ayushDomain: string;
  cost: string;
  syllabus: string[];
}

const LearningProgramSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    provider: { type: String, required: true },
    providerLogo: { type: String },
    type: { type: String, enum: ['course', 'certification', 'workshop'], default: 'certification' },
    duration: { type: String, required: true },
    skillsCovered: [{ type: String }],
    description: { type: String, required: true },
    rating: { type: Number, default: 4.8 },
    enrolledCount: { type: Number, default: 0 },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    isSponsored: { type: Boolean, default: false },
    ayushDomain: { type: String, default: 'Ayurveda' },
    cost: { type: String, default: 'Free' },
    syllabus: [{ type: String }],
  },
  { timestamps: true }
);

LearningProgramSchema.set('toJSON', {
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

export const LearningProgram = mongoose.model<ILearningProgram>('LearningProgram', LearningProgramSchema);
