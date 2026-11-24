import { createSeedDatabase } from '../data/seedData';
import type {
  ActivityItem,
  AnalyticsRange,
  AnalyticsTrendPoint,
  Project,
  ProjectFormInput,
  Task,
  TaskComment,
  TaskFormInput,
  TaskStatus,
  TeamMember,
  WorkspaceDatabase,
} from '../types/domain';
import { buildAnalyticsTrend, moveTaskInList } from '../utils/metrics';

const STORAGE_KEY = 'orbitflow_workspace_db_v1';

export interface OrbitFlowApiConfig {
  mode: 'demo' | 'production';
  baseUrl: string;
}

export const API_CONFIG: OrbitFlowApiConfig = {
  mode: import.meta.env.VITE_API_MODE === 'production' ? 'production' : 'demo',
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
};

let runtimeLatencyMs = 160;
let simulateNextErrorFlag = false;

export function setMockApiBehavior(options: {
  latencyMs?: number;
  simulateNextError?: boolean;
}) {
  if (typeof options.latencyMs === 'number') {
    runtimeLatencyMs = Math.max(0, Math.min(2500, options.latencyMs));
  }
  if (typeof options.simulateNextError === 'boolean') {
    simulateNextErrorFlag = options.simulateNextError;
  }
}

export function getMockApiBehavior() {
  return {
    latencyMs: runtimeLatencyMs,
    simulateNextError: simulateNextErrorFlag,
  };
}

function readDatabase(): WorkspaceDatabase {
  if (typeof window === 'undefined') {
    return createSeedDatabase();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedDatabase();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as WorkspaceDatabase;
    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.members)) {
      const seed = createSeedDatabase();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return createSeedDatabase();
  }
}

function writeDatabase(db: WorkspaceDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors in private browsing sandboxes
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function simulateRequest<T>(operation: () => T): Promise<T> {
  if (runtimeLatencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, runtimeLatencyMs));
  }
  if (simulateNextErrorFlag) {
    simulateNextErrorFlag = false;
    throw new Error(
      'Simulated API error: Unable to reach OrbitFlow workspace endpoint. Click Retry to recover.'
    );
  }
  return operation();
}

function pushActivity(
  db: WorkspaceDatabase,
  activity: Omit<ActivityItem, 'id' | 'timestamp'>
): ActivityItem[] {
  const entry: ActivityItem = {
    ...activity,
    id: generateId('act'),
    timestamp: new Date().toISOString(),
  };
  return [entry, ...db.activities].slice(0, 30);
}

export interface OrbitFlowApiService {
  getProjects(): Promise<Project[]>;
  createProject(input: ProjectFormInput, actorId: string): Promise<Project>;
  updateProject(id: string, input: Partial<ProjectFormInput>, actorId: string): Promise<Project>;
  deleteProject(id: string): Promise<{ id: string }>;

  getTasks(): Promise<Task[]>;
  createTask(input: TaskFormInput, actorId: string): Promise<Task>;
  updateTask(id: string, input: Partial<TaskFormInput>, actorId: string): Promise<Task>;
  moveTask(
    taskId: string,
    targetStatus: TaskStatus,
    targetIndex: number | undefined,
    actorId: string
  ): Promise<Task[]>;
  deleteTask(id: string): Promise<{ id: string }>;

  addComment(taskId: string, body: string, authorId: string): Promise<TaskComment>;
  deleteComment(taskId: string, commentId: string): Promise<{ taskId: string; commentId: string }>;

  getMembers(): Promise<TeamMember[]>;
  getActivities(): Promise<ActivityItem[]>;
  getAnalyticsTrend(range: AnalyticsRange, projectId: string | 'all'): Promise<AnalyticsTrendPoint[]>;
  resetDemoData(): Promise<WorkspaceDatabase>;
}

/**
 * Local Promise-based Demo API Service backed by localStorage.
 * Implements OrbitFlowApiService so a production REST/GraphQL client can be
 * swapped in behind the exact same TanStack Query hooks.
 */
