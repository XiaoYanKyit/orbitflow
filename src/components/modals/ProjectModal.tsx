import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectFormSchema, type ProjectFormValues } from '../../schemas/forms';
import {
  useCreateProject,
  useMembers,
  useProjects,
  useUpdateProject,
} from '../../hooks/useOrbitQueries';
import { useAppStore } from '../../store/useAppStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextareaField, TextField } from '../ui/FormField';

export function ProjectModal() {
  const activeCreateModal = useAppStore((s) => s.activeCreateModal);
  const editingProjectId = useAppStore((s) => s.editingProjectId);
  const closeModals = useAppStore((s) => s.closeModals);
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const isOpen = activeCreateModal === 'project';
  const editingProject = editingProjectId
    ? projects.find((p) => p.id === editingProjectId) ?? null
    : null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      category: 'Core Platform',
      status: 'active',
      priority: 'medium',
      leadId: members[0]?.id ?? 'mem-elena',
      targetDate: '2026-12-20',
      memberIds: ['mem-elena'],
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editingProject) {
      reset({
        name: editingProject.name,
        key: editingProject.key,
        description: editingProject.description,
        category: editingProject.category,
        status: editingProject.status,
        priority: editingProject.priority,
        leadId: editingProject.leadId,
        targetDate: editingProject.targetDate,
        memberIds: editingProject.memberIds,
      });
    } else {
      reset({
        name: '',
        key: '',
        description: '',
        category: 'Core Platform',
        status: 'active',
        priority: 'medium',
        leadId: members[0]?.id ?? 'mem-elena',
        targetDate: '2026-12-20',
        memberIds: [members[0]?.id ?? 'mem-elena'],
      });
    }
  }, [isOpen, editingProject, members, reset]);

  const selectedMemberIds = watch('memberIds') ?? [];

  const toggleMember = (memberId: string) => {
    const next = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    setValue('memberIds', next, { shouldValidate: true });
  };

  const onSubmit = async (values: ProjectFormValues) => {
    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, input: values });
    } else {
      await createProject.mutateAsync(values);
    }
    closeModals();
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeModals}
      title={editingProject ? 'Edit Project' : 'Create Project'}
      description={
        editingProject
          ? 'Update scope, ownership, status, and target milestones.'
          : 'Define a new workstream with clear ownership and target delivery date.'
      }
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <TextField
              id="project-name"
              label="Project name"
              required
              placeholder="e.g. Enterprise Audit Exports"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <TextField
            id="project-key"
            label="Key"
            required
            placeholder="AUD"
            maxLength={5}
            error={errors.key?.message}
            {...register('key', {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              },
            })}
          />
        </div>

        <TextareaField
          id="project-description"
          label="Scope summary"
          required
          rows={3}
          placeholder="Outline deliverables, target customers, and measurable outcomes."
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            id="project-category"
            label="Workstream category"
            required
            placeholder="Core Platform"
            error={errors.category?.message}
            {...register('category')}
          />
          <TextField
            id="project-target-date"
            label="Target delivery date"
            type="date"
            required
            error={errors.targetDate?.message}
            {...register('targetDate')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            id="project-status"
            label="Status"
            options={[
              { value: 'active', label: 'On Track' },
              { value: 'at_risk', label: 'At Risk' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
          <SelectField
            id="project-priority"
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
          <SelectField
            id="project-lead"
            label="Project lead"
            options={members.map((m) => ({ value: m.id, label: m.name }))}
            error={errors.leadId?.message}
            {...register('leadId')}
          />
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Assigned squad <span className="text-red-600">*</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {members.map((member) => {
              const checked = selectedMemberIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(member.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium truncate">{member.name}</span>
                  <span className="text-slate-400 dark:text-slate-500 ml-auto truncate">
                    {member.department}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.memberIds?.message ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {errors.memberIds.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="secondary" onClick={closeModals}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting || createProject.isPending || updateProject.isPending}
          >
            {editingProject ? 'Save Project' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
