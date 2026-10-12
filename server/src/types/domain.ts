export const roles = ['ADMIN', 'SALES', 'MANAGER', 'FINANCE', 'VIEWER'] as const;
export type Role = (typeof roles)[number];
export type DocumentKind = 'QT' | 'PI';
export type ProformaStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';
export type ApprovalAction = 'APPROVED' | 'REJECTED';
export type AuditAction =
  | 'QUOTATION_CREATED'
  | 'QUOTATION_UPDATED'
  | 'QUOTATION_SUBMITTED'
  | 'QUOTATION_APPROVED'
  | 'QUOTATION_REJECTED'
  | 'QUOTATION_REOPENED'
  | 'QUOTATION_SENT'
  | 'CUSTOMER_ACCEPTED'
  | 'CUSTOMER_REJECTED'
  | 'QUOTATION_EXPIRED'
  | 'PROFORMA_CREATED'
  | 'PROFORMA_ISSUED'
  | 'PROFORMA_CANCELLED';
