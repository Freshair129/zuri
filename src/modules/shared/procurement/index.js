/**
 * Procurement Module — PO lifecycle, supplier management, goods received
 * @module shared/procurement
 */

export const MODULE_NAME = 'procurement'

export const PO_STATUSES = ['DRAFT', 'APPROVED', 'ORDERED', 'RECEIVING', 'RECEIVED', 'PARTIAL', 'CLOSED', 'CANCELLED']
export const PR_STATUSES = ['DRAFT', 'REQUEST_REVIEW', 'APPROVED', 'REJECTED']
export const ISSUE_TYPES = ['OUT_OF_STOCK', 'WRONG_ITEM', 'PRICE_CHANGE', 'LATE_DELIVERY', 'QUALITY_ISSUE']
export const PAYMENT_TERMS = ['NET_7', 'NET_14', 'NET_30', 'COD']
export const GRN_STATUSES = ['DRAFT', 'CONFIRMED']
