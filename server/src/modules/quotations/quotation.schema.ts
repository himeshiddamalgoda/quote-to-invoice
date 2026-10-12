import { z } from 'zod';
// Decimal inputs arrive as strings, never JSON floating point numbers.
const decimal = (places: number, integers: number) =>
  z
    .string()
    .regex(
      new RegExp(`^(0|[1-9]\\d{0,${integers - 1}})(\\.\\d{1,${places}})?$`),
      'Invalid decimal precision or range',
    );
export const quotationItemSchema = z.strictObject({
  productId: z.uuid().optional(),
  description: z.string().trim().min(1).max(2000),
  unit: z.string().trim().min(1).max(30),
  quantity: decimal(4, 11).refine((value) => /[1-9]/.test(value), 'Quantity must be positive'),
  unitPrice: decimal(4, 15),
  discountAmount: decimal(2, 17).default('0'),
});
export const commercialInputSchema = z.strictObject({
  // Initial supported currencies all use two decimal minor units.
  currency: z.enum(['USD', 'EUR', 'GBP', 'LKR']),
  items: z.array(quotationItemSchema).min(1).max(200),
  discountAmount: decimal(2, 17).default('0'),
  taxRate: decimal(4, 3),
});
export type CommercialInput = z.infer<typeof commercialInputSchema>;
// Future create/update boundaries compose these fields; status and totals are never accepted.
