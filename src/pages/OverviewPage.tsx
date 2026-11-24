import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Calendar, Plus } from 'lucide-react';
import {
  useActivities,
  useMembers,
  useProjects,
  useTasks,
} from '../hooks/useOrbitQueries';
import { useAppStore } from '../store/useAppStore';
import {
  calculateMemberWorkloads,
  calculateProjectProgress,
  calculateWorkspaceKpis,
  formatRelativeTimestamp,
  formatShortDate,
  getReferenceTodayIso,
  isTaskOverdue,
} from '../utils/metrics';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { PriorityText, ProjectStatusText } from '../components/ui/SemanticText';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';

export function OverviewPage() {
  const projectsQuery = useProjects();
  const tasksQuery = useTasks();
  const membersQuery = useMembers();
  const activitiesQuery = useActivities();

  const openTaskDetail = useAppStore((s) => s.openTaskDetail);
  const openCreateProjectModal = useAppStore((s) => s.openCreateProjectModal);

  const isLoading =
    projectsQuery.isLoading ||
    tasksQuery.isLoading ||
    membersQuery.isLoading ||
    activitiesQuery.isLoading;

  const firstError =
    projectsQuery.error || tasksQuery.error || membersQuery.error || activitiesQuery.error;

  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];

  const todayIso = getReferenceTodayIso();

  const kpis = useMemo(
    () => calculateWorkspaceKpis(projects, tasks, todayIso),
    [projects, tasks, todayIso]
  );

  const workloads = useMemo(
    () => calculateMemberWorkloads(members, tasks, todayIso),
    [members, tasks, todayIso]
  );

  const chartData = useMemo(
    () =>
      workloads.map((w) => ({
        name: w.member.name.split(' ')[0],
        fullName: w.member.name,
        allocated: w.allocatedHours,
        capacity: w.member.weeklyCapacityHours,
        completed: w.completedCount,
      })),
    [workloads]
  );

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }, [tasks]);

  const activeProjectsList = useMemo(() => {
    return projects
      .filter((p) => p.status !== 'completed')
      .slice(0, 4)
      .map((project) => ({
        project,
        progress: calculateProjectProgress(project.id, tasks),
      }));
  }, [projects, tasks]);

  const handleRetryAll = () => {
    projectsQuery.refetch();
    tasksQuery.refetch();
    membersQuery.refetch();
    activitiesQuery.refetch();
  };

  if (isLoading) {
    return <LoadingSkeleton rows={5} />;
  }

  if (firstError) {
    return <ErrorState message={(firstError as Error).message} onRetry={handleRetryAll} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Delivery health, team workload balance, and upcoming milestones across active initiatives.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={openCreateProjectModal}
            icon={<Plus className="w-4 h-4" />}
          >
            New Project
          </Button>
          <Link
            to="/board"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors whitespace-nowrap"
          >
            <span>Open Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <section aria-label="Workspace key metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Projects</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {kpis.activeProjects}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              of {kpis.totalProjects} total
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Across Core Platform, Security & Design
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completion Rate</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {kpis.completionRate}%
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
              {kpis.completedTasks}/{kpis.totalTasks} tasks done
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
              style={{ width: `${kpis.completionRate}%` }}
            />
          </div>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">In Review</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {kpis.inReviewTasks}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Awaiting sign-off
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            {kpis.openTasks} open deliverables remaining
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Past Due Items</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                kpis.overdueTasks > 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {kpis.overdueTasks}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {kpis.overdueTasks > 0 ? 'Needs immediate focus' : 'All deadlines healthy'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Evaluated against workspace schedule
          </p>
        </Card>
      </section>

      {/* Main Analytics + Project Progress Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader
            title="Team Workload vs. Weekly Capacity"
            subtitle="Open estimated hours compared against available weekly bandwidth."
            action={
              <Link
                to="/team"
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              >
                Inspect team
              </Link>
            }
          />
          <div className="mt-5 h-[270px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" strokeOpacity={0.35} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#E2E8F0' }}
                  labelStyle={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar
                  dataKey="allocated"
                  name="Allocated hrs"
                  fill="#4F46E5"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="capacity"
                  name="Weekly capacity"
                  fill="#CBD5E1"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" aria-hidden="true" />
                Allocated open hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600 inline-block" aria-hidden="true" />
                Weekly capacity
              </span>
            </div>
            <span className="tabular-nums font-mono">{members.length} contributors</span>
          </div>
        </Card>

        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader
            title="Project Progress"
            subtitle="Completion velocity across active initiatives."
            action={
              <Link
                to="/projects"
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              >
                All projects
              </Link>
            }
          />
          <div className="mt-5 space-y-5 flex-1">
            {activeProjectsList.length === 0 ? (
              <EmptyState
                title="No active projects"
                description="Create a project to begin tracking delivery milestones."
              />
            ) : (
              activeProjectsList.map(({ project, progress }) => {
                const lead = members.find((m) => m.id === project.leadId);
                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/board?project=${project.id}`}
                          className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                        >
                          {project.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono">{project.key}</span>
                          <span aria-hidden="true">·</span>
                          <ProjectStatusText status={project.status} />
                          <span aria-hidden="true">·</span>
                          <span>Target {formatShortDate(project.targetDate)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lead ? <Avatar name={lead.name} src={lead.avatarUrl} size="xs" /> : null}
                        <span className="text-xs font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200 w-9 text-right">
                          {progress.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          project.status === 'at_risk'
                            ? 'bg-amber-500'
                            : 'bg-indigo-600 dark:bg-indigo-500'
                        }`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Deadlines + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Upcoming Deadlines"
            subtitle="Open tasks sorted by due date. Select any item to inspect or edit."
            action={
              <Link
                to="/board"
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              >
                Manage board
              </Link>
            }
          />
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
            {upcomingDeadlines.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                All tasks are complete. No pending deadlines.
              </p>
            ) : (
              upcomingDeadlines.map((task) => {
                const assignee = members.find((m) => m.id === task.assigneeId);
                const project = projects.find((p) => p.id === task.projectId);
                const overdue = isTaskOverdue(task, todayIso);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTaskDetail(task.id)}
                    className="w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono">{task.code}</span>
                        {project ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{project.name}</span>
                          </>
                        ) : null}
                        <span aria-hidden="true">·</span>
                        <PriorityText priority={task.priority} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-mono tabular-nums whitespace-nowrap ${
                          overdue
                            ? 'text-red-700 dark:text-red-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        {overdue ? `Overdue (${formatShortDate(task.dueDate)})` : formatShortDate(task.dueDate)}
                      </span>
                      {assignee ? (
                        <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader
            title="Recent Activity"
            subtitle="Live log of project updates, moves, and review notes."
          />
          <ol className="mt-4 space-y-4">
            {activities.slice(0, 6).map((item) => {
              const actor = members.find((m) => m.id === item.actorId);
              const isTaskLink = item.targetType === 'task' || item.targetType === 'comment';
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <Avatar
                    name={actor?.name ?? 'Team Member'}
                    src={actor?.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {actor?.name ?? 'Workspace Member'}
                      </span>{' '}
                      {item.action}{' '}
                      {isTaskLink ? (
                        <button
                          type="button"
                          onClick={() => openTaskDetail(item.targetId)}
                          className="font-medium text-indigo-700 dark:text-indigo-300 hover:underline text-left cursor-pointer"
                        >
                          {item.targetTitle}
                        </button>
                      ) : (
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {item.targetTitle}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatRelativeTimestamp(item.timestamp)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
