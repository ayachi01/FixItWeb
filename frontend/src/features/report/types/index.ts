export interface Report {
  id: string;
  title: string;
  type: ReportType;
  room: string;
  dateAssigned: Date;
  progress: ProgressStatus;
  user: string;
  description?: string;
  priority?: Priority;
}

export const ReportType = {
  MAINTENANCE: 'Maintenance',
  CLEANING: 'Cleaning',
  SECURITY: 'Security',
  TECHNICAL: 'Technical',
  GENERAL: 'General'
} as const;

export type ReportType = typeof ReportType[keyof typeof ReportType];

export const ProgressStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled'
} as const;

export type ProgressStatus = typeof ProgressStatus[keyof typeof ProgressStatus];

export const Priority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

export interface ReportFilters {
  type?: ReportType;
  progress?: ProgressStatus;
  priority?: Priority;
  room?: string;
  user?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
