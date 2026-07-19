const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { isRead, type, search, startDate, endDate, page = 1, limit = 15 } = req.query;

  const query = {
    $or: [
      { recipient: userId },
      { recipient: null } // broadcast notifications
    ],
    isDeleted: false
  };

  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }

  if (type) {
    query.type = type;
  }

  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { message: new RegExp(search, 'i') }
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const skipIndex = (Number(page) - 1) * Number(limit);
  const total = await Notification.countDocuments(query);
  const items = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skipIndex)
    .limit(Number(limit))
    .populate('site', 'name');

  const unreadCount = await Notification.countDocuments({
    $or: [
      { recipient: userId },
      { recipient: null }
    ],
    isRead: false,
    isDeleted: false
  });

  res.json({
    success: true,
    items,
    total,
    page: Number(page),
    limit: Number(limit),
    unreadCount
  });
});

const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, $or: [{ recipient: userId }, { recipient: null }] },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) throw ApiError.notFound('Notification not found');

  res.json({ success: true, notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { $or: [{ recipient: userId }, { recipient: null }], isRead: false },
    { $set: { isRead: true } }
  );

  res.json({ success: true, message: 'All notifications marked as read' });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, $or: [{ recipient: userId }, { recipient: null }] },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } },
    { new: true }
  );

  if (!notification) throw ApiError.notFound('Notification not found');

  res.json({ success: true, message: 'Notification deleted' });
});

const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { $or: [{ recipient: userId }, { recipient: null }], isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } }
  );

  res.json({ success: true, message: 'All notifications deleted' });
});

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications
};
