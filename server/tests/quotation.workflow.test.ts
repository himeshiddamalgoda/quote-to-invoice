import { describe, expect, it } from 'vitest';
import {
  nextQuotationStatus,
  transitions,
  quotationStatusSchema,
  assertProformaEligible,
} from '../src/modules/quotations/quotation.workflow.js';
describe('quotation workflow', () => {
  for (const [action, transition] of Object.entries(transitions)) {
    for (const status of quotationStatusSchema.options) {
      it(`${action} from ${status}`, () => {
        const execute = () => nextQuotationStatus(status, action as keyof typeof transitions);
        if ((transition.from as string[]).includes(status)) expect(execute()).toBe(transition.to);
        else expect(execute).toThrow(/Cannot/);
      });
    }
  }
  it('only generates proformas from accepted quotations', () => {
    for (const status of quotationStatusSchema.options) {
      if (status === 'CUSTOMER_ACCEPTED')
        expect(() => assertProformaEligible(status)).not.toThrow();
      else expect(() => assertProformaEligible(status)).toThrow();
    }
  });
});
