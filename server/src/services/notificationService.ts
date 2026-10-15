import { Notification, INotification, RecipientType, NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { emitToUser } from './socketService';
import { getTransporter } from './emailService';

export interface CreateNotificationParams {
  recipientId: string;
  recipientType?: RecipientType;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  deliveryChannels?: Array<'IN_APP' | 'EMAIL'>;
}

/**
 * Server-side internal notification dispatcher.
 * Handles database persistence, Socket.IO live emission, and optional email dispatch.
 */
export const dispatchNotification = async (params: CreateNotificationParams): Promise<INotification> => {
  const channels = params.deliveryChannels || ['IN_APP'];

  const notif = new Notification({
    recipientId: params.recipientId,
    userId: params.recipientId,
    recipientType: params.recipientType ? (params.recipientType.toUpperCase() as any) : 'STUDENT',
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data || {},
    link: params.link,
    deliveryChannels: channels,
    deliveryStatus: {
      EMAIL: channels.includes('EMAIL') ? 'PENDING' : undefined,
    },
    timestamp: 'Just now',
  });

  await notif.save();

  // 1. Real-time WebSocket emission to recipient room
  try {
    emitToUser(params.recipientId, 'notification', notif);
    emitToUser(params.recipientId, 'notification:new', notif);
  } catch (socketErr: any) {
    console.warn('[Notification Service] Real-time socket delivery notice:', socketErr.message);
  }

  // 2. Multi-channel Email delivery if requested
  if (channels.includes('EMAIL')) {
    try {
      const recipientUser = await User.findById(params.recipientId).select('email name');
      if (recipientUser && recipientUser.email) {
        const transporter = getTransporter();
        if (transporter) {
          const appName = process.env.APP_NAME || 'NodalConnector';
          const frontendUrl = process.env.FRONTEND_URL || 'https://sih26044-ayush-portal.vercel.app';
          const actionLink = params.link ? (params.link.startsWith('http') ? params.link : `${frontendUrl}${params.link}`) : frontendUrl;

          await transporter.sendMail({
            from: `"${appName}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@nodalconnector.in'}>`,
            to: recipientUser.email,
            subject: `${appName}: ${params.title}`,
            text: `${params.message}\n\nView details: ${actionLink}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #065f46;">${params.title}</h2>
                <p style="color: #334155; font-size: 15px; line-height: 1.5;">${params.message}</p>
                <div style="margin-top: 24px;">
                  <a href="${actionLink}" style="background-color: #059669; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    View in Portal
                  </a>
                </div>
              </div>
            `,
          });
          notif.deliveryStatus = { EMAIL: 'SENT' };
          await notif.save();
        }
      }
    } catch (emailErr: any) {
      console.warn('[Notification Service] Email delivery failed:', emailErr.message);
      notif.deliveryStatus = { EMAIL: 'FAILED' };
      await notif.save();
    }
  }

  return notif;
};
