import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Drawer from '../../components/drawers/Drawer';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import DatePickerInput from '../../components/ui/DatePickerInput';
import FileUpload from '../../components/forms/FileUpload';
import { useCreatePayment, useUpdatePayment } from '../../hooks/usePayments';
import { useWorkers } from '../../hooks/useWorkers';
import { useLookups } from '../../hooks/useLookups';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useToast } from '../../contexts/ToastContext';
import { calculateNetSalary, toInputDate } from '../../utils/format';

const DEFAULTS = {
  site: '', worker: '', workingDays: '', dailyWage: '', bonus: 0, advance: 0, deduction: 0,
  paymentMethod: 'cash', paidOn: toInputDate(new Date()), status: 'paid', remarks: '',
};

export default function PaymentFormModal({ isOpen, onClose, payment, defaultSiteId }) {
  const isEdit = !!payment;
  const [receiptFile, setReceiptFile] = useState(null);
  const { isSuperAdmin } = useSiteScope();
  const { activeSites } = useLookups(defaultSiteId);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const toast = useToast();
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: DEFAULTS });
  const siteValue = watch('site') || defaultSiteId;
  const { data: workersData } = useWorkers({ siteId: siteValue, limit: 100, status: 'active' });
  const watched = useWatch({ control });
  const netAmount = calculateNetSalary(watched);

  useEffect(() => {
    if (isOpen) {
      setReceiptFile(null);
      reset(payment ? {
        site: payment.site?._id ?? payment.site,
        worker: payment.worker?._id ?? payment.worker,
        workingDays: payment.workingDays,
        dailyWage: payment.dailyWage,
        bonus: payment.bonus ?? 0,
        advance: payment.advance ?? 0,
        deduction: payment.deduction ?? 0,
        paymentMethod: payment.paymentMethod,
        paidOn: toInputDate(payment.paidOn),
        status: payment.status,
        remarks: payment.remarks ?? '',
      } : { ...DEFAULTS, site: defaultSiteId ?? '' });
    }
  }, [isOpen, payment, defaultSiteId, reset]);

  const onWorkerChange = (workerId) => {
    const worker = workersData?.items?.find((w) => w._id === workerId);
    if (worker) setValue('dailyWage', worker.dailyWage);
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        workingDays: Number(values.workingDays),
        dailyWage: Number(values.dailyWage),
        bonus: Number(values.bonus),
        advance: Number(values.advance),
        deduction: Number(values.deduction),
      };
      if (isEdit) {
        await updatePayment.mutateAsync({ id: payment._id, payload, receiptFile });
        toast.success('Payment updated.');
      } else {
        await createPayment.mutateAsync({ payload, receiptFile });
        toast.success('Payment recorded.');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Payment' : 'Record Payment'} size="md"
      footer={<><Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>Save</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {isSuperAdmin && (
            <FormField label="Site" required className="form-field--full">
              <select className="form-select" {...register('site', { required: true })} disabled={isEdit}>
                <option value="">Select site</option>
                {activeSites.data?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </FormField>
          )}
          {!isSuperAdmin && <input type="hidden" {...register('site')} value={defaultSiteId ?? ''} />}
          <FormField label="Worker" required className="form-field--full">
            <select className="form-select" {...register('worker', { required: true })} disabled={isEdit} onChange={(e) => onWorkerChange(e.target.value)}>
              <option value="">Select worker</option>
              {workersData?.items?.map((w) => <option key={w._id} value={w._id}>{w.name} — {w.profession?.name}</option>)}
            </select>
          </FormField>
          <FormField label="Working days" required><input type="number" className="form-input" {...register('workingDays', { required: true })} /></FormField>
          <FormField label="Daily wage (₹)" required><input type="number" className="form-input" {...register('dailyWage', { required: true })} /></FormField>
          <FormField label="Bonus (₹)"><input type="number" className="form-input" {...register('bonus')} /></FormField>
          <FormField label="Advance (₹)"><input type="number" className="form-input" {...register('advance')} /></FormField>
          <FormField label="Deduction (₹)"><input type="number" className="form-input" {...register('deduction')} /></FormField>
          <FormField label="Payment method"><select className="form-select" {...register('paymentMethod')}><option value="cash">Cash</option><option value="bankTransfer">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option></select></FormField>
          <FormField label="Payment date" required>
            <DatePickerInput id="payment-date" value={watch('paidOn')} onChange={(value) => setValue('paidOn', value)} placeholder="Payment date" />
          </FormField>
          <FormField label="Status"><select className="form-select" {...register('status')}><option value="paid">Paid</option><option value="pending">Pending</option></select></FormField>
          <FormField label="Remarks" className="form-field--full"><textarea className="form-textarea" {...register('remarks')} /></FormField>
          <div className="form-field--full"><FileUpload label="Receipt" accept="image/*,.pdf" value={receiptFile} onChange={setReceiptFile} /></div>
        </div>
        <div className="module-page__total-preview" style={{ marginTop: 'var(--space-md)' }}>Net Amount: ₹{netAmount.toLocaleString('en-IN')}</div>
      </form>
    </Drawer>
  );
}
