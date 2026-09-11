import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  numericId: number;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  weight: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

const QuestionSchema: Schema = new Schema(
  {
    numericId: { type: Number, required: true, index: true },
    category: { type: String, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
    weight: { type: Number, default: 20 },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
  },
  { timestamps: true }
);

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

export interface IAssessmentAttempt extends Document {
  userId: string;
  score: number;
  answers: Record<string, number>;
  evaluatedAt: Date;
  academicContextHash?: string;
  academicContextVersion?: number;
  academicContext?: {
    degree?: string;
    department?: string;
    specialization?: string;
    institution?: string;
  };
  isCurrentContext?: boolean;
  proctoring?: {
    violationsCount: number;
    violationsLog: { type: string; timestamp: Date; details?: string }[];
    terminatedEarly: boolean;
    integrityScore: number;
  };
}

const AssessmentAttemptSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    answers: { type: Map, of: Number },
    evaluatedAt: { type: Date, default: Date.now },
    academicContextHash: { type: String, default: '' },
    academicContextVersion: { type: Number, default: 1 },
    academicContext: {
      degree: { type: String, default: '' },
      department: { type: String, default: '' },
      specialization: { type: String, default: '' },
      institution: { type: String, default: '' },
    },
    isCurrentContext: { type: Boolean, default: true, index: true },
    proctoring: {
      violationsCount: { type: Number, default: 0 },
      violationsLog: [
        {
          type: { type: String },
          timestamp: { type: Date, default: Date.now },
          details: { type: String },
        },
      ],
      terminatedEarly: { type: Boolean, default: false },
      integrityScore: { type: Number, default: 100 },
    },
  },
  { timestamps: true }
);

AssessmentAttemptSchema.index({ userId: 1, isCurrentContext: 1 });
AssessmentAttemptSchema.index({ userId: 1, evaluatedAt: -1 });
AssessmentAttemptSchema.index({ evaluatedAt: 1 });

export const AssessmentAttempt = mongoose.model<IAssessmentAttempt>('AssessmentAttempt', AssessmentAttemptSchema);
