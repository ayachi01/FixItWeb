import type { Report } from '../types';
import { ReportType, ProgressStatus, Priority } from '../types';

export const mockReports: Report[] = [
  {
    id: '1',
    title: 'HVAC System Maintenance',
    type: ReportType.MAINTENANCE,
    room: 'Conference Room A',
    dateAssigned: new Date('2024-01-15'),
    progress: ProgressStatus.IN_PROGRESS,
    user: 'John Smith',
    description: 'Air conditioning unit needs filter replacement and system check',
    priority: Priority.MEDIUM
  },
  {
    id: '2',
    title: 'Deep Cleaning Required',
    type: ReportType.CLEANING,
    room: 'Kitchen Area',
    dateAssigned: new Date('2024-01-14'),
    progress: ProgressStatus.PENDING,
    user: 'Sarah Johnson',
    description: 'Kitchen requires deep cleaning after renovation work',
    priority: Priority.HIGH
  },
  {
    id: '3',
    title: 'Security Camera Installation',
    type: ReportType.SECURITY,
    room: 'Main Entrance',
    dateAssigned: new Date('2024-01-13'),
    progress: ProgressStatus.COMPLETED,
    user: 'Mike Davis',
    description: 'New security camera system installed and operational',
    priority: Priority.HIGH
  },
  {
    id: '4',
    title: 'Network Connectivity Issues',
    type: ReportType.TECHNICAL,
    room: 'IT Department',
    dateAssigned: new Date('2024-01-12'),
    progress: ProgressStatus.ON_HOLD,
    user: 'Lisa Chen',
    description: 'Intermittent network connectivity in IT department',
    priority: Priority.URGENT
  },
  {
    id: '5',
    title: 'General Office Supplies',
    type: ReportType.GENERAL,
    room: 'Supply Room',
    dateAssigned: new Date('2024-01-11'),
    progress: ProgressStatus.COMPLETED,
    user: 'Robert Wilson',
    description: 'Restocked office supplies and organized storage',
    priority: Priority.LOW
  },
  {
    id: '6',
    title: 'Plumbing Repair',
    type: ReportType.MAINTENANCE,
    room: 'Restroom B',
    dateAssigned: new Date('2024-01-10'),
    progress: ProgressStatus.IN_PROGRESS,
    user: 'David Brown',
    description: 'Leaking faucet in restroom needs repair',
    priority: Priority.MEDIUM
  },
  {
    id: '7',
    title: 'Window Cleaning',
    type: ReportType.CLEANING,
    room: 'Executive Office',
    dateAssigned: new Date('2024-01-09'),
    progress: ProgressStatus.PENDING,
    user: 'Emma Thompson',
    description: 'Windows need professional cleaning service',
    priority: Priority.LOW
  },
  {
    id: '8',
    title: 'Fire Alarm System Test',
    type: ReportType.SECURITY,
    room: 'Building Wide',
    dateAssigned: new Date('2024-01-08'),
    progress: ProgressStatus.COMPLETED,
    user: 'James Anderson',
    description: 'Monthly fire alarm system test completed successfully',
    priority: Priority.HIGH
  }
];
