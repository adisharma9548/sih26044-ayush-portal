import mongoose, { Schema, Document } from 'mongoose';

export interface IEndedRoom extends Document {
  roomId: string;
  title?: string;
  endedBy?: string;
  endedAt: Date;
  appId?: string;
}

const EndedRoomSchema: Schema = new Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    title: { type: String },
    endedBy: { type: String },
    endedAt: { type: Date, default: Date.now, index: true },
    appId: { type: String, index: true },
  },
  { timestamps: true }
);

export const EndedRoom = mongoose.model<IEndedRoom>('EndedRoom', EndedRoomSchema);
