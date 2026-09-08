import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';

interface AuditEventParams {
  req?: Request;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
}

export const recordAuditLog = async (params: AuditEventParams): Promise<void> => {
  try {
    const ipAddress =
      params.req?.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      params.req?.socket?.remoteAddress ||
      '';

    const userAgent = params.req?.headers['user-agent'] || '';

    await AuditLog.create({
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      ipAddress,
      userAgent,
      status: params.status || 'SUCCESS',
      details: params.details || {},
    });
  } catch (err: any) {
    // Audit logging failure should not crash the main transaction, but log to stderr
    console.error('[AuditService Error] Failed to write audit log:', err.message);
  }
};
