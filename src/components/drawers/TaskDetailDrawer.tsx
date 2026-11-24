import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import {
  commentFormSchema,
  taskFormSchema,
  type CommentFormValues,
  type TaskFormValues,
} from '../../schemas/forms';
import {
  useAddComment,
  useDeleteComment,
  useDeleteTask,
  useMembers,
  useProjects,
  useTasks,
  useUpdateTask,
} from '../../hooks/useOrbitQueries';
import { useAppStore } from '../../store/useAppStore';
import { formatRelativeTimestamp, parseTagsInput } from '../../utils/metrics';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { SelectField, TextareaField, TextField } from '../ui/FormField';
import { Avatar } from '../ui/Avatar';

export function TaskDetailDrawer() {
  const selectedTaskId = useAppStore((s) => s.selectedTaskId);
  const closeTaskDetail = useAppStore((s) => s.closeTaskDetail);
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const task = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const project = task ? projects.find((p) => p.id === task.projectId) : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
  });

  const {
    register: registerComment,
    handleSubmit: handleCommentSubmit,
    reset: resetComment,
    formState: { errors: commentErrors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: '' },
  });

  useEffect(() => {
    setConfirmDelete(false);
    if (!task) return;
    reset({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ?? '',
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      tagsText: task.tags.join(', '),
    });
  }, [task, reset]);

  const onSaveTask = async (values: TaskFormValues) => {
    if (!task) return;
    await updateTask.mutateAsync({
      id: task.id,
      input: {
        projectId: values.projectId,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId || null,
        dueDate: values.dueDate,
        estimatedHours: Number(values.estimatedHours),
        tags: parseTagsInput(values.tagsText),
      },
    });
  };

  const onPostComment = async (values: CommentFormValues) => {
    if (!task) return;
    await addComment.mutateAsync({ taskId: task.id, body: values.body });
    resetComment({ body: '' });
  };

  const onDeleteTask = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    closeTaskDetail();
  };

  return (
    <Drawer
      open={Boolean(task)}
      onClose={closeTaskDetail}
      title={task ? task.title : 'Task Detail'}
      subtitle={task ? `${task.code}${project ? ` · ${project.name}` : ''}` : undefined}
      headerAction={
        task ? (
          confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="danger"
                size="sm"
                loading={deleteTask.isPending}
                onClick={onDeleteTask}
              >
                Confirm Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete task ${task.code}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        ) : null
      }
    >
      {task ? (
        <div className="space-y-7">
          <form onSubmit={handleSubmit(onSaveTask)} noValidate className="space-y-4">
            <TextField
              id="detail-title"
              label="Title"
              required
              error={errors.title?.message}
              {...register('title')}
            />

            <TextareaField
              id="detail-description"
              label="Description"
              required
              rows={4}
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="detail-status"
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
                id="detail-priority"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="detail-assignee"
                label="Assignee"
                options={[
                  { value: '', label: 'Unassigned' },
                  ...members.map((m) => ({ value: m.id, label: m.name })),
                ]}
                error={errors.assigneeId?.message}
                {...register('assigneeId')}
              />
              <SelectField
                id="detail-project"
                label="Project"
                options={projects.map((p) => ({ value: p.id, label: `${p.key} · ${p.name}` }))}
                error={errors.projectId?.message}
                {...register('projectId')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TextField
                id="detail-due-date"
                label="Due date"
                type="date"
                required
                error={errors.dueDate?.message}
                {...register('dueDate')}
              />
              <TextField
                id="detail-hours"
                label="Est. hours"
                type="number"
                min={1}
                max={160}
                required
                error={errors.estimatedHours?.message}
                {...register('estimatedHours', { valueAsNumber: true })}
              />
              <TextField
                id="detail-tags"
                label="Labels"
                placeholder="Billing, QA"
                error={errors.tagsText?.message}
                {...register('tagsText')}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Updated {formatRelativeTimestamp(task.updatedAt)}
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!isDirty}
                loading={isSubmitting || updateTask.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>

          {/* Comments Section */}
          <section
            aria-labelledby="comments-heading"
            className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <h3
                id="comments-heading"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Discussion
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {task.comments.length}
              </span>
            </div>

            {task.comments.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                No comments yet. Share a technical note, blocker, or review decision below.
              </p>
            ) : (
              <ul className="space-y-4">
                {task.comments.map((comment) => {
                  const author = members.find((m) => m.id === comment.authorId);
                  return (
                    <li
                      key={comment.id}
                      className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/70 last:border-0 last:pb-0"
                    >
                      <Avatar
                        name={author?.name ?? 'Team Member'}
                        src={author?.avatarUrl}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {author?.name ?? 'Workspace Member'}
                            </span>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                              ·
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {formatRelativeTimestamp(comment.createdAt)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              deleteComment.mutate({ taskId: task.id, commentId: comment.id })
                            }
                            aria-label="Delete comment"
                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={handleCommentSubmit(onPostComment)} noValidate className="space-y-2.5">
              <TextareaField
                id="new-comment"
                label="Add a comment"
                rows={2}
                placeholder="Write an update or tag a teammate..."
                error={commentErrors.body?.message}
                {...registerComment('body')}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  loading={addComment.isPending}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Post Comment
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
