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
  site: '', name: '', phone: '', profession: '', dailyWage: '', workerCount: 1, joiningDate: toInputDate(new Date()),
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
        name: worker.name, phone: worker.phone ?? '',
        profession: worker.profession?._id ?? worker.profession,
        dailyWage: worker.dailyWage,
        workerCount: worker.workerCount ?? 1,
        joiningDate: toInputDate(worker.joiningDate),
        address: worker.address ?? '',
        emergencyContactName: worker.emergencyContact?.name ?? '',
        emergencyContactPhone: worker.emergencyContact?.phone ?? '',
        status: worker.status ?? 'active',
      } : { ...DEFAULTS, site: defaultSiteId ?? '' });
    }
  }, [isOpen, worker, defaultSiteId, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        dailyWage: Number(values.dailyWage),
        workerCount: Number(values.workerCount) >= 0 ? Number(values.workerCount) : 1,
      };
      if (isEdit) {
        await updateWorker.mutateAsync({ id: worker._id, payload, photoFile });
        toast.success('Worker Leader updated.');
        onClose();
      } else {
        const result = await createWorker.mutateAsync({ payload, photoFile });
        toast.success('Worker Leader added.');
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
    <Drawer isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Worker Leader' : 'Add Worker Leader'} size="md"
      footer={<><Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>{isEdit ? 'Save Changes' : 'Add Worker Leader'}</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {isEdit && worker?.workerId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leader ID</span>
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
          <FormField label="Worker Leader Name" required error={errors.name?.message}>
            <input className="form-input" placeholder="e.g. Mark" {...register('name', { required: 'Name is required', setValueAs: v => (typeof v === 'string' ? v.trim() : v) })} />
          </FormField>
          <FormField label="Profession" required error={errors.profession?.message}>
            <Controller
              control={control}
              name="profession"
              rules={{ required: 'Profession is required' }}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <FormField label="Daily Wage (₹)" required error={errors.dailyWage?.message}>
              <input type="number" min="0" className="form-input" placeholder="800" {...register('dailyWage', { required: 'Daily wage is required' })} />
            </FormField>
            <FormField label="Status">
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <FormField label="Emergency Phone (Optional)">
            <Controller control={control} name="emergencyContactPhone" rules={{ validate: (v) => !v || validatePhone(v) || 'Invalid phone number' }} render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />} />
          </FormField>
          <div className="form-field--full">
            <FileUpload label="Photo (Optional)" accept="image/*" value={photoFile} onChange={setPhotoFile} />
            {worker?.photo?.url && !photoFile && <img src={worker.photo.url} alt="" style={{ width: 64, height: 64, borderRadius: 8, marginTop: 8, objectFit: 'cover' }} />}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
