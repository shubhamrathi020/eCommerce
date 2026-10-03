import type { BadgeTone } from '@ecom/shared/ui';
import type { ReturnStatus } from '@ecom/contracts';

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  picked_up: 'Picked up',
  checked: 'Checked',
  refunded: 'Refunded',
  rejected: 'Not accepted',
};

export const returnTone = (status: ReturnStatus): BadgeTone => (status === 'refunded' ? 'success' : status === 'rejected' ? 'danger' : status === 'requested' ? 'neutral' : 'primary');
