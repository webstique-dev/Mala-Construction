/** Material grand total: (qty × rate) + GST% + transport − discount% */
function calculateMaterialTotal({ quantity, rate, tax = 0, discount = 0, transportCharge = 0 }) {
  const subtotal = quantity * rate;
  const gstAmount = subtotal * (tax / 100);
  const discountAmount = subtotal * (discount / 100);
  const totalAmount = subtotal + gstAmount + transportCharge - discountAmount;
  return Math.round(totalAmount * 100) / 100;
}

/** Worker payment net: (days × wage) + overtime + bonus − advance − deduction */
function calculateNetSalary({ workingDays, dailyWage, overtimeAmount = 0, bonus = 0, advance = 0, deduction = 0 }) {
  const gross = workingDays * dailyWage + overtimeAmount + bonus;
  const netSalary = gross - advance - deduction;
  return Math.round(netSalary * 100) / 100;
}

module.exports = { calculateMaterialTotal, calculateNetSalary };
