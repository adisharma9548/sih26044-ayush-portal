import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: 'application' | 'mentorship' | 'match' | 'system' | 'achievement' | 'alert';
  link?: string;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    timestamp: { type: String, default: 'Just now' },
    type: {
      type: String,
      enum: ['application', 'mentorship', 'match', 'system', 'achievement', 'alert'],
      default: 'system',
    },
    link: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

NotificationSchema.set('toJSON', {
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

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
