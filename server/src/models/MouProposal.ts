import mongoose, { Schema, Document } from 'mongoose';

export interface IMouProposal extends Document {
  initiatorId: mongoose.Types.ObjectId;
  initiatorName: string;
  initiatorRole: 'academician' | 'industry' | 'admin';
  initiatorInstitution: string;
  targetOrganization: string;
  title: string;
  scope: string;
  ipTerms: string;
  internshipQuota: number;
  grantFunding: string;
  validityYears: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  digitalSealId?: string;
}

const MouProposalSchema: Schema = new Schema(
  {
    initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    initiatorName: { type: String, required: true },
    initiatorRole: { type: String, enum: ['academician', 'industry', 'admin'], required: true },
    initiatorInstitution: { type: String, required: true },
    targetOrganization: { type: String, required: true },
    title: { type: String, required: true },
    scope: { type: String, required: true },
    ipTerms: { type: String, required: true },
    internshipQuota: { type: Number, default: 10 },
    grantFunding: { type: String, default: '₹0' },
    validityYears: { type: Number, default: 3 },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected'],
      default: 'submitted',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    digitalSealId: { type: String },
  },
  { timestamps: true }
);

MouProposalSchema.set('toJSON', {
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

export const MouProposal = mongoose.model<IMouProposal>('MouProposal', MouProposalSchema);
