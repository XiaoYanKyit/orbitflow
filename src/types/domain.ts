export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ProjectStatus = 'active' | 'at_risk' | 'on_hold' | 'completed';

export type AnalyticsRange = '7d' | '30d' | '90d';

export type ThemeMode = 'light' | 'dark' | 'system';

export type DensityMode = 'comfortable' | 'compact';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: 'Product' | 'Engineering' | 'Design' | 'Operations';
  email: string;
  location: string;
  avatarUrl: string;
  weeklyCapacityHours: number;
  availability: 'Available' | 'Focused' | 'In Review';
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: TaskPriority;
  leadId: string;
  memberIds: string[];
  targetDate: string; // ISO YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  category: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Task {
  id: string;
  code: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string; // ISO YYYY-MM-DD
  estimatedHours: number;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  comments: TaskComment[];
}

export interface ActivityItem {
  id: string;
  actorId: string;
  action: string;
  targetTitle: string;
  targetType: 'task' | 'project' | 'comment';
  targetId: string;
  projectId?: string;
  timestamp: string;
}

export interface WorkspaceDatabase {
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  activities: ActivityItem[];
}

export interface ProjectFormInput {
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  priority: TaskPriority;
  leadId: string;
  memberIds: string[];
  targetDate: string;
  category: string;
}

export interface TaskFormInput {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string;
  estimatedHours: number;
  tags: string[];
}

export interface WorkspaceProfilePreferences {
  displayName: string;
  roleTitle: string;
  email: string;
  weeklyDigest: boolean;
  deadlineReminders: boolean;
  mentionAlerts: boolean;
  defaultProjectView: 'grid' | 'table';
}

export interface AnalyticsTrendPoint {
  label: string;
  completed: number;
  created: number;
  inReview: number;
}

export interface MemberWorkloadSummary {
  member: TeamMember;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  allocatedHours: number;
  utilizationPercent: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const TASK_STATUS_COLUMNS: ReadonlyArray<{
  id: TaskStatus;
  label: string;
  description: string;
}> = [
  { id: 'backlog', label: 'Backlog', description: 'Scoped and queued for upcoming sprints' },
  { id: 'in_progress', label: 'In Progress', description: 'Actively being designed or built' },
  { id: 'review', label: 'Review', description: 'In code review, QA, or stakeholder sign-off' },
  { id: 'done', label: 'Done', description: 'Verified and shipped to production' },
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'On Track',
  at_risk: 'At Risk',
  on_hold: 'On Hold',
  completed: 'Completed',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};
