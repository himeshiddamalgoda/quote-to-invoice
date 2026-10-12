import { describe, expect, it } from 'vitest';
import { calculateQuotation } from '../src/modules/quotations/quotation.calculations.js';
const base = {
  currency: 'USD' as const,
  items: [
    { description: 'Service', unit: 'hour', quantity: '3', unitPrice: '0.1', discountAmount: '0' },
  ],
  discountAmount: '0',
  taxRate: '0',
};
describe('quotation money', () => {
  it('avoids binary floating point artifacts', () => {
    expect(calculateQuotation(base).total).toBe('0.30');
  });
  it('rounds half up at line level before summing', () => {
    expect(
      calculateQuotation({
        ...base,
        items: [
          { ...base.items[0]!, quantity: '1', unitPrice: '0.005' },
          { ...base.items[0]!, quantity: '1', unitPrice: '0.005' },
        ],
      }).total,
    ).toBe('0.02');
  });
  it('applies line discounts, overall discount, then tax', () => {
    const result = calculateQuotation({
      ...base,
      items: [{ ...base.items[0]!, quantity: '2', unitPrice: '100', discountAmount: '10' }],
      discountAmount: '20',
      taxRate: '10',
    });
    expect(result).toMatchObject({ subtotal: '190.00', taxAmount: '17.00', total: '187.00' });
  });
  it('rejects discounts greater than the amount', () => {
    expect(() => calculateQuotation({ ...base, discountAmount: '1' })).toThrow(/discount/);
    expect(() =>
      calculateQuotation({ ...base, items: [{ ...base.items[0]!, discountAmount: '1' }] }),
    ).toThrow(/discount/);
  });
  it('rejects zero quantity, excess precision, and out of range tax', () => {
    expect(() =>
      calculateQuotation({ ...base, items: [{ ...base.items[0]!, quantity: '0' }] }),
    ).toThrow();
    expect(() =>
      calculateQuotation({ ...base, items: [{ ...base.items[0]!, unitPrice: '0.00001' }] }),
    ).toThrow();
    expect(() => calculateQuotation({ ...base, taxRate: '101' })).toThrow();
  });
  it('rejects financial overflow', () => {
    expect(() =>
      calculateQuotation({
        ...base,
        items: [{ ...base.items[0]!, quantity: '99999999999', unitPrice: '999999999999999' }],
      }),
    ).toThrow(/range/);
  });
});
