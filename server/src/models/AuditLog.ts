import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: { type: String, index: true },
    userEmail: { type: String, index: true },
    userRole: { type: String, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS', index: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
