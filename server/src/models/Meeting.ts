import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  type: 'interview' | 'mentorship' | 'collaboration' | 'fdp';
  organizerId: string;
  organizerName: string;
  organizerRole: string;
  participantId?: string;
  participantEmail: string;
  participantName: string;
  scheduledAt: Date;
  durationMinutes: number;
  roomId: string;
  meetingUrl: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['interview', 'mentorship', 'collaboration', 'fdp'],
      default: 'interview',
      index: true,
    },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizerName: { type: String, required: true },
    organizerRole: { type: String, required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'User' },
    participantEmail: { type: String, required: true, lowercase: true, index: true },
    participantName: { type: String, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 45 },
    roomId: { type: String, required: true, unique: true },
    meetingUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

MeetingSchema.set('toJSON', {
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

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
