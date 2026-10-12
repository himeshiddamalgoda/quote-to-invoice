import { z } from 'zod';
import { AppError } from '../../utils/app-error.js';
export const quotationStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SENT_TO_CUSTOMER',
  'CUSTOMER_ACCEPTED',
  'CUSTOMER_REJECTED',
  'EXPIRED',
]);
export type QuotationStatus = z.infer<typeof quotationStatusSchema>;
export const transitions = {
  submit: { from: ['DRAFT'], to: 'PENDING_APPROVAL' },
  approve: { from: ['PENDING_APPROVAL'], to: 'APPROVED' },
  reject: { from: ['PENDING_APPROVAL'], to: 'REJECTED' },
  reopen: { from: ['REJECTED'], to: 'DRAFT' },
  send: { from: ['APPROVED'], to: 'SENT_TO_CUSTOMER' },
  customerAccept: { from: ['SENT_TO_CUSTOMER'], to: 'CUSTOMER_ACCEPTED' },
  customerReject: { from: ['SENT_TO_CUSTOMER'], to: 'CUSTOMER_REJECTED' },
  expire: { from: ['PENDING_APPROVAL', 'APPROVED', 'SENT_TO_CUSTOMER'], to: 'EXPIRED' },
} satisfies Record<string, { from: QuotationStatus[]; to: QuotationStatus }>;
export type QuotationAction = keyof typeof transitions;
export function nextQuotationStatus(
  status: QuotationStatus,
  action: QuotationAction,
): QuotationStatus {
  const transition: { from: QuotationStatus[]; to: QuotationStatus } = transitions[action];
  if (!transition.from.includes(status))
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot ${action} a quotation in ${status}.`);
  return transition.to;
}
export function assertProformaEligible(status: QuotationStatus) {
  if (status !== 'CUSTOMER_ACCEPTED')
    throw new AppError(
      409,
      'PROFORMA_NOT_ELIGIBLE',
      'Only accepted quotations can generate a proforma invoice.',
    );
}
// Pure rules are used by future services alongside roles, dates, item checks, and transactions.
