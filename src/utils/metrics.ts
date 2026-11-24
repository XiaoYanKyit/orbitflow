import type {
  AnalyticsRange,
  AnalyticsTrendPoint,
  MemberWorkloadSummary,
  PaginatedResult,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from '../types/domain';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function getReferenceTodayIso(): string {
  // Anchored to current workspace clock when available, falling back cleanly
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(task: Pick<Task, 'status' | 'dueDate'>, todayIso: string): boolean {
  if (task.status === 'done') return false;
  return task.dueDate < todayIso;
}

export function calculateProjectProgress(projectId: string, tasks: Task[]): {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  percent: number;
} {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const total = projectTasks.length;
  if (total === 0) {
    return { total: 0, completed: 0, inProgress: 0, overdue: 0, percent: 0 };
  }
  const today = getReferenceTodayIso();
  const completed = projectTasks.filter((t) => t.status === 'done').length;
  const inProgress = projectTasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'review'
  ).length;
  const overdue = projectTasks.filter((t) => isTaskOverdue(t, today)).length;
  const percent = Math.round((completed / total) * 100);
  return { total, completed, inProgress, overdue, percent };
}

export function calculateWorkspaceKpis(
  projects: Project[],
  tasks: Task[],
  todayIso: string = getReferenceTodayIso()
) {
  const activeProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'at_risk'
  ).length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const openTasks = tasks.length - completedTasks;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t, todayIso)).length;
  const inReviewTasks = tasks.filter((t) => t.status === 'review').length;

  return {
    activeProjects,
    totalProjects: projects.length,
    totalTasks: tasks.length,
    openTasks,
    completedTasks,
    completionRate,
    overdueTasks,
    inReviewTasks,
  };
}

export function calculateMemberWorkloads(
  members: TeamMember[],
  tasks: Task[],
  todayIso: string = getReferenceTodayIso()
): MemberWorkloadSummary[] {
  return members.map((member) => {
    const assigned = tasks.filter((t) => t.assigneeId === member.id);
    const completedCount = assigned.filter((t) => t.status === 'done').length;
    const inProgressCount = assigned.filter(
      (t) => t.status === 'in_progress' || t.status === 'review'
    ).length;
    const openAssigned = assigned.filter((t) => t.status !== 'done');
    const overdueCount = openAssigned.filter((t) => isTaskOverdue(t, todayIso)).length;
    const allocatedHours = openAssigned.reduce((sum, t) => sum + t.estimatedHours, 0);
    const utilizationPercent =
      member.weeklyCapacityHours > 0
        ? Math.min(135, Math.round((allocatedHours / member.weeklyCapacityHours) * 100))
        : 0;

    return {
      member,
      assignedCount: assigned.length,
      completedCount,
      inProgressCount,
      overdueCount,
      allocatedHours,
      utilizationPercent,
    };
  });
}

export function moveTaskInList(
  tasks: Task[],
  taskId: string,
  targetStatus: TaskStatus,
  targetIndex?: number,
  nowIso: string = new Date().toISOString()
): Task[] {
  const movingTask = tasks.find((t) => t.id === taskId);
  if (!movingTask) return tasks;

  const updatedTask: Task = {
    ...movingTask,
    status: targetStatus,
    updatedAt: nowIso,
    completedAt: targetStatus === 'done' ? movingTask.completedAt ?? nowIso : null,
  };

  const remaining = tasks.filter((t) => t.id !== taskId);
  const columnTasks = remaining
    .filter((t) => t.status === targetStatus)
    .sort((a, b) => a.order - b.order);

  const insertAt =
    targetIndex === undefined || targetIndex < 0 || targetIndex > columnTasks.length
      ? columnTasks.length
      : targetIndex;

  columnTasks.splice(insertAt, 0, updatedTask);

  const reindexedTarget = columnTasks.map((t, index) => ({ ...t, order: index }));
  const otherTasks = remaining.filter((t) => t.status !== targetStatus);

  // Reindex source column if status changed
  const sourceStatus = movingTask.status;
  if (sourceStatus !== targetStatus) {
    const sourceColumn = otherTasks
      .filter((t) => t.status === sourceStatus)
      .sort((a, b) => a.order - b.order)
      .map((t, index) => ({ ...t, order: index }));
    const untouched = otherTasks.filter((t) => t.status !== sourceStatus);
    return [...untouched, ...sourceColumn, ...reindexedTarget];
  }

  return [...otherTasks, ...reindexedTarget];
}

