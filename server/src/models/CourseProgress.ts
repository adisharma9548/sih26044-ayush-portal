import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseProgress extends Document {
  userId: string;
  courseId: string;
  courseTitle: string;
  completedLessons: string[];
  codeSubmissions: Map<string, string>;
  overallProgressPercent: number;
  isCompleted: boolean;
  certificateId?: string;
  completedAt?: Date;
  lastAccessedAt: Date;
}

const CourseProgressSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    courseTitle: { type: String, required: true },
    completedLessons: [{ type: String }],
    codeSubmissions: { type: Map, of: String, default: {} },
    overallProgressPercent: { type: Number, default: 0, min: 0, max: 100 },
    isCompleted: { type: Boolean, default: false },
    certificateId: { type: String },
    completedAt: { type: Date },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

CourseProgressSchema.set('toJSON', {
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

export const CourseProgress = mongoose.model<ICourseProgress>('CourseProgress', CourseProgressSchema);
