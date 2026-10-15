import mongoose, { Schema, Document } from 'mongoose';

export type RecipientType = 'STUDENT' | 'COMPANY' | 'COLLEGE' | 'ADMIN';

export type NotificationType =
  | 'JOB_APPLICATION_STATUS'
  | 'INTERVIEW_SCHEDULED'
  | 'MESSAGE'
  | 'SECURITY_ALERT'
  | 'CLAIM_REQUEST'
  | 'TWO_FACTOR_UPDATE'
  | 'application'
  | 'mentorship'
  | 'match'
  | 'system'
  | 'achievement'
  | 'alert';

export interface INotification extends Document {
  recipientId: string;
  userId: string; // for backward compatibility
  recipientType?: RecipientType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: NotificationType;
  data?: Record<string, any>;
  deliveryChannels: Array<'IN_APP' | 'EMAIL'>;
  deliveryStatus?: {
    EMAIL?: 'PENDING' | 'SENT' | 'FAILED';
  };
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipientId: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    recipientType: {
      type: String,
      enum: ['STUDENT', 'COMPANY', 'COLLEGE', 'ADMIN'],
      default: 'STUDENT',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    timestamp: { type: String, default: 'Just now' },
    type: {
      type: String,
      default: 'system',
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deliveryChannels: {
      type: [String],
      enum: ['IN_APP', 'EMAIL'],
      default: ['IN_APP'],
    },
    deliveryStatus: {
      EMAIL: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED'],
        default: 'PENDING',
      },
    },
    link: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.pre<INotification>('save', function (next) {
  // Synchronize recipientId and userId
  if (!this.recipientId && this.userId) {
    this.recipientId = this.userId;
  } else if (!this.userId && this.recipientId) {
    this.userId = this.recipientId;
  }
  next();
});

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

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
