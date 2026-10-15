import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionClaim extends Document {
  collegeSlug: string;
  collegeName: string;
  representativeName: string;
  email: string;
  verificationCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminReviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InstitutionClaimSchema: Schema = new Schema(
  {
    collegeSlug: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    representativeName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    verificationCode: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    adminReviewNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

InstitutionClaimSchema.set('toJSON', {
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

export const InstitutionClaim = mongoose.model<IInstitutionClaim>(
  'InstitutionClaim',
  InstitutionClaimSchema
);
