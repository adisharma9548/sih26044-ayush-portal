import mongoose, { Document, Schema } from 'mongoose';

export interface ILearningPathMilestone {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedHours: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: string[];
  learningOutcomes: string[];
  status: 'locked' | 'current' | 'completed';
  completedAt?: Date;
  resources: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
}

export interface ILearningPath extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetRole: string;
  targetSkill?: string;
  domain: string;
  overview: string;
  milestones: ILearningPathMilestone[];
  overallProgress: number; // 0 to 100
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LearningPathMilestoneSchema = new Schema<ILearningPathMilestone>(
  {
    id: { type: String, required: true },
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    estimatedHours: { type: String, default: '10-15 Hours' },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    topics: [{ type: String }],
    learningOutcomes: [{ type: String }],
    status: {
      type: String,
      enum: ['locked', 'current', 'completed'],
      default: 'locked',
    },
    completedAt: { type: Date },
    resources: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: 'guide' },
      },
    ],
  },
  { _id: false }
);

const LearningPathSchema = new Schema<ILearningPath>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    targetRole: { type: String, default: 'Core Professional Competency' },
    targetSkill: { type: String },
    domain: { type: String, default: 'Technical Education' },
    overview: { type: String, default: '' },
    milestones: [LearningPathMilestoneSchema],
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LearningPathSchema.index({ userId: 1, isArchived: 1 });

export const LearningPath = mongoose.model<ILearningPath>('LearningPath', LearningPathSchema);
