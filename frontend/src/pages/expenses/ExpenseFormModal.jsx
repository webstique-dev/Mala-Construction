import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Drawer from '../../components/drawers/Drawer';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import DatePickerInput from '../../components/ui/DatePickerInput';
import FileUpload from '../../components/forms/FileUpload';
import CreatableSelect from '../../components/forms/CreatableSelect';
import { useCreateExpense, useUpdateExpense } from '../../hooks/useExpenses';
import { useLookups } from '../../hooks/useLookups';
import { useCreateExpenseCategory } from '../../hooks/useLookupsMutations';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useToast } from '../../contexts/ToastContext';
import { toInputDate } from '../../utils/format';

const DEFAULTS = {
  site: '', title: '', category: '', amount: '', vendor: '', description: '',
  date: toInputDate(new Date()), paymentMethod: 'cash',
};

export default function ExpenseFormModal({ isOpen, onClose, expense, defaultSiteId }) {
  const isEdit = !!expense;
  const [receiptFile, setReceiptFile] = useState(null);
  const { isSuperAdmin } = useSiteScope();
  const { expenseCategories, activeSites } = useLookups(defaultSiteId);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createExpenseCategory = useCreateExpenseCategory();
  const toast = useToast();
  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (isOpen) {
      setReceiptFile(null);
      reset(expense ? {
        site: expense.site?._id ?? expense.site,
        title: expense.title,
        category: expense.category?._id ?? expense.category,
        amount: expense.amount,
        vendor: expense.vendor ?? '',
        description: expense.description ?? '',
        date: toInputDate(expense.date),
        paymentMethod: expense.paymentMethod,
      } : { ...DEFAULTS, site: defaultSiteId ?? '' });
    }
  }, [isOpen, expense, defaultSiteId, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, amount: Number(values.amount) };
      if (isEdit) {
        await updateExpense.mutateAsync({ id: expense._id, payload, receiptFile });
        toast.success('Expense updated.');
      } else {
        await createExpense.mutateAsync({ payload, receiptFile });
        toast.success('Expense added.');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Expense' : 'New Expense'} size="md"
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
          <FormField label="Title" required className="form-field--full"><input className="form-input" {...register('title', { required: true })} /></FormField>
          <FormField label="Category" required error={errors.category?.message}>
            <Controller
              control={control}
              name="category"
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <CreatableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={expenseCategories.data || []}
                  onCreate={(name) => createExpenseCategory.mutateAsync(name)}
                  placeholder="Select or create category..."
                  isLoading={expenseCategories.isLoading}
                />
              )}
            />
          </FormField>
          <FormField label="Amount (₹)" required><input type="number" className="form-input" {...register('amount', { required: true })} /></FormField>
          <FormField label="Date" required>
            <DatePickerInput id="expense-date" value={watch('date')} onChange={(value) => setValue('date', value)} placeholder="Select date" />
          </FormField>
          <FormField label="Payment method" required>
            <select className="form-select" {...register('paymentMethod', { required: true })}>
              <option value="cash">Cash</option><option value="bankTransfer">Bank Transfer</option>
              <option value="upi">UPI</option><option value="cheque">Cheque</option><option value="card">Card</option>
            </select>
          </FormField>
          <FormField label="Vendor"><input className="form-input" {...register('vendor')} /></FormField>
          <FormField label="Description" className="form-field--full"><textarea className="form-textarea" {...register('description')} /></FormField>
          <div className="form-field--full"><FileUpload label="Receipt" accept="image/*,.pdf" value={receiptFile} onChange={setReceiptFile} /></div>
        </div>
      </form>
    </Drawer>
  );
}
