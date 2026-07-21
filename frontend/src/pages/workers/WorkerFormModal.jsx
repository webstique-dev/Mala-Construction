import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Drawer from '../../components/drawers/Drawer';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import DatePickerInput from '../../components/ui/DatePickerInput';
import FileUpload from '../../components/forms/FileUpload';
import PhoneField, { validatePhone } from '../../components/forms/PhoneInput';
import { Controller } from 'react-hook-form';
import CreatableSelect from '../../components/forms/CreatableSelect';
import { useCreateWorker, useUpdateWorker } from '../../hooks/useWorkers';
import { useLookups } from '../../hooks/useLookups';
import { useCreateProfession } from '../../hooks/useLookupsMutations';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useToast } from '../../contexts/ToastContext';
import { toInputDate } from '../../utils/format';

const DEFAULTS = {
  site: '', name: '', phone: '', profession: '', dailyWage: '', joiningDate: toInputDate(new Date()),
  address: '', emergencyContactName: '', emergencyContactPhone: '', status: 'active',
};

export default function WorkerFormModal({ isOpen, onClose, worker, defaultSiteId, onCreated }) {
  const isEdit = !!worker;
  const [photoFile, setPhotoFile] = useState(null);
  const { isSuperAdmin } = useSiteScope();
  const { professions, activeSites } = useLookups(defaultSiteId);
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const createProfession = useCreateProfession();
  const toast = useToast();
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (isOpen) {
      setPhotoFile(null);
      reset(worker ? {
        site: worker.site?._id ?? worker.site,
        name: worker.name, phone: worker.phone,
        profession: worker.profession?._id ?? worker.profession,
        dailyWage: worker.dailyWage,
        joiningDate: toInputDate(worker.joiningDate),
        address: worker.address ?? '',
        emergencyContactName: worker.emergencyContact?.name ?? '',
        emergencyContactPhone: worker.emergencyContact?.phone ?? '',
        status: worker.status,
      } : { ...DEFAULTS, site: defaultSiteId ?? '' });
    }
  }, [isOpen, worker, defaultSiteId, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, dailyWage: Number(values.dailyWage) };
      if (isEdit) {
        await updateWorker.mutateAsync({ id: worker._id, payload, photoFile });
        toast.success('Worker updated.');
        onClose();
      } else {
        const result = await createWorker.mutateAsync({ payload, photoFile });
        toast.success('Worker added.');
        // If caller wants the newly created worker (e.g. WorkerPickerInput), call onCreated
        if (onCreated && result?.data) {
          onCreated(result.data);
        } else {
          onClose();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Worker' : 'Add Worker'} size="md"
      footer={<><Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>{isEdit ? 'Save' : 'Add worker'}</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Worker ID display (read-only, shown only in edit mode) */}
          {isEdit && worker?.workerId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Worker ID</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-700)' }}>{worker.workerId}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>Auto-generated · Read only</span>
            </div>
          )}
          {isSuperAdmin && (
            <FormField label="Site" required error={errors.site?.message} className="form-field--full">
              <select className="form-select" {...register('site', { required: true })} disabled={isEdit}>
                <option value="">Select site</option>
                {activeSites.data?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </FormField>
          )}
          {!isSuperAdmin && <input type="hidden" {...register('site')} value={defaultSiteId ?? ''} />}
          <FormField label="Full name" required error={errors.name?.message}><input className="form-input" {...register('name', { required: true, setValueAs: v => (typeof v === 'string' ? v.trim() : v) })} /></FormField>
          <FormField label="Mobile" required error={errors.phone?.message}>
            <Controller control={control} name="phone" rules={{ required: 'Phone is required', validate: (v) => validatePhone(v) || 'Invalid phone number' }} render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />} />
          </FormField>
          <FormField label="Profession" required error={errors.profession?.message}>
            <Controller
              control={control}
              name="profession"
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <CreatableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={professions.data || []}
                  onCreate={(name) => createProfession.mutateAsync(name)}
                  placeholder="Select or create profession..."
                  isLoading={professions.isLoading}
                />
              )}
            />
          </FormField>
          <FormField label="Daily wage (₹)" required error={errors.dailyWage?.message}><input type="number" className="form-input" {...register('dailyWage', { required: true })} /></FormField>
          <FormField label="Joining date" required error={errors.joiningDate?.message}>
            <DatePickerInput id="worker-joining-date" value={watch('joiningDate')} onChange={(value) => setValue('joiningDate', value)} placeholder="Joining date" />
          </FormField>
          <FormField label="Status"><select className="form-select" {...register('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></FormField>
          <FormField label="Address" className="form-field--full"><input className="form-input" {...register('address', { setValueAs: v => (typeof v === 'string' ? v.trim() : v) })} /></FormField>
          {/* <FormField label="Emergency contact"><input className="form-input" {...register('emergencyContactName')} /></FormField> */}
          <FormField label="Emergency phone">
            <Controller control={control} name="emergencyContactPhone" rules={{ validate: (v) => !v || validatePhone(v) || 'Invalid phone number' }} render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />} />
          </FormField>
          <div className="form-field--full">
            <FileUpload label="Photo" accept="image/*" value={photoFile} onChange={setPhotoFile} />
            {worker?.photo?.url && !photoFile && <img src={worker.photo.url} alt="" style={{ width: 64, height: 64, borderRadius: 8, marginTop: 8, objectFit: 'cover' }} />}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
