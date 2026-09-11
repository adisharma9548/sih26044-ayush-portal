import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationStatus = 'applied' | 'in_review' | 'shortlisted' | 'interview_scheduled' | 'interview_completed' | 'offered' | 'rejected';

export interface IApplication extends Document {
  userId: string;
  employerId?: string;
  studentName: string;
  studentEmail: string;
  studentInstitute: string;
  opportunityId: string;
  type: 'internship' | 'job';
  opportunityTitle: string;
  companyName: string;
  status: ApplicationStatus;
  appliedDate: string;
  resumeUrl?: string;
  coverNote?: string;
  interviewDate?: string;
  skillMatchPercentage?: number;
}

const ApplicationSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    employerId: { type: String, index: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentInstitute: { type: String, default: '' },
    opportunityId: { type: String, required: true, index: true },
    type: { type: String, enum: ['internship', 'job'], required: true },
    opportunityTitle: { type: String, required: true },
    companyName: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['applied', 'in_review', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offered', 'rejected'],
      default: 'applied',
      index: true,
    },
    appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    resumeUrl: { type: String },
    coverNote: { type: String },
    interviewDate: { type: String },
    skillMatchPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ApplicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
ApplicationSchema.index({ employerId: 1, status: 1, createdAt: -1 });
ApplicationSchema.index({ companyName: 1, status: 1 });

ApplicationSchema.set('toJSON', {
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

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
