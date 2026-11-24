import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from '../data/seedData';
import { projectFormSchema, taskFormSchema } from '../schemas/forms';
import {
  buildAnalyticsTrend,
  calculateMemberWorkloads,
  calculateProjectProgress,
  calculateWorkspaceKpis,
  filterAndSortProjects,
  generateCsvExport,
  isTaskOverdue,
  moveTaskInList,
  paginateItems,
  parseTagsInput,
} from './metrics';

test('calculateProjectProgress returns accurate totals and completion percentages', () => {
  const db = createSeedDatabase();
  const onboarding = calculateProjectProgress('proj-onboarding', db.tasks);
  assert.equal(onboarding.total, 2);
  assert.equal(onboarding.completed, 2);
  assert.equal(onboarding.percent, 100);

  const meridian = calculateProjectProgress('proj-meridian', db.tasks);
  assert.equal(meridian.total, 4);
  assert.equal(meridian.completed, 1);
  assert.equal(meridian.percent, 25);

  const empty = calculateProjectProgress('proj-unknown', db.tasks);
  assert.equal(empty.total, 0);
  assert.equal(empty.percent, 0);
});

test('isTaskOverdue flags open past-due tasks and excludes completed tasks', () => {
  assert.equal(isTaskOverdue({ status: 'in_progress', dueDate: '2026-11-22' }, '2026-11-23'), true);
  assert.equal(isTaskOverdue({ status: 'done', dueDate: '2026-11-10' }, '2026-11-23'), false);
  assert.equal(isTaskOverdue({ status: 'backlog', dueDate: '2026-11-23' }, '2026-11-23'), false);
});

test('moveTaskInList updates status, completion timestamp, and column ordering deterministically', () => {
  const db = createSeedDatabase();
  const movedToDone = moveTaskInList(db.tasks, 'task-101', 'done', 0, '2026-11-23T18:00:00Z');
  const updated = movedToDone.find((t) => t.id === 'task-101');
  assert.ok(updated);
  assert.equal(updated.status, 'done');
  assert.equal(updated.order, 0);
  assert.equal(updated.completedAt, '2026-11-23T18:00:00Z');

  // Moving back out of done clears completedAt
  const reopened = moveTaskInList(movedToDone, 'task-101', 'review', 0, '2026-11-23T19:00:00Z');
  const reopenedTask = reopened.find((t) => t.id === 'task-101');
  assert.ok(reopenedTask);
  assert.equal(reopenedTask.status, 'review');
  assert.equal(reopenedTask.completedAt, null);
});

test('filterAndSortProjects filters by search and status and sorts by progress', () => {
  const db = createSeedDatabase();
  const activeOnly = filterAndSortProjects(db.projects, db.tasks, {
    search: '',
    status: 'active',
    sortBy: 'progress',
    sortDir: 'desc',
  });
  assert.equal(activeOnly.length, 3);
  assert.ok(activeOnly.every((p) => p.status === 'active'));

  const searchSso = filterAndSortProjects(db.projects, db.tasks, {
    search: 'scim',
    status: 'all',
    sortBy: 'name',
    sortDir: 'asc',
  });
  assert.equal(searchSso.length, 1);
  assert.equal(searchSso[0].key, 'ATL');
});

test('paginateItems slices accurately and clamps out-of-range pages', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  const page2 = paginateItems(items, 2, 3);
  assert.deepEqual(page2.items, [4, 5, 6]);
  assert.equal(page2.totalPages, 3);

  const clamped = paginateItems(items, 99, 3);
  assert.equal(clamped.page, 3);
  assert.deepEqual(clamped.items, [7]);
});

test('calculateMemberWorkloads computes allocated hours and utilization percentage', () => {
  const db = createSeedDatabase();
  const workloads = calculateMemberWorkloads(db.members, db.tasks, '2026-11-23');
  const jonas = workloads.find((w) => w.member.id === 'mem-jonas');
  assert.ok(jonas);
  assert.equal(jonas.allocatedHours, 22); // task-101 (14h) + task-109 (8h)
  assert.equal(jonas.utilizationPercent, 55);
  assert.equal(jonas.overdueCount, 1);
});

test('calculateWorkspaceKpis and buildAnalyticsTrend produce consistent aggregates', () => {
  const db = createSeedDatabase();
  const kpis = calculateWorkspaceKpis(db.projects, db.tasks, '2026-11-23');
  assert.equal(kpis.totalProjects, 6);
  assert.equal(kpis.totalTasks, 18);
  assert.equal(kpis.overdueTasks, 1);

  const trend7d = buildAnalyticsTrend(db.tasks, '7d', 'all');
  const trend90d = buildAnalyticsTrend(db.tasks, '90d', 'proj-meridian');
  assert.equal(trend7d.length, 7);
  assert.equal(trend90d.length, 6);
});

test('parseTagsInput deduplicates case-insensitively and trims values', () => {
  assert.deepEqual(parseTagsInput(' Frontend, billing, frontend ,  A11y '), [
    'Frontend',
    'billing',
    'A11y',
  ]);
});

test('generateCsvExport escapes commas and quotes safely', () => {
  const csv = generateCsvExport([
    { Name: 'Meridian, Inc.', Tasks: 4, Status: 'On "Track"' },
  ]);
  assert.equal(csv, 'Name,Tasks,Status\n"Meridian, Inc.",4,"On ""Track"""');
});

test('Zod form schemas reject invalid payloads and accept valid records', () => {
  const invalidProject = projectFormSchema.safeParse({
    name: 'A',
    key: 'bad-key',
    description: 'short',
    category: '',
    status: 'active',
    priority: 'high',
    leadId: '',
    targetDate: '2026/12/01',
    memberIds: [],
  });
  assert.equal(invalidProject.success, false);

  const validTask = taskFormSchema.safeParse({
    projectId: 'proj-meridian',
    title: 'Implement SSO role sync',
    description: 'Synchronize workspace groups from SAML assertion attributes.',
    status: 'backlog',
    priority: 'high',
    assigneeId: 'mem-jonas',
    dueDate: '2026-12-05',
    estimatedHours: 8,
    tagsText: 'SSO, Backend',
  });
  assert.equal(validTask.success, true);
});
