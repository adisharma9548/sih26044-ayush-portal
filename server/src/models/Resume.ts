import mongoose, { Schema, Document } from 'mongoose';

export type ExtractionStatus = 'pending' | 'processing' | 'success' | 'completed' | 'failed' | 'not_attempted';

export type IResumeExtractedData = any;

export interface IResumeEducation {
  degree?: string;
  institution?: string;
  fieldOfStudy?: string;
  graduationYear?: number;
  score?: string;
}

export interface IResumeExperience {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface IResumeProject {
  title: string;
  description?: string;
  technologies?: string[];
  link?: string;
}

export interface IResumeParsedData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: {
    rawText?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
  education?: IResumeEducation[];
  experience?: IResumeExperience[];
  projects?: IResumeProject[];
  certifications?: string[];
  technicalSkills?: string[];
  softSkills?: string[];
  toolsAndTechnologies?: string[];
  skills?: Array<{ name: string; level?: number; category?: string }>;
  extractionSource?: string;
  extractedAt?: Date;
  confirmedAt?: Date;
}

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  fileUrl: string;
  cloudinaryPublicId: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: Date;
  extractionStatus: ExtractionStatus;
  extractionError?: string;
  extractedData?: IResumeParsedData;
  confirmedData?: IResumeParsedData;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    extractionStatus: {
      type: String,
      enum: ['pending', 'processing', 'success', 'completed', 'failed', 'not_attempted'],
      default: 'pending',
      index: true,
    },
    extractionError: {
      type: String,
      default: '',
    },
    extractedData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    confirmedData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

ResumeSchema.index({ userId: 1, version: -1 });

ResumeSchema.set('toJSON', {
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

export const Resume = mongoose.model<IResume>('Resume', ResumeSchema);
