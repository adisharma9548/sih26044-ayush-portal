import mongoose, { Schema, Document } from 'mongoose';

export interface IFacultyOpportunity extends Document {
  title: string;
  organization: string;
  type: 'FDP' | 'Research Collaboration' | 'Consultancy' | 'Immersion';
  stipendOrGrant: string;
  duration: string;
  deadline: string;
  description: string;
  requirements: string[];
  ayushDomain: string;
  status: 'open' | 'closed';
  postedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FacultyOpportunitySchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    organization: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['FDP', 'Research Collaboration', 'Consultancy', 'Immersion'],
      index: true,
    },
    stipendOrGrant: { type: String, required: true },
    duration: { type: String, required: true },
    deadline: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    ayushDomain: { type: String, default: 'Ayurveda', index: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

FacultyOpportunitySchema.set('toJSON', {
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

export const FacultyOpportunity = mongoose.model<IFacultyOpportunity>(
  'FacultyOpportunity',
  FacultyOpportunitySchema
);
