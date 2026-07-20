import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogOut, Shield, Eye, EyeOff, User, Settings, Camera, Trash2,
  Mail, Phone, Briefcase, Laptop, Smartphone, Globe, Lock,
  Upload, CheckCircle2, AlertCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/authService';
import { securityService } from '../../services/securityService';
import { useUserSettings, useUpdateUserSettings } from '../../hooks/useSettings';
import './Profile.css';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

function getUploadErrorMessage(error) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status === 400) {
    return serverMessage || 'Invalid image format. Please choose a JPG, PNG, or WEBP file.';
  }
  if (status === 413) {
    return 'File too large. Please choose an image smaller than 2MB.';
  }
  if (status === 401) {
    return 'You are not authorized to upload a profile image.';
  }
  if (status === 500 || status === 503) {
    return serverMessage || 'Cloudinary upload failed. Please verify the Cloudinary configuration and try again.';
  }
  if (error?.message?.includes('Network')) {
    return 'Network error. Please check your connection and try again.';
  }
  return serverMessage || 'Upload failed. Please try again.';
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, logout, refreshUser } = useAuth();
  const { setTheme } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Retrieve user settings & notification preferences
  const { data: settingsPayload, isLoading: isLoadingSettings } = useUserSettings();
  const updateSettingsMutation = useUpdateUserSettings();

  // Retrieve active sessions list
  const { data: sessionsPayload, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: securityService.listSessions,
    enabled: activeTab === 'security'
  });

  // Session termination mutations
  const terminateSession = useMutation({
    mutationFn: securityService.terminateSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('Session terminated successfully.');
    },
    onError: () => toast.error('Failed to terminate session.')
  });

  const terminateOtherSessions = useMutation({
    mutationFn: securityService.terminateOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('All other devices signed out successfully.');
    },
    onError: () => toast.error('Failed to clear other sessions.')
  });

  // State for profile photo preview
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const profileForm = useForm({ defaultValues: { name: '', email: '', phone: '', address: '', designation: '', companyInfo: '', username: '', biography: '' } });
  const appPrefForm = useForm({ defaultValues: { theme: 'system', timezone: 'Asia/Kolkata', dateFormat: 'YYYY-MM-DD', compactMode: false, paginationSize: 10 } });
  const passwordForm = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pre-fill profile & preference forms once loaded
  useEffect(() => {
    if (settingsPayload) {
      if (settingsPayload.profile) {
        profileForm.reset({
          name: settingsPayload.profile.name || '',
          email: settingsPayload.profile.email || '',
          phone: settingsPayload.profile.phone || '',
          address: settingsPayload.profile.address || '',
          designation: settingsPayload.profile.designation || '',
          companyInfo: settingsPayload.profile.companyInfo || '',
          username: settingsPayload.profile.username || '',
          biography: settingsPayload.profile.biography || ''
        });
        if (settingsPayload.profile.photo?.url) {
          setPhotoPreview(settingsPayload.profile.photo.url);
          setRemovePhoto(false);
        } else if (!photoFile) {
          setPhotoPreview(user?.photo?.url || null);
        }
      }
      if (settingsPayload.settings) {
        appPrefForm.reset({
          theme: settingsPayload.settings.theme || 'system',
          timezone: settingsPayload.settings.timezone || 'Asia/Kolkata',
          dateFormat: settingsPayload.settings.dateFormat || 'YYYY-MM-DD',
          compactMode: settingsPayload.settings.compactMode || false,
          paginationSize: settingsPayload.settings.paginationSize || 10
        });
      }
    }
  }, [profileForm, settingsPayload, user?.photo?.url]);

  const onPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid image format. Please choose a JPG, PNG, or WEBP file.');
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      toast.error('File too large. Please choose an image smaller than 2MB.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
  };

  // Submit Profile Form
  const onProfileSubmit = async (values) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('profileData', JSON.stringify({
        ...values,
        removePhoto
      }));
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      const result = await updateSettingsMutation.mutateAsync(formData);
      await refreshUser();
      if (result?.profile?.photo?.url) {
        setPhotoPreview(result.profile.photo.url);
      } else if (!removePhoto) {
        setPhotoPreview(user?.photo?.url || null);
      }
      toast.success('Profile updated successfully.');
      setPhotoFile(null);
      setRemovePhoto(false);
    } catch (err) {
      toast.error(getUploadErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  // Submit App Preferences Form
  const onAppPrefSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('settingsData', JSON.stringify(values));
      await updateSettingsMutation.mutateAsync(formData);

      // Instantly apply theme preference
      if (values.theme === 'light' || values.theme === 'dark') {
        setTheme(values.theme);
      } else {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }

      await refreshUser();
      toast.success('Settings saved successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings.');
    }
  };

  // Submit Password Form
  const onPasswordSubmit = async (values) => {
    try {
      const res = await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toast.success(res.message || 'Password changed successfully. Logging out.');
      passwordForm.reset();
      await logout({ skipConfirm: true });
    } catch (err) {
      const details = err.response?.data?.details;
      const errorMsg = (details && details.length > 0) ? details[0].message : (err.response?.data?.message || 'Failed to change password.');
      toast.error(errorMsg);
    }
  };

  const sessions = sessionsPayload?.sessions || [];
  const avatarUrl = photoPreview || user?.photo?.url || settingsPayload?.profile?.photo?.url;
  const userRoleDisplay = user?.role === 'super_admin' ? 'Super Admin' : 'Site Admin';
  const userInitials = (user?.name || 'User').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <h1>Personal Profile & Settings</h1>
        <p>Manage your user account credentials, preferences, and active security sessions.</p>
      </div>

      {/* Hero Banner Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-card__banner" />
        <div className="profile-hero-card__content">
          <div className="profile-hero-card__avatar-wrapper">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name || 'User'} className="profile-hero-card__avatar-img" />
            ) : (
              <div className="profile-hero-card__avatar-fallback">{userInitials}</div>
            )}
            <label htmlFor="hero-photo-upload" className="profile-hero-card__avatar-edit-btn" title="Change Avatar">
              <Camera size={14} />
            </label>
            <input id="hero-photo-upload" type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />
          </div>

          <div className="profile-hero-card__info">
            <div className="profile-hero-card__name-row">
              <h2>{user?.name || 'User Profile'}</h2>
              <span className="profile-hero-card__role-badge">
                <Shield size={12} /> {userRoleDisplay}
              </span>
            </div>
            <div className="profile-hero-card__meta-list">
              {user?.email && (
                <span className="profile-hero-card__meta-item">
                  <Mail size={14} /> {user.email}
                </span>
              )}
              {user?.phone && (
                <span className="profile-hero-card__meta-item">
                  <Phone size={14} /> {user.phone}
                </span>
              )}
              {user?.designation && (
                <span className="profile-hero-card__meta-item">
                  <Briefcase size={14} /> {user.designation}
                </span>
              )}
            </div>
          </div>

          <div className="profile-hero-card__quick-actions">
            <Button
              variant={activeTab === 'profile' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('profile')}
            >
              <User size={14} className="icon-margin-right" /> Edit Profile
            </Button>
            <Button
              variant={activeTab === 'security' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('security')}
            >
              <Lock size={14} className="icon-margin-right" /> Password & Security
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="profile-page__tabs">
        <button
          type="button"
          className={`profile-page__tab-btn ${activeTab === 'profile' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} /> Profile Details
        </button>
        {/* <button
          type="button"
          className={`profile-page__tab-btn ${activeTab === 'preferences' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings size={16} /> App Preferences
        </button> */}
        <button
          type="button"
          className={`profile-page__tab-btn ${activeTab === 'security' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={16} /> Security & Sessions
        </button>
      </div>

      {isLoadingSettings ? (
        <Card className="profile-card">
          <p className="table-empty-text">Loading user profile settings...</p>
        </Card>
      ) : (
        <div className="profile-page__content">
          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <Card className="profile-card">
              <h2><User size={18} /> Update Profile Information</h2>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                {/* Photo Uploader Component */}
                <div className="profile-photo-section">
                  <div className="profile-photo-preview">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar Preview" />
                    ) : (
                      <div className="profile-photo-preview-fallback">{userInitials}</div>
                    )}
                  </div>
                  <div className="profile-photo-actions">
                    <span>Profile Photo</span>
                    <p>Supported formats: PNG, JPG, or WEBP (Max size: 2MB)</p>
                    <div className="profile-photo-buttons">
                      <label htmlFor="photo-file-upload" className="profile-photo-btn">
                        <Upload size={14} /> {photoFile ? 'Change Selected File' : 'Upload Image'}
                      </label>
                      <input id="photo-file-upload" type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />
                      {avatarUrl && (
                        <button
                          type="button"
                          className="profile-photo-btn profile-photo-btn--danger"
                          onClick={handleRemovePhoto}
                        >
                          <Trash2 size={14} /> Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <FormField label="Full Name *" required error={profileForm.formState.errors.name?.message}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Your full name"
                      {...profileForm.register('name', { required: 'Full name is required' })}
                    />
                  </FormField>

                  <FormField label="Email Address *" required error={profileForm.formState.errors.email?.message}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="your.email@example.com"
                      {...profileForm.register('email', { required: 'Email is required' })}
                    />
                  </FormField>

                  <FormField label="Phone Number" error={profileForm.formState.errors.phone?.message}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. +91 98765 43210"
                      {...profileForm.register('phone')}
                    />
                  </FormField>

                  <FormField label="Username">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Account username"
                      {...profileForm.register('username')}
                    />
                  </FormField>

                  <FormField label="Designation / Role Title">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Site Engineer / Project Admin"
                      {...profileForm.register('designation')}
                    />
                  </FormField>

                  <FormField label="Company / Organization Info">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Mala Constructions"
                      {...profileForm.register('companyInfo')}
                    />
                  </FormField>

                  <FormField label="Biography / Short Bio" className="form-field--full">
                    <textarea
                      rows="3"
                      className="form-input"
                      style={{ resize: 'none', padding: `10px` }}
                      placeholder="Tell us a little bit about your work responsibilities..."
                      {...profileForm.register('biography')}
                    />
                  </FormField>

                  <FormField label="Office / Site Address" className="form-field--full">
                    <textarea
                      rows="2"
                      className="form-input"
                      style={{ resize: 'none', padding: `10px` }}
                      placeholder="Primary site address or office location"
                      {...profileForm.register('address')}
                    />
                  </FormField>
                </div>

                <div className="form-actions-footer">
                  <Button type="submit" isLoading={updateSettingsMutation.isPending || isUploading}>
                    {isUploading ? 'Uploading Image...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: APP PREFERENCES */}
          {activeTab === 'preferences' && (
            <Card className="profile-card">
              <h2><Settings size={18} /> Application Display & Layout Preferences</h2>
              <form onSubmit={appPrefForm.handleSubmit(onAppPrefSubmit)}>
                <div className="form-grid">
                  <FormField label="Appearance Theme">
                    <select className="form-select" {...appPrefForm.register('theme')}>
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">Follow System Theme</option>
                    </select>
                  </FormField>

                  <FormField label="Timezone Scope">
                    <select className="form-select" {...appPrefForm.register('timezone')}>
                      <option value="Asia/Kolkata">India (IST) - Asia/Kolkata</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                      <option value="America/New_York">US Eastern Time - America/New_York</option>
                    </select>
                  </FormField>

                  <FormField label="Date Format">
                    <select className="form-select" {...appPrefForm.register('dateFormat')}>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </FormField>

                  <FormField label="Default Page Table Rows">
                    <select className="form-select" {...appPrefForm.register('paginationSize', { valueAsNumber: true })}>
                      <option value={5}>5 Rows per page</option>
                      <option value={10}>10 Rows per page</option>
                      <option value={20}>20 Rows per page</option>
                      <option value={50}>50 Rows per page</option>
                    </select>
                  </FormField>

                  <div className="form-field--full">
                    <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" {...appPrefForm.register('compactMode')} />
                      <span>Enable Compact Layout Table Density</span>
                    </label>
                  </div>
                </div>

                <div className="form-actions-footer">
                  <Button type="submit" isLoading={updateSettingsMutation.isPending}>
                    Save Preferences
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 3: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {/* Active Sessions list */}
              <Card className="profile-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <h2 style={{ marginBottom: 0 }}><Shield size={18} /> Active Devices & Sessions</h2>
                  {sessions.length > 1 && (
                    <Button variant="danger" size="sm" onClick={() => terminateOtherSessions.mutate()}>
                      Sign out other devices
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessions.length === 0 ? (
                    <p className="table-empty-text">No active session logs found.</p>
                  ) : (
                    sessions.map((s) => (
                      <div className="session-item" key={s._id}>
                        <div className="session-item__details">
                          <span className="session-item__device">
                            {s.userAgent?.includes('Mobile') ? <Smartphone size={16} /> : <Laptop size={16} />}
                            {s.userAgent}
                            {s.isCurrent && <span className="session-item__current-badge">Current Session</span>}
                          </span>
                          <span className="session-item__meta">
                            IP: {s.ipAddress || '127.0.0.1'} | Last Active: {new Date(s.lastActiveAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {!s.isCurrent && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => terminateSession.mutate(s._id)}
                            title="Terminate Session"
                          >
                            <Trash2 size={14} /> Terminate
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Change Password form */}
              <Card className="profile-card">
                <h2><Lock size={18} /> Change Account Password</h2>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate>
                  <div className="form-grid">
                    <FormField label="Current Password *" required error={passwordForm.formState.errors.currentPassword?.message} className="form-field--full">
                      <div className="login-password-wrapper">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Enter your current password"
                          {...passwordForm.register('currentPassword', { required: 'Current password is required.' })}
                        />
                        <button type="button" className="login-password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormField>

                    <FormField label="New Password *" required error={passwordForm.formState.errors.newPassword?.message}>
                      <div className="login-password-wrapper">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Minimum 8 characters"
                          {...passwordForm.register('newPassword', {
                            required: 'New password is required.',
                            minLength: { value: 8, message: 'New password must be at least 8 characters long.' },
                            validate: (v) => {
                              if (v === passwordForm.watch('currentPassword')) return 'New password cannot be the same as current password.';
                              return true;
                            }
                          })}
                        />
                        <button type="button" className="login-password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormField>

                    <FormField label="Confirm New Password *" required error={passwordForm.formState.errors.confirmPassword?.message}>
                      <div className="login-password-wrapper">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Re-enter new password"
                          {...passwordForm.register('confirmPassword', {
                            required: 'Confirm password is required.',
                            validate: (v) => v === passwordForm.watch('newPassword') || 'New password and confirm password do not match.'
                          })}
                        />
                        <button type="button" className="login-password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormField>
                  </div>

                  <div className="form-actions-footer">
                    <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>
                      Update Password
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
