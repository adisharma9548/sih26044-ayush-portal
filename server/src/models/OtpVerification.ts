import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpVerification extends Document {
  email: string;
  otp: string;
  purpose: 'SIGNUP_VERIFICATION' | 'PASSWORD_RESET';
  attempts: number;
  createdAt: Date;
}

const OtpVerificationSchema: Schema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    purpose: { type: String, enum: ['SIGNUP_VERIFICATION', 'PASSWORD_RESET'], default: 'SIGNUP_VERIFICATION' },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 600 }, // 10 minutes TTL
  },
  { timestamps: false }
);

export const OtpVerification = mongoose.model<IOtpVerification>(
  'OtpVerification',
  OtpVerificationSchema
);
