import mongoose, { Schema, Document } from 'mongoose';

export interface IPartner extends Document {
  name: string;
  category: string;
  location: string;
  mouStatus: string;
  mouValidUntil: string;
  activeInterns: number;
  totalHired: number;
  status: 'Approved' | 'Pending' | 'Blocked';
}

const PartnerSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    mouStatus: { type: String, default: 'Active MoU' },
    mouValidUntil: { type: String, default: '2028-12-31' },
    activeInterns: { type: Number, default: 0 },
    totalHired: { type: Number, default: 0 },
    status: { type: String, enum: ['Approved', 'Pending', 'Blocked'], default: 'Approved' },
  },
  { timestamps: true }
);

PartnerSchema.set('toJSON', {
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

export const Partner = mongoose.model<IPartner>('Partner', PartnerSchema);
