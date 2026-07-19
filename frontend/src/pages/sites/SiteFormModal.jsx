import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Drawer from '../../components/drawers/Drawer';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/ui/DatePickerInput';
import FormField from '../../components/forms/FormField';
import CountrySelect from '../../components/forms/CountrySelect';
import PhoneField, { validatePhone } from '../../components/forms/PhoneInput';
import { Controller } from 'react-hook-form';
import { useCreateSite, useUpdateSite } from '../../hooks/useSites';
import { useToast } from '../../contexts/ToastContext';

const DEFAULTS = {
  name: '',
  code: '',
  address: '',
  state: '',
  country: 'India',
  startDate: '',
  contactNumber: '',
  description: '',
};

export default function SiteFormModal({ isOpen, onClose, site }) {
  const isEditMode = !!site;
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (isOpen) {
      reset(
        site
          ? { ...DEFAULTS, ...site, startDate: site.startDate ? site.startDate.slice(0, 10) : '' }
          : DEFAULTS
      );
    }
  }, [isOpen, site, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEditMode) {
        await updateSite.mutateAsync({ id: site._id, payload: values });
        toast.success('Site updated.');
      } else {
        await createSite.mutateAsync(values);
        toast.success('Site created.');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Site' : 'New Site'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            {isEditMode ? 'Save changes' : 'Create site'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <FormField label="Site name" required error={errors.name?.message}>
          <input className="form-input" {...register('name', { required: 'Site name is required' })} />
        </FormField>

        <FormField label="Site code" required error={errors.code?.message} hint="Short unique identifier, e.g. MUM-01">
          <input className="form-input" {...register('code', { required: 'Site code is required' })} />
        </FormField>

        <FormField label="Address" error={errors.address?.message}>
          <input className="form-input" {...register('address')} />
        </FormField>

        <FormField label="State" error={errors.state?.message}>
          <input className="form-input" {...register('state')} />
        </FormField>

        <FormField label="Country" error={errors.country?.message}>
          <Controller
            control={control}
            name="country"
            render={({ field }) => <CountrySelect value={field.value} onChange={field.onChange} />}
          />
        </FormField>

        <FormField label="Start date" error={errors.startDate?.message}>
          <DatePickerInput id="site-start-date" value={watch('startDate')} onChange={(value) => setValue('startDate', value)} placeholder="Start date" />
        </FormField>

        <FormField label="Contact number" error={errors.contactNumber?.message}>
          <Controller
            control={control}
            name="contactNumber"
            rules={{ validate: (v) => !v || validatePhone(v) || 'Invalid phone number' }}
            render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />}
          />
        </FormField>

        {isEditMode && (
          <FormField label="Site Status" required error={errors.status?.message}>
            <select className="form-select" {...register('status', { required: 'Status is required' })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
        )}

        <FormField label="Description" error={errors.description?.message}>
          <textarea className="form-textarea" {...register('description')} />
        </FormField>
      </form>
    </Drawer>
  );
}
