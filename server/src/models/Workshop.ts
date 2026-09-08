import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkshop extends Document {
  title: string;
  organizer: string;
  facultyName: string;
  date: string;
  time: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  location?: string;
  capacity: number;
  registeredCount: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  description: string;
  targetAudience: string;
}

const WorkshopSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    organizer: { type: String, required: true },
    facultyName: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online' },
    location: { type: String },
    capacity: { type: Number, default: 100 },
    registeredCount: { type: Number, default: 0 },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    description: { type: String, required: true },
    targetAudience: { type: String, default: 'Ayush Scholars & Interns' },
  },
  { timestamps: true }
);

WorkshopSchema.set('toJSON', {
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

export const Workshop = mongoose.model<IWorkshop>('Workshop', WorkshopSchema);

export interface IMentorship extends Document {
  studentId: string;
  studentName: string;
  studentEmail: string;
  facultyId: string;
  facultyName: string;
  topic: string;
  message: string;
  preferredDate: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  meetingLink?: string;
}

const MentorshipSchema: Schema = new Schema(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    facultyId: { type: String, required: true, index: true },
    facultyName: { type: String, required: true },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    preferredDate: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'completed', 'declined'], default: 'pending' },
    meetingLink: { type: String },
  },
  { timestamps: true }
);

MentorshipSchema.set('toJSON', {
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

export const Mentorship = mongoose.model<IMentorship>('Mentorship', MentorshipSchema);