export const mockApi: OrbitFlowApiService = {
  async getProjects() {
    return simulateRequest(() => readDatabase().projects);
  },

  async createProject(input, actorId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const now = new Date().toISOString();
      const project: Project = {
        ...input,
        id: generateId('proj'),
        createdAt: now,
        updatedAt: now,
      };
      const nextDb: WorkspaceDatabase = {
        ...db,
        projects: [project, ...db.projects],
        activities: pushActivity(db, {
          actorId,
          action: 'created project',
          targetTitle: project.name,
          targetType: 'project',
          targetId: project.id,
          projectId: project.id,
        }),
      };
      writeDatabase(nextDb);
      return project;
    });
  },

  async updateProject(id, input, actorId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const existing = db.projects.find((p) => p.id === id);
      if (!existing) throw new Error('Project not found.');
      const updated: Project = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      const nextDb: WorkspaceDatabase = {
        ...db,
        projects: db.projects.map((p) => (p.id === id ? updated : p)),
        activities: pushActivity(db, {
          actorId,
          action: 'updated project',
          targetTitle: updated.name,
          targetType: 'project',
          targetId: updated.id,
          projectId: updated.id,
        }),
      };
      writeDatabase(nextDb);
      return updated;
    });
  },

  async deleteProject(id) {
    return simulateRequest(() => {
      const db = readDatabase();
      const nextDb: WorkspaceDatabase = {
        ...db,
        projects: db.projects.filter((p) => p.id !== id),
        tasks: db.tasks.filter((t) => t.projectId !== id),
        activities: db.activities.filter((a) => a.projectId !== id),
      };
      writeDatabase(nextDb);
      return { id };
    });
  },

  async getTasks() {
    return simulateRequest(() => readDatabase().tasks);
  },

  async createTask(input, actorId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const project = db.projects.find((p) => p.id === input.projectId);
      const prefix = project?.key ?? 'TSK';
      const existingCodes = db.tasks
        .filter((t) => t.projectId === input.projectId)
        .map((t) => Number(t.code.split('-')[1]) || 100);
      const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 101;
      const columnCount = db.tasks.filter((t) => t.status === input.status).length;
      const now = new Date().toISOString();

      const task: Task = {
        ...input,
        id: generateId('task'),
        code: `${prefix}-${nextNum}`,
        order: columnCount,
        createdAt: now,
        updatedAt: now,
        completedAt: input.status === 'done' ? now : null,
        comments: [],
      };

      const nextDb: WorkspaceDatabase = {
        ...db,
        tasks: [...db.tasks, task],
        activities: pushActivity(db, {
          actorId,
          action: 'created task',
          targetTitle: task.title,
          targetType: 'task',
          targetId: task.id,
          projectId: task.projectId,
        }),
      };
      writeDatabase(nextDb);
      return task;
    });
  },

  async updateTask(id, input, actorId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const existing = db.tasks.find((t) => t.id === id);
      if (!existing) throw new Error('Task not found.');
      const now = new Date().toISOString();
      const nextStatus = input.status ?? existing.status;
      const updated: Task = {
        ...existing,
        ...input,
        updatedAt: now,
        completedAt:
          nextStatus === 'done'
            ? existing.completedAt ?? now
            : null,
      };
      const nextDb: WorkspaceDatabase = {
        ...db,
        tasks: db.tasks.map((t) => (t.id === id ? updated : t)),
        activities: pushActivity(db, {
          actorId,
          action: input.status && input.status !== existing.status ? 'moved' : 'updated',
          targetTitle: updated.title,
          targetType: 'task',
          targetId: updated.id,
          projectId: updated.projectId,
        }),
      };
      writeDatabase(nextDb);
      return updated;
    });
  },

  async moveTask(taskId, targetStatus, targetIndex, actorId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const existing = db.tasks.find((t) => t.id === taskId);
      if (!existing) throw new Error('Task not found.');
      const nextTasks = moveTaskInList(db.tasks, taskId, targetStatus, targetIndex);
      const statusChanged = existing.status !== targetStatus;
      const nextDb: WorkspaceDatabase = {
        ...db,
        tasks: nextTasks,
        activities: statusChanged
          ? pushActivity(db, {
              actorId,
              action: `moved to ${targetStatus.replace('_', ' ')}`,
              targetTitle: existing.title,
              targetType: 'task',
              targetId: existing.id,
              projectId: existing.projectId,
            })
          : db.activities,
      };
      writeDatabase(nextDb);
      return nextTasks;
    });
  },

  async deleteTask(id) {
    return simulateRequest(() => {
      const db = readDatabase();
      const nextDb: WorkspaceDatabase = {
        ...db,
        tasks: db.tasks.filter((t) => t.id !== id),
      };
      writeDatabase(nextDb);
      return { id };
    });
  },

  async addComment(taskId, body, authorId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found.');
      const comment: TaskComment = {
        id: generateId('cmt'),
        taskId,
        authorId,
        body: body.trim(),
        createdAt: new Date().toISOString(),
      };
      const updatedTasks = db.tasks.map((t) =>
        t.id === taskId
          ? { ...t, updatedAt: comment.createdAt, comments: [...t.comments, comment] }
          : t
      );
      const nextDb: WorkspaceDatabase = {
        ...db,
        tasks: updatedTasks,
        activities: pushActivity(db, {
          actorId: authorId,
          action: 'commented on',
          targetTitle: task.title,
          targetType: 'comment',
          targetId: task.id,
          projectId: task.projectId,
        }),
      };
      writeDatabase(nextDb);
      return comment;
    });
  },

  async deleteComment(taskId, commentId) {
    return simulateRequest(() => {
      const db = readDatabase();
      const updatedTasks = db.tasks.map((t) =>
        t.id === taskId
          ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) }
          : t
      );
      writeDatabase({ ...db, tasks: updatedTasks });
      return { taskId, commentId };
    });
  },

  async getMembers() {
    return simulateRequest(() => readDatabase().members);
  },

  async getActivities() {
    return simulateRequest(() => readDatabase().activities);
  },

  async getAnalyticsTrend(range, projectId) {
    return simulateRequest(() => buildAnalyticsTrend(readDatabase().tasks, range, projectId));
  },

  async resetDemoData() {
    return simulateRequest(() => {
      const fresh = createSeedDatabase();
      writeDatabase(fresh);
      return fresh;
    });
  },
};
