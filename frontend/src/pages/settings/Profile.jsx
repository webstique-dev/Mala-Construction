import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, Shield, Eye, EyeOff, User, Settings, Bell, Camera, Trash2 } from 'lucide-react';
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
  const notifPrefForm = useForm({ defaultValues: { lowStock: true, workerPayments: true, expenses: true, loginAlerts: true, reportGeneration: true, securityAlerts: true, systemUpdates: true, inApp: true, email: true, push: false } });
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
      if (settingsPayload.notifications) {
        notifPrefForm.reset({
          lowStock: settingsPayload.notifications.lowStock ?? true,
          workerPayments: settingsPayload.notifications.workerPayments ?? true,
          expenses: settingsPayload.notifications.expenses ?? true,
          loginAlerts: settingsPayload.notifications.loginAlerts ?? true,
          reportGeneration: settingsPayload.notifications.reportGeneration ?? true,
          securityAlerts: settingsPayload.notifications.securityAlerts ?? true,
          systemUpdates: settingsPayload.notifications.systemUpdates ?? true,
          inApp: settingsPayload.notifications.inApp ?? true,
          email: settingsPayload.notifications.email ?? true,
          push: settingsPayload.notifications.push ?? false
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

  // Submit Notification Preferences Form
  const onNotifPrefSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('notificationsData', JSON.stringify(values));
      await updateSettingsMutation.mutateAsync(formData);
      await refreshUser();
      toast.success('Notification preferences updated successfully.');
    } catch (err) {
      toast.error('Failed to update preferences.');
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

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <h1>Personal Preferences & Account</h1>
        <p>Configure dashboard layouts, notification switches, and account credential security.</p>
      </div>

      {/* Tabs list */}
      <div className="profile-page__tabs">
        <button
          className={`profile-page__tab-btn ${activeTab === 'profile' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Profile Details
        </button>
        <button
          className={`profile-page__tab-btn ${activeTab === 'preferences' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          App Preferences
        </button>
        {/* <button
          className={`profile-page__tab-btn ${activeTab === 'notifications' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Notifications Toggles
        </button> */}
        <button
          className={`profile-page__tab-btn ${activeTab === 'security' ? 'profile-page__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Security & Sessions
        </button>
      </div>

      {isLoadingSettings ? (
        <Card className="profile-card">
          <p>Loading settings profile...</p>
        </Card>
      ) : (
        <div className="profile-page__content">
          {/* TAB: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <Card className="profile-card">
              <h2><User size={18} /> Update Profile Information</h2>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>

                {/* Photo Upload and Preview */}
                {/* <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                        {user?.name?.split(' ').map(n=>n[0]).join('')}
                      </div>
                    )}
                    <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: 0, right: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: 'white', textAlign: 'center', fontSize: 10, padding: '2px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={12} />
                    </label>
                    <input id="photo-upload" type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>Profile Photo</span>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>PNG, JPG or WEBP. Max 2MB.</p>
                    {avatarUrl && (
                      <button
                        type="button"
                        className="link-btn text-danger"
                        onClick={handleRemovePhoto}
                        style={{ fontSize: 'var(--font-size-xs)', border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Trash2 size={12} /> Remove Photo
                      </button>
                    )}
                  </div>
                </div> */}

                <div className="form-grid">
                  <FormField label="Full Name" required error={profileForm.formState.errors.name?.message}>
                    <input type="text" className="form-input" {...profileForm.register('name', { required: 'Name is required' })} />
                  </FormField>

                  <FormField label="Email address" required error={profileForm.formState.errors.email?.message}>
                    <input type="email" className="form-input" {...profileForm.register('email', { required: 'Email is required' })} />
                  </FormField>

                  <FormField label="Phone Number" error={profileForm.formState.errors.phone?.message}>
                    <input type="text" className="form-input" {...profileForm.register('phone')} />
                  </FormField>

                  <FormField label="Username">
                    <input type="text" className="form-input" {...profileForm.register('username')} />
                  </FormField>

                  <FormField label="Designation">
                    <input type="text" className="form-input" {...profileForm.register('designation')} />
                  </FormField>

                  <FormField label="Company Info">
                    <input type="text" className="form-input" {...profileForm.register('companyInfo')} />
                  </FormField>

                  <FormField label="Biography" className="form-field--full">
                    <textarea rows="3" className="form-input" style={{ resize: 'none' }} {...profileForm.register('biography')}></textarea>
                  </FormField>

                  <FormField label="Address" className="form-field--full">
                    <textarea rows="2" className="form-input" style={{ resize: 'none' }} {...profileForm.register('address')}></textarea>
                  </FormField>
                </div>

                <Button type="submit" isLoading={updateSettingsMutation.isPending || isUploading}>
                  {isUploading ? 'Uploading image...' : 'Save Profile Changes'}
                </Button>
              </form>
            </Card>
          )}

          {/* TAB: APP PREFERENCES */}
          {activeTab === 'preferences' && (
            <Card className="profile-card">
              <h2><Settings size={18} /> Application Layout Settings</h2>
              <form onSubmit={appPrefForm.handleSubmit(onAppPrefSubmit)}>
                <div className="form-grid">
                  <FormField label="Theme Select">
                    <select className="form-select" {...appPrefForm.register('theme')}>
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">Follow System</option>
                    </select>
                  </FormField>

                  <FormField label="Timezone">
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

                  <FormField label="Default Page size">
                    <select className="form-select" {...appPrefForm.register('paginationSize', { valueAsNumber: true })}>
                      <option value={5}>5 Rows</option>
                      <option value={10}>10 Rows</option>
                      <option value={20}>20 Rows</option>
                      <option value={50}>50 Rows</option>
                    </select>
                  </FormField>

                  <div className="form-field--full" style={{ marginTop: 8 }}>
                    <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" {...appPrefForm.register('compactMode')} />
                      <span>Compact Mode Table Density</span>
                    </label>
                  </div>
                </div>

                <Button type="submit" isLoading={updateSettingsMutation.isPending}>
                  Save Layout Preferences
                </Button>
              </form>
            </Card>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card className="profile-card">
              <h2><Bell size={18} /> Configure Notification Switches</h2>
              <form onSubmit={notifPrefForm.handleSubmit(onNotifPrefSubmit)}>

                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: 6, marginBottom: 12 }}>Notification Triggers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('lowStock')} />
                    <span>Low Stock Warnings & Material Threshold Alerts</span>
                  </label>

                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('workerPayments')} />
                    <span>Worker Salary Payments logged</span>
                  </label>

                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('expenses')} />
                    <span>Site Overhead Expense Review submissions & responses</span>
                  </label>

                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('loginAlerts')} />
                    <span>Login security logs & connection alerts</span>
                  </label>

                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('reportGeneration')} />
                    <span>Report Generation export logs</span>
                  </label>

                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('securityAlerts')} />
                    <span>Password updates and profile pref resets</span>
                  </label>

                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('systemUpdates')} />
                    <span>System updates and global announcements</span>
                  </label>
                </div>

                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: 6, marginBottom: 12 }}>Preferred Notification Modes</h3>
                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('inApp')} />
                    <span>In-App Center</span>
                  </label>
                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" {...notifPrefForm.register('email')} />
                    <span>Email Delivery</span>
                  </label>
                  <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: 0.6 }}>
                    <input type="checkbox" disabled {...notifPrefForm.register('push')} />
                    <span>Push Alerts (Future-ready)</span>
                  </label>
                </div>

                <Button type="submit" isLoading={updateSettingsMutation.isPending}>
                  Save Notifications Preferences
                </Button>
              </form>
            </Card>
          )}

          {/* TAB: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

              {/* Active Sessions list */}
              <Card className="profile-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                  <h2 style={{ marginBottom: 0 }}><Shield size={18} /> Active Devices & Sessions</h2>
                  {sessions.length > 1 && (
                    <Button variant="danger" size="sm" onClick={() => terminateOtherSessions.mutate()}>
                      Sign out other devices
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sessions.map((s) => (
                    <div className="session-item" key={s._id}>
                      <div className="session-item__details">
                        <span className="session-item__device">
                          {s.userAgent}
                          {s.isCurrent && <span className="session-item__current-badge" style={{ marginLeft: 8 }}>Current Session</span>}
                        </span>
                        <span className="session-item__meta">
                          IP: {s.ipAddress} | Last Active: {new Date(s.lastActiveAt).toLocaleString()}
                        </span>
                      </div>
                      {!s.isCurrent && (
                        <button
                          className="topbar__icon-btn touch-target text-danger"
                          onClick={() => terminateSession.mutate(s._id)}
                          title="Terminate Session"
                        >
                          <Trash2 size={16} style={{ color: 'var(--color-danger-500)' }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Change Password form */}
              <Card className="profile-card">
                <h2><Shield size={18} /> Change Account Password</h2>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate>

                  <FormField label="Current password" required error={passwordForm.formState.errors.currentPassword?.message}>
                    <div className="login-password-wrapper">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="form-input"
                        {...passwordForm.register('currentPassword', { required: 'Current password is required.' })}
                      />
                      <button type="button" className="login-password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormField>

                  <FormField label="New password" required error={passwordForm.formState.errors.newPassword?.message}>
                    <div className="login-password-wrapper">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-input"
                        {...passwordForm.register('newPassword', {
                          required: 'New password is required.',
                          minLength: { value: 8, message: 'New password must be at least 8 characters long.' },
                          validate: (v) => {
                            if (v === passwordForm.watch('currentPassword')) return 'New password cannot be the same as the current password.';
                            return true;
                          }
                        })}
                      />
                      <button type="button" className="login-password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Confirm new password" required error={passwordForm.formState.errors.confirmPassword?.message}>
                    <div className="login-password-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input"
                        {...passwordForm.register('confirmPassword', {
                          required: 'Confirm password is required.',
                          validate: (v) => v === passwordForm.watch('newPassword') || 'New password and confirm password do not match.'
                        })}
                      />
                      <button type="button" className="login-password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormField>

                  <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>
                    Update Password
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
