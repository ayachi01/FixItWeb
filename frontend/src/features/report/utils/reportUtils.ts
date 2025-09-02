import { format } from 'date-fns';
import type { ProgressStatus } from '../types';

export const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

export const getProgressBadgeVariant = (progress: ProgressStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (progress) {
    case 'Completed':
      return 'default';
    case 'In Progress':
      return 'secondary';
    case 'Pending':
      return 'outline';
    case 'On Hold':
      return 'destructive';
    case 'Cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const getProgressColor = (progress: ProgressStatus): string => {
  switch (progress) {
    case 'Completed':
      return 'text-green-600';
    case 'In Progress':
      return 'text-blue-600';
    case 'Pending':
      return 'text-yellow-600';
    case 'On Hold':
      return 'text-red-600';
    case 'Cancelled':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};
