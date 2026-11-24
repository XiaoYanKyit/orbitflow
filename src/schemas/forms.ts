import { z } from 'zod';

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Project name must be at least 3 characters')
    .max(80, 'Project name must be under 80 characters'),
  key: z
    .string()
    .trim()
    .min(2, 'Project key must be 2–5 uppercase letters')
    .max(5, 'Project key must be 2–5 uppercase letters')
    .regex(/^[A-Z]{2,5}$/, 'Use 2–5 uppercase letters (e.g. MRD)'),
  description: z
    .string()
    .trim()
    .min(10, 'Provide a concise scope summary (at least 10 characters)')
    .max(320, 'Description must be under 320 characters'),
  category: z.string().trim().min(2, 'Category is required').max(40, 'Category is too long'),
  status: z.enum(['active', 'at_risk', 'on_hold', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  leadId: z.string().min(1, 'Select a project lead'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid target date'),
  memberIds: z.array(z.string()).min(1, 'Assign at least one team member'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const taskFormSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  title: z
    .string()
    .trim()
    .min(3, 'Task title must be at least 3 characters')
    .max(120, 'Task title must be under 120 characters'),
  description: z
    .string()
    .trim()
    .min(6, 'Add a brief description (at least 6 characters)')
    .max(1000, 'Description is too long'),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId: z.string().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid due date'),
  estimatedHours: z
    .number({ message: 'Enter a valid number of hours' })
    .min(1, 'Estimate must be at least 1 hour')
    .max(160, 'Estimate cannot exceed 160 hours'),
  tagsText: z.string().max(120, 'Keep tags concise'),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const commentFormSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, 'Comment cannot be empty')
    .max(600, 'Comment must be under 600 characters'),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const profilePreferencesSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required').max(60),
  roleTitle: z.string().trim().min(2, 'Role title is required').max(60),
  email: z.string().trim().email('Enter a valid work email'),
  weeklyDigest: z.boolean(),
  deadlineReminders: z.boolean(),
  mentionAlerts: z.boolean(),
  defaultProjectView: z.enum(['grid', 'table']),
});

export type ProfilePreferencesValues = z.infer<typeof profilePreferencesSchema>;
