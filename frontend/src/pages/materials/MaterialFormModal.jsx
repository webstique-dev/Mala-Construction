import { useEffect, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import Drawer from '../../components/drawers/Drawer';
import Button from '../../components/common/Button';
import FormField from '../../components/forms/FormField';
import DatePickerInput from '../../components/ui/DatePickerInput';
import FileUpload from '../../components/forms/FileUpload';
import CreatableSelect from '../../components/forms/CreatableSelect';
import { useCreateMaterial, useUpdateMaterial } from '../../hooks/useMaterials';
import { useLookups } from '../../hooks/useLookups';
import { useCreateMaterialCategory } from '../../hooks/useLookupsMutations';
import { useSiteScope } from '../../hooks/useSiteScope';
import { useToast } from '../../contexts/ToastContext';
import { calculateMaterialTotal, toInputDate } from '../../utils/format';
import { ROLES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULTS = {
  site: '',
  invoiceNumber: '',
  supplierName: '',
  materialName: '',
  category: '',
  quantity: '',
  unit: 'bags',
  rate: '',
  tax: 18,
  transportCharge: 0,
  discount: 0,
  date: toInputDate(new Date()),
  notes: '',
};

export default function MaterialFormModal({ isOpen, onClose, material, defaultSiteId }) {
  const isEdit = !!material;
  const [invoiceFile, setInvoiceFile] = useState(null);
  const { role } = useAuth();
  const { isSuperAdmin } = useSiteScope();
  const { materialCategories, activeSites } = useLookups(defaultSiteId);
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const createMaterialCategory = useCreateMaterialCategory();
  const toast = useToast();

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: DEFAULTS });
  const watched = useWatch({ control });
  const grandTotal = calculateMaterialTotal(watched);

  useEffect(() => {
    if (isOpen) {
      setInvoiceFile(null);
      reset(
        material
          ? {
              ...DEFAULTS,
              site: material.site?._id ?? material.site,
              invoiceNumber: material.invoiceNumber,
              supplierName: material.supplier?.name ?? '',
              materialName: material.materialName,
              category: material.category?._id ?? material.category,
              quantity: material.quantity,
              unit: material.unit,
              rate: material.rate,
              tax: material.tax,
              transportCharge: material.transportCharge ?? 0,
              discount: material.discount ?? 0,
              date: toInputDate(material.date),
              notes: material.notes ?? '',
            }
          : { ...DEFAULTS, site: defaultSiteId ?? '' }
      );
    }
  }, [isOpen, material, defaultSiteId, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, quantity: Number(values.quantity), rate: Number(values.rate), tax: Number(values.tax), transportCharge: Number(values.transportCharge), discount: Number(values.discount) };
      if (isEdit) {
        await updateMaterial.mutateAsync({ id: material._id, payload, invoiceFile });
        toast.success('Material updated.');
      } else {
        await createMaterial.mutateAsync({ payload, invoiceFile });
        toast.success('Material entry added.');
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
      title={isEdit ? 'Edit Material Entry' : 'New Material Entry'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>{isEdit ? 'Save changes' : 'Add material'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {isSuperAdmin && (
            <FormField label="Site" required error={errors.site?.message} className="form-field--full">
              <select className="form-select" {...register('site', { required: 'Site is required' })} disabled={isEdit}>
                <option value="">Select site</option>
                {activeSites.data?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </FormField>
          )}
          {!isSuperAdmin && <input type="hidden" {...register('site', { required: true })} value={defaultSiteId ?? ''} />}

          <FormField label="Material name" required error={errors.materialName?.message}>
            <input className="form-input" {...register('materialName', { required: 'Required' })} />
          </FormField>
          <FormField label="Invoice number" required error={errors.invoiceNumber?.message}>
            <input className="form-input" {...register('invoiceNumber', { required: 'Required' })} />
          </FormField>
          <FormField label="Supplier" required error={errors.supplierName?.message}>
            <input className="form-input" {...register('supplierName', { required: 'Required' })} />
          </FormField>
          <FormField label="Category" required error={errors.category?.message}>
            <Controller
              control={control}
              name="category"
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <CreatableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={materialCategories.data || []}
                  onCreate={(name) => createMaterialCategory.mutateAsync(name)}
                  placeholder="Select or create category..."
                  isLoading={materialCategories.isLoading}
                />
              )}
            />
          </FormField>
          <FormField label="Quantity" required error={errors.quantity?.message}>
            <input type="number" step="0.01" className="form-input" {...register('quantity', { required: 'Required' })} />
          </FormField>
          <FormField label="Unit" required error={errors.unit?.message}>
            <input className="form-input" {...register('unit', { required: 'Required' })} />
          </FormField>
          <FormField label="Rate (₹)" required error={errors.rate?.message}>
            <input type="number" step="0.01" className="form-input" {...register('rate', { required: 'Required' })} />
          </FormField>
          <FormField label="GST (%)" error={errors.tax?.message}>
            <input type="number" className="form-input" {...register('tax')} />
          </FormField>
          <FormField label="Transport charge (₹)" error={errors.transportCharge?.message}>
            <input type="number" className="form-input" {...register('transportCharge')} />
          </FormField>
          <FormField label="Purchase date" required error={errors.date?.message}>
            <DatePickerInput id="material-purchase-date" value={watch('date')} onChange={(value) => setValue('date', value)} placeholder="Purchase date" />
          </FormField>
          <FormField label="Remarks" className="form-field--full" error={errors.notes?.message}>
            <textarea className="form-textarea" {...register('notes')} />
          </FormField>
          <div className="form-field--full">
            <FileUpload label="Invoice upload" accept="image/*,.pdf" value={invoiceFile} onChange={setInvoiceFile} hint="PDF or image, max 10MB" />
            {material?.invoiceUpload?.url && !invoiceFile && (
              <a href={material.invoiceUpload.url} target="_blank" rel="noreferrer" className="link-btn">View current invoice</a>
            )}
          </div>
        </div>
        <div className="module-page__total-preview" style={{ marginTop: 'var(--space-md)' }}>Grand Total: ₹{grandTotal.toLocaleString('en-IN')}</div>
      </form>
    </Drawer>
  );
}
