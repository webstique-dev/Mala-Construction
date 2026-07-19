import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUserSettings, useSystemSettings, useUpdateSystemSettings } from '../../hooks/useSettings';
import { useLookups } from '../../hooks/useLookups';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import Card from '../../components/ui/Card';
import { Shield, Camera, Database, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Profile.css'; // Reuse profile card / tabs layout styles

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_LOGO_IMAGE_SIZE = 2 * 1024 * 1024;

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
    return 'You are not authorized to update company settings.';
  }

  if (status === 500 || status === 503) {
    return serverMessage || 'Cloudinary upload failed. Please verify the Cloudinary configuration and try again.';
  }

  if (error?.message?.includes('Network')) {
    return 'Network error. Please check your connection and try again.';
  }

  return serverMessage || 'Upload failed. Please try again.';
}

export default function Settings() {
  const toast = useToast();
  const { refreshUser } = useAuth();

  const { data: systemPayload, isLoading } = useSystemSettings();
  const updateSystemSettingsMutation = useUpdateSystemSettings();

  // Load active sites list
  const { activeSites } = useLookups();
  const siteOptions = activeSites.data || [];

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      companyName: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      currency: 'INR',
      currencySymbol: '₹',
      defaultTaxRate: 18,
      invoicePrefix: 'INV-',
      receiptPrefix: 'REC-',
      financialYear: '2026-2027',
      defaultSite: '',
      defaultPaymentMethod: 'cash',
      backupFrequency: 'weekly',
      backupEmail: true
    }
  });

  // Pre-fill form when system configuration is fetched
  useEffect(() => {
    if (systemPayload?.settings) {
      const s = systemPayload.settings;
      reset({
        companyName: s.companyName || '',
        companyAddress: s.companyAddress || '',
        companyPhone: s.companyPhone || '',
        companyEmail: s.companyEmail || '',
        currency: s.currency || 'INR',
        currencySymbol: s.currencySymbol || '₹',
        defaultTaxRate: s.defaultTaxRate ?? 18,
        invoicePrefix: s.invoicePrefix || 'INV-',
        receiptPrefix: s.receiptPrefix || 'REC-',
        financialYear: s.financialYear || '2026-2027',
        defaultSite: s.defaultSite || '',
        defaultPaymentMethod: s.defaultPaymentMethod || 'cash',
        backupFrequency: s.backupPreferences?.frequency || 'weekly',
        backupEmail: s.backupPreferences?.emailNotification ?? true
      });
      if (s.companyLogo?.url) {
        setLogoPreview(s.companyLogo.url);
        setRemoveLogo(false);
      } else {
        setLogoPreview(null);
      }
    }
  }, [systemPayload]);

  const onLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid image format. Please choose a JPG, PNG, or WEBP file.');
      return;
    }

    if (file.size > MAX_LOGO_IMAGE_SIZE) {
      toast.error('File too large. Please choose an image smaller than 2MB.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const onSubmit = async (values) => {
    try {
      setIsUploading(true);
      const formData = new FormData();

      // Map flat form settings values back to nested schema structures
      const payload = {
        companyName: values.companyName,
        companyAddress: values.companyAddress,
        companyPhone: values.companyPhone,
        companyEmail: values.companyEmail,
        currency: values.currency,
        currencySymbol: values.currencySymbol,
        defaultTaxRate: Number(values.defaultTaxRate),
        invoicePrefix: values.invoicePrefix,
        receiptPrefix: values.receiptPrefix,
        financialYear: values.financialYear,
        defaultSite: values.defaultSite || null,
        defaultPaymentMethod: values.defaultPaymentMethod,
        backupPreferences: {
          frequency: values.backupFrequency,
          emailNotification: values.backupEmail
        }
      };

      // Append data fields
      Object.keys(payload).forEach(key => {
        if (key === 'backupPreferences') {
          formData.append(key, JSON.stringify(payload[key]));
        } else {
          formData.append(key, payload[key] ?? '');
        }
      });

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      formData.append('removeLogo', removeLogo ? 'true' : 'false');

      await updateSystemSettingsMutation.mutateAsync(formData);
      await refreshUser();
      toast.success('System settings saved successfully.');
      setLogoFile(null);
      setRemoveLogo(false);
    } catch (err) {
      toast.error(getUploadErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-page__header">
          <h1>System Administration</h1>
          <p>Configure company parameters, invoices prefixes, default taxes, and backup schedules.</p>
        </div>
        <Card className="profile-card">
          <p>Loading company configuration...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <h1>System Administration</h1>
        <p>Configure company parameters, invoices prefixes, default taxes, and backup schedules.</p>
      </div>

      <div className="profile-page__content">
        <Card className="profile-card">
          <h2><Shield size={18} /> Company Profile & Defaults</h2>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Logo upload block */}
            {/* <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div
                style={{
                  position: 'relative',
                  width: 90,
                  height: 90,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontSize: 10, textAlign: 'center', color: 'var(--color-text-secondary)' }}>No Logo</div>
                )}
                <label htmlFor="logo-upload" style={{ position: 'absolute', bottom: 0, right: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: 'white', textAlign: 'center', fontSize: 10, padding: '2px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={12} />
                </label>
                <input id="logo-upload" type="file" accept="image/*" onChange={onLogoChange} style={{ display: 'none' }} />
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>Company Logo</span>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>PNG/JPG/WEBP landscape logo. Max 2MB.</p>
                {logoPreview && (
                  <button
                    type="button"
                    className="link-btn text-danger"
                    onClick={handleRemoveLogo}
                    style={{ fontSize: 'var(--font-size-xs)', border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Trash2 size={12} /> Remove Logo
                  </button>
                )}
              </div>
            </div> */}

            <div className="form-grid">
              <FormField label="Company Name" required error={errors.companyName?.message}>
                <input type="text" className="form-input" {...register('companyName', { required: 'Company name is required' })} />
              </FormField>

              <FormField label="Company Email" required error={errors.companyEmail?.message}>
                <input type="email" className="form-input" {...register('companyEmail', { required: 'Company email is required' })} />
              </FormField>

              <FormField label="Company Phone" error={errors.companyPhone?.message}>
                <input type="text" className="form-input" {...register('companyPhone')} />
              </FormField>

              <FormField label="Financial Year">
                <input type="text" className="form-input" placeholder="e.g. 2026-2027" {...register('financialYear')} />
              </FormField>

              <FormField label="Default Tax Rate (%)" required error={errors.defaultTaxRate?.message}>
                <input type="number" className="form-input" {...register('defaultTaxRate', { required: 'Tax rate is required', min: { value: 0, message: 'Tax cannot be negative' } })} />
              </FormField>

              <FormField label="Currency Symbol">
                <input type="text" className="form-input" {...register('currencySymbol')} />
              </FormField>

              <FormField label="Invoice Prefix">
                <input type="text" className="form-input" {...register('invoicePrefix')} />
              </FormField>

              <FormField label="Receipt Prefix">
                <input type="text" className="form-input" {...register('receiptPrefix')} />
              </FormField>

              <FormField label="Default Project Site">
                <select className="form-select" {...register('defaultSite')}>
                  <option value="">None</option>
                  {siteOptions.map(site => (
                    <option key={site._id} value={site._id}>{site.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Default Payment Mode">
                <select className="form-select" {...register('defaultPaymentMethod')}>
                  <option value="cash">Cash</option>
                  <option value="bankTransfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </FormField>

              <FormField label="Company Address" className="form-field--full">
                <textarea rows="2" className="form-input" style={{ resize: 'none' }} {...register('companyAddress')}></textarea>
              </FormField>
            </div>

            {/* <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: 6, margin: '20px 0 12px' }}>
              <Database size={16} /> Database Backup Preferences
            </h3>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <FormField label="Backup Frequency" style={{ flex: 1 }}>
                <select className="form-select" {...register('backupFrequency')}>
                  <option value="daily">Daily Backup</option>
                  <option value="weekly">Weekly Backup</option>
                  <option value="monthly">Monthly Backup</option>
                </select>
              </FormField>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 20 }}>
                <label className="checkbox-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" {...register('backupEmail')} />
                  <span>Receive email reports on successful backups</span>
                </label>
              </div>
            </div> */}

            <Button type="submit" isLoading={updateSystemSettingsMutation.isPending || isUploading}>
              {isUploading ? 'Uploading logo...' : 'Save System Parameters'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
