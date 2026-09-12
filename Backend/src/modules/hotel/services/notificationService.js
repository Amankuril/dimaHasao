import { sendPushNotification, listOwnerTokens } from '../../../core/notifications/firebase.service.js';

/** Maps hotel's caller-facing userType onto the registered owner types. */
const HOTEL_OWNER_TYPES = {
  user: 'HOTEL_USER',
  partner: 'HOTEL_PARTNER',
  admin: 'HOTEL_ADMIN',
};
import User from '../models/User.js';
import Notification from '../models/Notification.js';

class NotificationService {
  /**
   * Helper function to get all FCM tokens from a user (app + web)
   * @param {Object} user - User document
   * @returns {Array<string>} - Array of FCM tokens
   */
  /**
   * @deprecated Token reading lives in core/notifications/firebase.service.js.
   * Kept as a thin wrapper for any caller still using it directly.
   */
  getUserFcmTokens(user) {
    const tokens = user?.fcmTokens;
    if (!tokens) return [];
    if (Array.isArray(tokens)) return tokens.filter(Boolean);
    return [tokens.app, tokens.web].filter(Boolean);
  }

  /**
   * Send notification to a single FCM token
   * @param {string} fcmToken - FCM token of the device
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notification
   */
  async sendToToken(fcmToken, notification, data = {}) {
    // Delegates to the shared FCM sender in core/notifications/firebase.service.js.
    // That path also detects dead tokens and SenderId mismatches, which the old
    // local admin.messaging().send() call here did not.
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data || {})) {
      if (value !== null && value !== undefined) {
        stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }

    const { results } = await sendPushNotification([fcmToken], {
      title: notification?.title || process.env.APP_NAME || 'Dima Hasao',
      body: notification?.body || '',
      data: stringifiedData,
      link: data?.url || '/',
    });

    const result = results?.[0];

    if (result?.ok) {
      return { success: true, messageId: result.response?.name || result.response };
    }

    return {
      success: false,
      error: result?.error || 'Push send failed',
      // Preserved so callers that prune dead tokens keep working.
      code: result?.remove ? 'messaging/registration-token-not-registered' : undefined,
    };
  }

  /**
   * Send notification to a user or admin by ID
   * @param {string} userId - User or Admin ID
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @param {string} userType - 'user', 'admin' (default: 'user')
   * @returns {Promise<Object>} - Result of sending notification
   */
  async sendToUser(userId, notification, data = {}, userType = 'user') {
    try {
      console.log(`[NotificationService] Sending to User: ${userId} (${userType})`);
      let user;

      if (userType === 'admin') {
        const Admin = (await import('../models/Admin.js')).default;
        user = await Admin.findById(userId);
      } else if (userType === 'partner') {
        const Partner = (await import('../models/Partner.js')).default;
        user = await Partner.findById(userId);
      } else {
        user = await User.findById(userId);
      }

      if (!user) {
        console.warn(`[NotificationService] User not found: ${userId} (${userType})`);
        return {
          success: false,
          error: `${userType} not found`,
        };
      }

      let savedNotification;
      try {
        console.log('[NotificationService] Saving notification to DB...');
        savedNotification = await Notification.create({
          userId: user._id,
          userType: userType, // 'user' or 'admin'
          title: notification.title || process.env.APP_NAME || 'Dima Hasao',
          body: notification.body || '',
          data: data || {},
          type: data.type || 'general',
        });
        console.log(`[NotificationService] DB Save Success. ID: ${savedNotification._id}`);
      } catch (dbError) {
        console.error('[NotificationService] [ERROR] Failed to save notification to database:', dbError);
      }

      // Shared token store — same lookup path as food and taxi.
      const fcmTokens = await listOwnerTokens({
        ownerType: HOTEL_OWNER_TYPES[userType] || 'HOTEL_USER',
        ownerId: user._id,
      });
      console.log(`[NotificationService] Found ${fcmTokens.length} FCM tokens for user.`);

      if (fcmTokens.length === 0) {
        console.warn('[NotificationService] User has no FCM tokens. Skipping Push.');
        return {
          success: false,
          error: 'User does not have FCM token',
          notificationId: savedNotification?._id
        };
      }

      // Send to all tokens (app + web)
      let lastResult = null;
      let successCount = 0;

      for (const token of fcmTokens) {
        try {
          console.log(`[NotificationService] Sending to token: ${token.substring(0, 10)}...`);
          const result = await this.sendToToken(token, notification, data);
          if (result.success) {
            console.log('[NotificationService] Push Sent Successfully.');
            successCount++;
            lastResult = result;
          } else {
            console.warn('[NotificationService] Push Failed:', result.error);
          }
        } catch (err) {
          console.error('[NotificationService] FCM send exception:', err);
        }
      }

      // Update notification with FCM Message ID if sent
      if (successCount > 0 && savedNotification && lastResult?.messageId) {
        savedNotification.fcmMessageId = lastResult.messageId;
        await savedNotification.save().catch(e => console.error('Failed to update FCM ID:', e));
      }

      console.log(`[NotificationService] Complete. Success: ${successCount}/${fcmTokens.length}`);
      return {
        success: successCount > 0,
        successCount,
        notificationId: savedNotification?._id
      };
    } catch (error) {
      console.error('[NotificationService] [ERROR] Error sending notification to user:', error);
      throw error;
    }
  }
}

export default new NotificationService();
