const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');

/**
 * Creates and logs system-wide notifications dynamically based on user preferences.
 */
async function createNotification({ recipient, type, title, message, relatedEntity = null, site = null, priority = 'medium' }) {
  try {
    // If recipient is null, it's a broadcast to all Super Admins
    if (!recipient) {
      const superAdmins = await User.find({ role: 'super_admin', isDeleted: false });
      const creations = superAdmins.map(admin => 
        createNotification({ recipient: admin._id, type, title, message, relatedEntity, site, priority })
      );
      await Promise.all(creations);
      return;
    }

    // Resolve or build default Notification Preference for the recipient
    let preference = await NotificationPreference.findOne({ user: recipient });
    if (!preference) {
      preference = await NotificationPreference.create({ user: recipient });
    }

    // Map trigger check dynamically based on type
    let isTriggerEnabled = true;
    if (type === 'low_stock' || type === 'stock_out') {
      isTriggerEnabled = preference.lowStock;
    } else if (type === 'worker_payment') {
      isTriggerEnabled = preference.workerPayments;
    } else if (type === 'expense_added' || type === 'expense_approved' || type === 'expense_rejected') {
      isTriggerEnabled = preference.expenses;
    } else if (type === 'login_alert') {
      isTriggerEnabled = preference.loginAlerts;
    } else if (type === 'report_exported') {
      isTriggerEnabled = preference.reportGeneration;
    } else if (type === 'security_alert') {
      isTriggerEnabled = preference.securityAlerts;
    } else if (type === 'system_update') {
      isTriggerEnabled = preference.systemUpdates;
    }

    if (!isTriggerEnabled) return;

    // Save in-app notification if allowed
    if (preference.inApp) {
      await Notification.create({
        recipient,
        site,
        type,
        title,
        message,
        relatedEntity,
        priority
      });
    }

    // Future-ready placeholder checks for Email and Push modes
    if (preference.email) {
      // e.g. sendEmail(recipient.email, title, message)
    }
  } catch (err) {
    console.error('Failed to log system notification:', err);
  }
}

module.exports = { createNotification };
