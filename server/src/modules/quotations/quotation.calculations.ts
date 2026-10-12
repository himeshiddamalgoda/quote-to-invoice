import { Decimal } from 'decimal.js';
import { AppError } from '../../utils/app-error.js';
import { commercialInputSchema, type CommercialInput } from './quotation.schema.js';
const Money = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });
const round = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const maximum = new Money('99999999999999999.99');
function amount(value: Decimal): string {
  if (value.isNegative() || value.greaterThan(maximum))
    throw new AppError(422, 'INVALID_AMOUNT', 'Calculated amount exceeds supported range.');
  return value.toFixed(2);
}
export function calculateQuotation(input: CommercialInput) {
  const parsed = commercialInputSchema.parse(input);
  const items = parsed.items.map((item) => {
    const gross = round(new Money(item.quantity).times(item.unitPrice));
    const discount = new Money(item.discountAmount);
    if (discount.greaterThan(gross))
      throw new AppError(422, 'INVALID_DISCOUNT', 'Line discount exceeds line amount.');
    return { ...item, lineTotal: amount(gross.minus(discount)) };
  });
  const subtotal = items.reduce((sum, item) => sum.plus(item.lineTotal), new Money(0));
  const discount = new Money(parsed.discountAmount);
  if (discount.greaterThan(subtotal))
    throw new AppError(422, 'INVALID_DISCOUNT', 'Overall discount exceeds subtotal.');
  const taxable = subtotal.minus(discount);
  const rate = new Money(parsed.taxRate);
  if (rate.greaterThan(100))
    throw new AppError(422, 'INVALID_TAX', 'Tax rate must be between 0 and 100.');
  const tax = round(taxable.times(rate).dividedBy(100));
  return {
    currency: parsed.currency,
    items,
    subtotal: amount(subtotal),
    discountAmount: amount(discount),
    taxRate: rate.toFixed(4),
    taxAmount: amount(tax),
    total: amount(taxable.plus(tax)),
  };
}
