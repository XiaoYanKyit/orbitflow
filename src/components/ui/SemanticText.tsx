import {
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
} from '../../types/domain';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-slate-500 dark:text-slate-400',
  medium: 'text-indigo-700 dark:text-indigo-300',
  high: 'text-amber-700 dark:text-amber-400',
  urgent: 'text-red-700 dark:text-red-400 font-semibold',
};

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'text-emerald-700 dark:text-emerald-400',
  at_risk: 'text-amber-700 dark:text-amber-400',
  on_hold: 'text-slate-600 dark:text-slate-400',
  completed: 'text-indigo-700 dark:text-indigo-300',
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'text-slate-600 dark:text-slate-400',
  in_progress: 'text-indigo-700 dark:text-indigo-300',
  review: 'text-amber-700 dark:text-amber-400',
  done: 'text-emerald-700 dark:text-emerald-400',
};

export function PriorityText({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${PRIORITY_COLORS[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function ProjectStatusText({ status }: { status: ProjectStatus }) {
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${PROJECT_STATUS_COLORS[status]}`}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function TaskStatusText({ status }: { status: TaskStatus }) {
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${TASK_STATUS_COLORS[status]}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
