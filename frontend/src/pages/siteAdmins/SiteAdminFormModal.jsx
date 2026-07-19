import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Drawer from '../../components/drawers/Drawer';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import { useSites } from '../../hooks/useSites';
import { useCreateSiteAdmin, useUpdateSiteAdmin } from '../../hooks/useSiteAdmins';
import { useToast } from '../../contexts/ToastContext';
import { isEmail, trimString } from '../../utils/validators';
import PhoneField, { validatePhone } from '../../components/forms/PhoneInput';
import { Controller } from 'react-hook-form';

const DEFAULTS = { name: '', email: '', phone: '', assignedSite: '' };

export default function SiteAdminFormModal({ isOpen, onClose, admin, onCreated }) {
  const isEditMode = !!admin;
  const [photoFile, setPhotoFile] = useState(null);
  const { data: sitesData } = useSites({ limit: 100, status: 'active' });
  const createSiteAdmin = useCreateSiteAdmin();
  const updateSiteAdmin = useUpdateSiteAdmin();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (isOpen) {
      setPhotoFile(null);
      reset(
        admin
          ? { name: admin.name, email: admin.email, phone: admin.phone, assignedSite: admin.assignedSite?._id || '' }
          : DEFAULTS
      );
    }
  }, [isOpen, admin, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEditMode) {
        await updateSiteAdmin.mutateAsync({
          id: admin._id,
          data: { name: values.name, phone: values.phone, ...(photoFile ? { photoFile } : {}) },
        });
        toast.success('Site Admin updated.');
        onClose();
      } else {
        const result = await createSiteAdmin.mutateAsync({ ...values, ...(photoFile ? { photoFile } : {}) });
        toast.success('Site Admin created.');
        onClose();
        onCreated?.({ name: values.name, password: result.tempPassword });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Site Admin' : 'New Site Admin'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            {isEditMode ? 'Save changes' : 'Create Site Admin'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <FormField label="Full name" required error={errors.name?.message}>
          <input className="form-input" {...register('name', { required: 'Name is required', setValueAs: v => trimString(v) })} />
        </FormField>

        <FormField label="Email" required error={errors.email?.message} hint={isEditMode ? 'Email cannot be changed after creation.' : undefined}>
          <input
            type="email"
            className="form-input"
            disabled={isEditMode}
            {...register('email', { required: !isEditMode && 'Email is required', validate: (v) => !v || isEmail(v) || 'Invalid email', setValueAs: (v) => trimString(v) })}
          />
        </FormField>

        <FormField label="Phone" required error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            rules={{ required: 'Phone is required', validate: (v) => validatePhone(v) || 'Invalid phone number' }}
            render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />}
          />
        </FormField>

        {!isEditMode && (
          <FormField label="Assigned site" required error={errors.assignedSite?.message}>
            <select className="form-select" {...register('assignedSite', { required: 'Please select a site' })}>
              <option value="">Select a site...</option>
              {sitesData?.items?.map((site) => (
                <option key={site._id} value={site._id} disabled={!!site.assignedSiteAdmin}>
                  {site.name} ({site.code}){site.assignedSiteAdmin ? ' - already has an admin' : ''}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Photo" hint="JPEG, PNG or WebP, up to 5MB">
          <input
            type="file"
            className="form-input"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
        </FormField>
      </form>
    </Drawer>
  );
}
