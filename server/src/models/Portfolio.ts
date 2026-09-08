import mongoose, { Schema, Document } from 'mongoose';

export interface IPortfolio extends Document {
  userId: string;
  certificates: {
    title: string;
    issuer: string;
    issueDate: string;
    credentialUrl?: string;
    verified: boolean;
    badgeIcon: string;
  }[];
  projects: {
    title: string;
    role: string;
    technologies: string[];
    description: string;
    link?: string;
    startDate: string;
    endDate: string;
  }[];
}

const PortfolioSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    certificates: [
      {
        title: { type: String, required: true },
        issuer: { type: String, required: true },
        issueDate: { type: String, required: true },
        credentialUrl: { type: String },
        verified: { type: Boolean, default: true },
        badgeIcon: { type: String, default: 'ShieldCheck' },
      },
    ],
    projects: [
      {
        title: { type: String, required: true },
        role: { type: String, required: true },
        technologies: [{ type: String }],
        description: { type: String, required: true },
        link: { type: String },
        startDate: { type: String },
        endDate: { type: String },
      },
    ],
  },
  { timestamps: true }
);

PortfolioSchema.set('toJSON', {
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

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
