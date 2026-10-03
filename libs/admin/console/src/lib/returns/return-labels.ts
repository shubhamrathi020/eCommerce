import type { ReturnStatus } from '@ecom/shared/models';
import type { BadgeTone } from '@ecom/shared/ui';

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  picked_up: 'Picked up',
  checked: 'Checked',
  refunded: 'Refunded',
  rejected: 'Rejected',
};

export const returnTone = (status: ReturnStatus): BadgeTone => (status === 'refunded' ? 'success' : status === 'rejected' ? 'danger' : status === 'requested' ? 'warning' : 'primary');
