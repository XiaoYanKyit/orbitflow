import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskFormSchema, type TaskFormValues } from '../../schemas/forms';
import { useCreateTask, useMembers, useProjects } from '../../hooks/useOrbitQueries';
import { useAppStore } from '../../store/useAppStore';
import { parseTagsInput } from '../../utils/metrics';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextareaField, TextField } from '../ui/FormField';

export function CreateTaskModal() {
  const activeCreateModal = useAppStore((s) => s.activeCreateModal);
  const createTaskDefaults = useAppStore((s) => s.createTaskDefaults);
  const closeModals = useAppStore((s) => s.closeModals);
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();
  const createTask = useCreateTask();

  const isOpen = activeCreateModal === 'task';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      projectId: projects[0]?.id ?? 'proj-meridian',
      title: '',
      description: '',
      status: 'backlog',
      priority: 'medium',
      assigneeId: members[0]?.id ?? 'mem-elena',
      dueDate: '2026-12-04',
      estimatedHours: 6,
      tagsText: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      projectId: createTaskDefaults?.projectId ?? projects[0]?.id ?? '',
      title: '',
      description: '',
      status: createTaskDefaults?.status ?? 'backlog',
      priority: 'medium',
      assigneeId: members[0]?.id ?? null,
      dueDate: '2026-12-04',
      estimatedHours: 6,
      tagsText: '',
    });
  }, [isOpen, createTaskDefaults, projects, members, reset]);

  const onSubmit = async (values: TaskFormValues) => {
    await createTask.mutateAsync({
      projectId: values.projectId,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId || null,
      dueDate: values.dueDate,
      estimatedHours: Number(values.estimatedHours),
      tags: parseTagsInput(values.tagsText),
    });
    closeModals();
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeModals}
      title="Create Task"
      description="Add an actionable deliverable to a project and Kanban workflow column."
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <TextField
          id="task-title"
          label="Task title"
          required
          placeholder="e.g. Add webhook signature verification"
          error={errors.title?.message}
          {...register('title')}
        />

        <TextareaField
          id="task-description"
          label="Description"
          required
          rows={3}
          placeholder="Describe acceptance criteria, edge cases, or implementation context."
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            id="task-project"
            label="Project"
            required
            options={projects.map((p) => ({ value: p.id, label: `${p.key} · ${p.name}` }))}
            error={errors.projectId?.message}
            {...register('projectId')}
          />
          <SelectField
            id="task-assignee"
            label="Assignee"
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
            error={errors.assigneeId?.message}
            {...register('assigneeId')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            id="task-status"
            label="Status"
            options={[
              { value: 'backlog', label: 'Backlog' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'review', label: 'Review' },
              { value: 'done', label: 'Done' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
          <SelectField
            id="task-priority"
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            error={errors.priority?.message}
            {...register('priority')}
          />
          <TextField
            id="task-hours"
            label="Estimate (hours)"
            type="number"
            min={1}
            max={160}
            required
            error={errors.estimatedHours?.message}
            {...register('estimatedHours', { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            id="task-due-date"
            label="Due date"
            type="date"
            required
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />
          <TextField
            id="task-tags"
            label="Labels (comma-separated)"
            placeholder="Backend, Security"
            error={errors.tagsText?.message}
            {...register('tagsText')}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="secondary" onClick={closeModals}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting || createTask.isPending}
          >
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
