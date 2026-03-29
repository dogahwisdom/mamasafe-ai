/**
 * Canonical labels for stored payment_method values (workflow + exports).
 * Includes legacy `nhif` rows migrated from older schemas.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  card: 'Card',
  insurance: 'Insurance',
  shif: 'SHIF (Social Health Insurance Fund)',
  nhif: 'SHIF (Social Health Insurance Fund)',
  waiver: 'Waiver',
};

export function formatPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
