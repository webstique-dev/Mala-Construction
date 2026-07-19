const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const NotificationPreference = require('../models/NotificationPreference');
const Settings = require('../models/Settings');
const { uploadBuffer, deleteAsset } = require('../services/uploadService');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const { applyProfileUpdates } = require('../utils/profileUpdate');

// Fetch user preferences & profile
const getUserSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let settings = await UserSettings.findOne({ user: userId });
  if (!settings) {
    settings = await UserSettings.create({ user: userId });
  }

  let preference = await NotificationPreference.findOne({ user: userId });
  if (!preference) {
    preference = await NotificationPreference.create({ user: userId });
  }

  const profile = await User.findById(userId);

  res.json({
    success: true,
    profile,
    settings,
    notifications: preference
  });
});

// Update user settings, profile, & notification preferences
const updateUserSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { profileData, settingsData, notificationsData } = req.body;

  // 1. Update profile fields
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (profileData) {
    const parsedProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
    const removePhoto = Boolean(parsedProfile.removePhoto);

    if (parsedProfile.email && parsedProfile.email !== user.email) {
      const existingUser = await User.findOne({ email: parsedProfile.email.toLowerCase().trim(), _id: { $ne: userId }, isDeleted: false });
      if (existingUser) {
        throw ApiError.badRequest('Email already exists. Please use another email address.');
      }
    }

    const { user: profileUser } = applyProfileUpdates(user, parsedProfile, {
      removePhoto,
      photo: null,
      deleteAsset: async (publicId) => {
        if (publicId) await deleteAsset(publicId);
      },
    });

    Object.assign(user, profileUser);
  }

  // Handle file upload for profile picture
  if (req.file) {
    if (user.photo && user.photo.publicId) {
      await deleteAsset(user.photo.publicId);
    }
    const uploadedPhoto = await uploadBuffer(req.file.buffer, 'mala-erp/users/photos', 'image');
    user.photo = uploadedPhoto;
  }

  await user.save();

  // 2. Update application settings
  if (settingsData) {
    const parsedSettings = typeof settingsData === 'string' ? JSON.parse(settingsData) : settingsData;
    await UserSettings.findOneAndUpdate(
      { user: userId },
      { $set: parsedSettings },
      { upsert: true, new: true }
    );
  }

  // 3. Update notification preferences
  if (notificationsData) {
    const parsedNotifs = typeof notificationsData === 'string' ? JSON.parse(notificationsData) : notificationsData;
    await NotificationPreference.findOneAndUpdate(
      { user: userId },
      { $set: parsedNotifs },
      { upsert: true, new: true }
    );
  }

  // Return updated structures
  const updatedSettings = await UserSettings.findOne({ user: userId });
  const updatedPref = await NotificationPreference.findOne({ user: userId });
  const updatedProfile = await User.findById(userId);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    profile: updatedProfile,
    settings: updatedSettings,
    notifications: updatedPref
  });
});

// Fetch system settings
const getSystemSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ isDeleted: false });
  if (!settings) {
    settings = await Settings.create({ companyName: 'Mala Construction' });
  }
  res.json({ success: true, settings });
});

// Update system settings (Super Admin Only)
const updateSystemSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ isDeleted: false });
  if (!settings) {
    settings = await Settings.create({ companyName: 'Mala Construction' });
  }

  const updateFields = { ...req.body };
  
  if (req.file) {
    if (settings.companyLogo && settings.companyLogo.publicId) {
      await deleteAsset(settings.companyLogo.publicId);
    }
    const logoUpload = await uploadBuffer(req.file.buffer, 'mala-erp/system/logo', 'image');
    updateFields.companyLogo = logoUpload;
  }

  if (updateFields.removeLogo === 'true') {
    if (settings.companyLogo && settings.companyLogo.publicId) {
      await deleteAsset(settings.companyLogo.publicId);
    }
    updateFields.companyLogo = { url: null, publicId: null };
  }
  delete updateFields.removeLogo;

  if (updateFields.lowStockThresholds && typeof updateFields.lowStockThresholds === 'string') {
    updateFields.lowStockThresholds = JSON.parse(updateFields.lowStockThresholds);
  }
  if (updateFields.backupPreferences && typeof updateFields.backupPreferences === 'string') {
    updateFields.backupPreferences = JSON.parse(updateFields.backupPreferences);
  }

  updateFields.updatedBy = req.user._id;

  const updatedSettings = await Settings.findByIdAndUpdate(
    settings._id,
    { $set: updateFields },
    { new: true }
  );

  res.json({
    success: true,
    message: 'System configuration updated successfully',
    settings: updatedSettings
  });
});

module.exports = {
  getUserSettings,
  updateUserSettings,
  getSystemSettings,
  updateSystemSettings
};