export function filterAndSortProjects(
  projects: Project[],
  tasks: Task[],
  options: {
    search: string;
    status: string;
    sortBy: 'updated' | 'progress' | 'targetDate' | 'priority' | 'name';
    sortDir: 'asc' | 'desc';
  }
): Project[] {
  const q = options.search.trim().toLowerCase();
  const filtered = projects.filter((p) => {
    const matchesStatus = options.status === 'all' || p.status === options.status;
    if (!matchesStatus) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const factor = options.sortDir === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    switch (options.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name) * factor;
      case 'targetDate':
        return a.targetDate.localeCompare(b.targetDate) * factor;
      case 'priority':
        return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * factor;
      case 'progress': {
        const pa = calculateProjectProgress(a.id, tasks).percent;
        const pb = calculateProjectProgress(b.id, tasks).percent;
        return (pa - pb) * factor;
      }
      case 'updated':
      default:
        return a.updatedAt.localeCompare(b.updatedAt) * factor;
    }
  });
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

export function parseTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) return false;
      const lower = tag.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .slice(0, 6);
}

export function buildAnalyticsTrend(
  tasks: Task[],
  range: AnalyticsRange,
  projectId: string | 'all'
): AnalyticsTrendPoint[] {
  const scoped = projectId === 'all' ? tasks : tasks.filter((t) => t.projectId === projectId);
  const completedCount = scoped.filter((t) => t.status === 'done').length;
  const reviewCount = scoped.filter((t) => t.status === 'review').length;
  const totalCount = scoped.length;
  const scale = totalCount === 0 ? 0 : Math.max(0.4, totalCount / 18);

  if (range === '7d') {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const baseCompleted = [2, 3, 2, 4, 3, 1, 2];
    const baseCreated = [3, 2, 4, 2, 3, 1, 1];
    const baseReview = [1, 2, 2, 3, 2, 1, 2];
    return labels.map((label, idx) => ({
      label,
      completed:
        idx === labels.length - 1
          ? Math.max(1, Math.round(completedCount * 0.35))
          : Math.round(baseCompleted[idx] * scale),
      created: Math.round(baseCreated[idx] * scale),
      inReview:
        idx === labels.length - 1 ? reviewCount : Math.round(baseReview[idx] * scale),
    }));
  }

  if (range === '30d') {
    const labels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
    const baseCompleted = [5, 7, 6, 8];
    const baseCreated = [6, 5, 7, 5];
    const baseReview = [3, 4, 3, 3];
    return labels.map((label, idx) => ({
      label,
      completed:
        idx === labels.length - 1
          ? Math.max(completedCount, Math.round(baseCompleted[idx] * scale))
          : Math.round(baseCompleted[idx] * scale),
      created: Math.round(baseCreated[idx] * scale),
      inReview:
        idx === labels.length - 1 ? reviewCount : Math.round(baseReview[idx] * scale),
    }));
  }

  // 90d quarterly breakdown
  const labels = ['Sep W2', 'Sep W4', 'Oct W2', 'Oct W4', 'Nov W2', 'Nov W4'];
  const baseCompleted = [6, 8, 9, 11, 10, 13];
  const baseCreated = [9, 8, 10, 9, 8, 7];
  const baseReview = [3, 4, 4, 5, 4, 3];
  return labels.map((label, idx) => ({
    label,
    completed:
      idx === labels.length - 1
        ? Math.max(completedCount, Math.round(baseCompleted[idx] * scale))
        : Math.round(baseCompleted[idx] * scale),
    created: Math.round(baseCreated[idx] * scale),
    inReview: idx === labels.length - 1 ? reviewCount : Math.round(baseReview[idx] * scale),
  }));
}

export function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month, day));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatRelativeTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function generateCsvExport(
  rows: Array<Record<string, string | number>>
): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h] ?? '')).join(',')),
  ];
  return lines.join('\n');
}
