import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockApi } from '../services/mockApi';
import { useAppStore } from '../store/useAppStore';
import type {
  AnalyticsRange,
  Project,
  ProjectFormInput,
  Task,
  TaskFormInput,
  TaskStatus,
} from '../types/domain';
import { moveTaskInList } from '../utils/metrics';

export const orbitKeys = {
  projects: ['projects'] as const,
  tasks: ['tasks'] as const,
  members: ['members'] as const,
  activities: ['activities'] as const,
  analytics: (range: AnalyticsRange, projectId: string) =>
    ['analytics', range, projectId] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: orbitKeys.projects,
    queryFn: () => mockApi.getProjects(),
  });
}

export function useTasks() {
  return useQuery({
    queryKey: orbitKeys.tasks,
    queryFn: () => mockApi.getTasks(),
  });
}

export function useMembers() {
  return useQuery({
    queryKey: orbitKeys.members,
    queryFn: () => mockApi.getMembers(),
  });
}

export function useActivities() {
  return useQuery({
    queryKey: orbitKeys.activities,
    queryFn: () => mockApi.getActivities(),
  });
}

export function useAnalyticsTrend(range: AnalyticsRange, projectId: string | 'all') {
  return useQuery({
    queryKey: orbitKeys.analytics(range, projectId),
    queryFn: () => mockApi.getAnalyticsTrend(range, projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const actorId = useAppStore((s) => s.currentUserId);
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: (input: ProjectFormInput) => mockApi.createProject(input, actorId),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.projects });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      addToast({
        title: 'Project created',
        description: `${project.name} (${project.key}) is ready for tasks.`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      addToast({ title: 'Could not create project', description: err.message, variant: 'error' });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const actorId = useAppStore((s) => s.currentUserId);
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProjectFormInput> }) =>
      mockApi.updateProject(id, input, actorId),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.projects });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      addToast({
        title: 'Project updated',
        description: `Saved changes to ${project.name}.`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      addToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: (id: string) => mockApi.deleteProject(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orbitKeys.projects });
      const previousProjects = queryClient.getQueryData<Project[]>(orbitKeys.projects);
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          orbitKeys.projects,
          previousProjects.filter((p) => p.id !== id)
        );
      }
      return { previousProjects };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.projects });
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      addToast({
        title: 'Project deleted',
        description: 'Project and its linked tasks were removed from the workspace.',
        variant: 'info',
      });
    },
    onError: (err: Error, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(orbitKeys.projects, context.previousProjects);
      }
      addToast({ title: 'Delete failed', description: err.message, variant: 'error' });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const actorId = useAppStore((s) => s.currentUserId);
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: (input: TaskFormInput) => mockApi.createTask(input, actorId),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      addToast({
        title: 'Task created',
        description: `${task.code}: ${task.title}`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      addToast({ title: 'Could not create task', description: err.message, variant: 'error' });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const actorId = useAppStore((s) => s.currentUserId);
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskFormInput> }) =>
      mockApi.updateTask(id, input, actorId),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      addToast({
        title: 'Task saved',
        description: `Updated ${task.code}.`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      addToast({ title: 'Save failed', description: err.message, variant: 'error' });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  const actorId = useAppStore((s) => s.currentUserId);
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({
      taskId,
      targetStatus,
      targetIndex,
    }: {
      taskId: string;
      targetStatus: TaskStatus;
      targetIndex?: number;
    }) => mockApi.moveTask(taskId, targetStatus, targetIndex, actorId),
    onMutate: async ({ taskId, targetStatus, targetIndex }) => {
      await queryClient.cancelQueries({ queryKey: orbitKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(orbitKeys.tasks);
      if (previous) {
        queryClient.setQueryData<Task[]>(
          orbitKeys.tasks,
          moveTaskInList(previous, taskId, targetStatus, targetIndex)
        );
      }
      return { previous };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(orbitKeys.tasks, context.previous);
      }
      addToast({ title: 'Could not move task', description: err.message, variant: 'error' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: (id: string) => mockApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      addToast({
        title: 'Task deleted',
        description: 'The task was permanently removed.',
        variant: 'info',
      });
    },
    onError: (err: Error) => {
      addToast({ title: 'Delete failed', description: err.message, variant: 'error' });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const actorId = useAppStore((s) => s.currentUserId);
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) =>
      mockApi.addComment(taskId, body, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      queryClient.invalidateQueries({ queryKey: orbitKeys.activities });
      addToast({ title: 'Comment posted', variant: 'success' });
    },
    onError: (err: Error) => {
      addToast({ title: 'Comment failed', description: err.message, variant: 'error' });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      mockApi.deleteComment(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orbitKeys.tasks });
      addToast({ title: 'Comment removed', variant: 'info' });
    },
    onError: (err: Error) => {
      addToast({ title: 'Could not remove comment', description: err.message, variant: 'error' });
    },
  });
}

export function useResetDemoData() {
  const queryClient = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  return useMutation({
    mutationFn: () => mockApi.resetDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      addToast({
        title: 'Demo workspace reset',
        description: 'Restored initial seed projects, tasks, and activity.',
        variant: 'info',
      });
    },
    onError: (err: Error) => {
      addToast({ title: 'Reset failed', description: err.message, variant: 'error' });
    },
  });
}
