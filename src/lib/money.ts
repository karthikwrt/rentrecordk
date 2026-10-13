const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(amount: number) {
  return formatter.format(amount);
}

/** Parses user input like "12,500" or "₹ 12500.50"; returns NaN when invalid. */
export function parseAmount(text: string) {
  const cleaned = text.replace(/[₹,\s]/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}
