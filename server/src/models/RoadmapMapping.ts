import mongoose, { Schema, Document } from 'mongoose';

export interface IRoadmapModule {
  title: string;
  topics: string[];
  moduleUrl: string;
}

export interface IRoadmapMapping extends Document {
  slug: string;
  title: string;
  url: string;
  keywords: string[];
  description: string;
  difficulty: string;
  estimatedHours: string;
  domain?: string;
  modules: IRoadmapModule[];
  attribution: string;
  attributionUrl: string;
  status: 'active' | 'archived';
}

const RoadmapMappingSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    keywords: [{ type: String, index: true }],
    description: { type: String, required: true },
    difficulty: { type: String, default: 'Intermediate' },
    estimatedHours: { type: String, default: '40-60 Hours' },
    domain: { type: String, index: true },
    modules: [
      {
        title: { type: String, required: true },
        topics: [{ type: String }],
        moduleUrl: { type: String, required: true },
      },
    ],
    attribution: {
      type: String,
      default:
        'Curriculum guidance & developer learning paths provided by roadmap.sh (Open-source community roadmaps under CC BY-SA 4.0). All credit and rights belong to roadmap.sh and its contributors.',
    },
    attributionUrl: { type: String, default: 'https://roadmap.sh' },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const RoadmapMapping = mongoose.model<IRoadmapMapping>('RoadmapMapping', RoadmapMappingSchema);
