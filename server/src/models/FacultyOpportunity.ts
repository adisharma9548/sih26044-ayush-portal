import mongoose, { Schema, Document } from 'mongoose';

export interface IFacultyApplication {
  _id?: any;
  id?: string;
  facultyId: mongoose.Types.ObjectId | string;
  facultyName: string;
  facultyEmail: string;
  institution?: string;
  department?: string;
  proposalText: string;
  experience?: string;
  cvLink?: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  createdAt: Date;
}

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
  postedBy?: any;
  applications: IFacultyApplication[];
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
    applications: [
      {
        facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        facultyName: { type: String, required: true },
        facultyEmail: { type: String, required: true },
        institution: { type: String, default: '' },
        department: { type: String, default: '' },
        proposalText: { type: String, required: true },
        experience: { type: String, default: '' },
        cvLink: { type: String, default: '' },
        status: {
          type: String,
          enum: ['pending', 'shortlisted', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
    if (Array.isArray(ret.applications)) {
      ret.applications = ret.applications.map((app: any) => {
        if (app._id) {
          app.id = app._id.toString();
          delete app._id;
        }
        return app;
      });
    }
    delete ret.__v;
    return ret;
  },
});

export const FacultyOpportunity = mongoose.model<IFacultyOpportunity>(
  'FacultyOpportunity',
  FacultyOpportunitySchema
);

