import mongoose, { Schema, Document } from 'mongoose';

export interface ICollegeSource {
  field?: string;
  sourceUrl?: string;
  url?: string;
  sourceType?: string;
  fetchedAt?: Date;
}

export interface ICollegeLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

export interface ICollegeContact {
  email?: string;
  phone?: string;
  website?: string;
}

export interface ICollege extends Document {
  officialDomain?: string;
  slug: string;
  name: string;
  type?: string;
  state?: string;
  district?: string;
  city?: string;
  source?: 'ai_lookup' | 'user_request' | 'admin_added' | 'official_website';
  requestedBy?: mongoose.Types.ObjectId | string;
  about?: string;
  departments: any[];
  programs: any[];
  skills: any[];
  opportunities: any[];
  collaborations: any[];
  placements: any[];
  placementRecords?: any;
  facilities?: string[];
  location: ICollegeLocation;
  contact: ICollegeContact;
  verificationStatus: 'ai_suggested' | 'user_submitted' | 'verified' | 'rejected' | 'UNVERIFIED' | 'UNCLAIMED' | 'CLAIM_PENDING' | 'VERIFIED';
  confidenceScore?: number;
  sources: ICollegeSource[];
  lastScrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date;
}

const CollegeSchema: Schema = new Schema(
  {
    officialDomain: {
      type: String,
      required: false,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      default: 'General',
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['ai_lookup', 'user_request', 'admin_added', 'official_website'],
      default: 'admin_added',
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    about: {
      type: String,
      default: '',
    },
    departments: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    programs: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    skills: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    opportunities: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    collaborations: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    placements: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    location: {
      type: Schema.Types.Mixed,
      default: {},
    },
    contact: {
      type: Schema.Types.Mixed,
      default: {},
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'UNCLAIMED', 'CLAIM_PENDING', 'VERIFIED', 'ai_suggested', 'user_submitted', 'rejected'],
      default: 'UNVERIFIED',
      index: true,
    },
    confidenceScore: {
      type: Number,
      default: 0.8,
    },
    sources: [
      {
        field: { type: String, default: 'overview' },
        sourceUrl: { type: String, default: '' },
        url: { type: String },
        sourceType: { type: String, default: 'official_website' },
        fetchedAt: { type: Date, default: Date.now },
      },
    ],
    lastScrapedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

CollegeSchema.index({ name: 'text', about: 'text' });

CollegeSchema.set('toJSON', {
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

export const College = mongoose.model<ICollege>('College', CollegeSchema);
