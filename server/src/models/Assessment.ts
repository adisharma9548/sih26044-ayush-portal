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
    numericId: { type: Number, required: true, unique: true },
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
}

const AssessmentAttemptSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    answers: { type: Map, of: Number },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AssessmentAttempt = mongoose.model<IAssessmentAttempt>('AssessmentAttempt', AssessmentAttemptSchema);
