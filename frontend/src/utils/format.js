const DATE_FALLBACK = '—';
const DATE_INPUT_FALLBACK = '';

export function parseDate(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }

  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount ?? 0);
}

export function formatDate(date) {
  const parsed = parseDate(date);
  return parsed ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : DATE_FALLBACK;
}

export function formatDateTime(date) {
  const parsed = parseDate(date);
  return parsed ? parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : DATE_FALLBACK;
}

export function toInputDate(date) {
  const parsed = parseDate(date);
  return parsed ? parsed.toISOString().slice(0, 10) : DATE_INPUT_FALLBACK;
}

export function calculateMaterialTotal({ quantity, rate, tax = 0, transportCharge = 0, discount = 0 }) {
  const subtotal = Number(quantity) * Number(rate);
  const gstAmount = subtotal * (Number(tax) / 100);
  const discountAmount = subtotal * (Number(discount) / 100);
  return Math.round((subtotal + gstAmount + Number(transportCharge) - discountAmount) * 100) / 100;
}

export function calculateNetSalary({ workingDays, dailyWage, overtimeAmount = 0, bonus = 0, advance = 0, deduction = 0 }) {
  const gross = Number(workingDays) * Number(dailyWage) + Number(overtimeAmount) + Number(bonus);
  return Math.round((gross - Number(advance) - Number(deduction)) * 100) / 100;
}

export function buildFormData(fields, fileField, file) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value);
  });
  if (file) formData.append(fileField, file);
  return formData;
}
