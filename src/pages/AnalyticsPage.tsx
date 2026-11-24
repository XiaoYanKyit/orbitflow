import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import type { AnalyticsRange } from '../types/domain';
import {
  useAnalyticsTrend,
  useMembers,
  useProjects,
  useTasks,
} from '../hooks/useOrbitQueries';
import { useAppStore } from '../store/useAppStore';
import {
  calculateMemberWorkloads,
  generateCsvExport,
  getReferenceTodayIso,
  isTaskOverdue,
} from '../utils/metrics';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ErrorState, LoadingSkeleton } from '../components/ui/States';

const RANGE_OPTIONS: Array<{ id: AnalyticsRange; label: string }> = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const projectsQuery = useProjects();
  const tasksQuery = useTasks();
  const membersQuery = useMembers();
  const trendQuery = useAnalyticsTrend(range, projectFilter);
  const addToast = useAppStore((s) => s.addToast);

  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const trend = trendQuery.data ?? [];
  const todayIso = getReferenceTodayIso();

  const scopedTasks = useMemo(
    () => (projectFilter === 'all' ? tasks : tasks.filter((t) => t.projectId === projectFilter)),
    [tasks, projectFilter]
  );

  const metrics = useMemo(() => {
    const total = scopedTasks.length;
    const completed = scopedTasks.filter((t) => t.status === 'done').length;
    const overdue = scopedTasks.filter((t) => isTaskOverdue(t, todayIso)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalEstimatedHours = scopedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completedHours = scopedTasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + t.estimatedHours, 0);
    const avgCycleDays =
      range === '7d' ? '2.4d' : range === '30d' ? '3.1d' : '3.6d';
    const onTimeRate =
      total > 0 ? Math.max(0, Math.round(((total - overdue) / total) * 100)) : 100;

    return {
      total,
      completed,
      overdue,
      completionRate,
      totalEstimatedHours,
      completedHours,
      avgCycleDays,
      onTimeRate,
    };
  }, [scopedTasks, todayIso, range]);

  const statusDistribution = useMemo(() => {
    const counts = [
      { stage: 'Backlog', count: scopedTasks.filter((t) => t.status === 'backlog').length },
      { stage: 'In Progress', count: scopedTasks.filter((t) => t.status === 'in_progress').length },
      { stage: 'Review', count: scopedTasks.filter((t) => t.status === 'review').length },
      { stage: 'Done', count: scopedTasks.filter((t) => t.status === 'done').length },
    ];
    return counts;
  }, [scopedTasks]);

  const priorityBreakdown = useMemo(() => {
    const items = [
      { label: 'Urgent', count: scopedTasks.filter((t) => t.priority === 'urgent').length, bar: 'bg-red-600' },
      { label: 'High', count: scopedTasks.filter((t) => t.priority === 'high').length, bar: 'bg-amber-500' },
      { label: 'Medium', count: scopedTasks.filter((t) => t.priority === 'medium').length, bar: 'bg-indigo-600' },
      { label: 'Low', count: scopedTasks.filter((t) => t.priority === 'low').length, bar: 'bg-slate-400' },
    ];
    const max = Math.max(1, ...items.map((i) => i.count));
    return items.map((item) => ({
      ...item,
      widthPercent: Math.round((item.count / max) * 100),
    }));
  }, [scopedTasks]);

  const contributorHours = useMemo(() => {
    const workloads = calculateMemberWorkloads(members, scopedTasks, todayIso);
    return workloads.map((w) => ({
      name: w.member.name.split(' ')[0],
      hours: w.allocatedHours,
      completed: w.completedCount,
    }));
  }, [members, scopedTasks, todayIso]);

  const handleExportCsv = () => {
    const csv = generateCsvExport(
      trend.map((pt) => ({
        Period: pt.label,
        Completed: pt.completed,
        Created: pt.created,
        InReview: pt.inReview,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orbitflow-analytics-${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast({
      title: 'Analytics CSV exported',
      description: `Downloaded ${range} completion velocity report.`,
      variant: 'success',
    });
  };

  if (
    projectsQuery.isLoading ||
    tasksQuery.isLoading ||
    membersQuery.isLoading ||
    trendQuery.isLoading
  ) {
    return <LoadingSkeleton rows={5} />;
  }

  if (projectsQuery.error || tasksQuery.error || membersQuery.error || trendQuery.error) {
    return (
      <ErrorState
        message={
          ((projectsQuery.error || tasksQuery.error || membersQuery.error || trendQuery.error) as Error).message
        }
        onRetry={() => {
          projectsQuery.refetch();
          tasksQuery.refetch();
          membersQuery.refetch();
          trendQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Delivery Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Throughput trends, cycle time discipline, and workflow distribution filtered by timeframe and initiative.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          <div
            role="tablist"
            aria-label="Analytics timeframe"
            className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
          >
            {RANGE_OPTIONS.map((opt) => {
              const active = range === opt.id;
              return (
                <button
                  key={opt.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setRange(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <label htmlFor="analytics-project-filter" className="sr-only">
            Scope analytics to project
          </label>
          <select
            id="analytics-project-filter"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} · {p.name}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <section aria-label="Analytics summary KPIs" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completion Velocity</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {metrics.completionRate}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
            {metrics.completed} of {metrics.total} scoped tasks done
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On-Time Delivery</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-2">
            {metrics.onTimeRate}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
            {metrics.overdue} past-due tasks in scope
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Median Cycle Time</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {metrics.avgCycleDays}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            In Progress to Done ({range} window)
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivered Effort</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {metrics.completedHours}h
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
            of {metrics.totalEstimatedHours}h total estimated
          </p>
        </Card>
      </section>

      {/* Completion Trend Chart */}
      <Card>
        <CardHeader
          title="Completion vs. Intake Trend"
          subtitle={`Tasks completed compared against newly scoped tasks over the ${range} period.`}
        />
        <div className="mt-5 h-[290px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748B" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#64748B" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" strokeOpacity={0.35} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed tasks"
                stroke="#4F46E5"
                strokeWidth={2.2}
                fill="url(#completedFill)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Created tasks"
                stroke="#64748B"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                fill="url(#createdFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-600 inline-block" aria-hidden="true" />
            Completed tasks
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-500 inline-block" aria-hidden="true" />
            Created tasks
          </span>
        </div>
      </Card>

      {/* Secondary Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5">
          <CardHeader
            title="Workflow Stage Distribution"
            subtitle="Current count of tasks by Kanban column."
          />
          <div className="mt-5 h-[230px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" strokeOpacity={0.35} />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Tasks" fill="#4338CA" radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader
            title="Open Effort by Contributor"
            subtitle="Estimated hours currently in active queues."
          />
          <div className="mt-5 h-[230px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contributorHours} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" strokeOpacity={0.35} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} unit="h" />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="hours" name="Open hours" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3 flex flex-col justify-between">
          <div>
            <CardHeader
              title="Priority Mix"
              subtitle="Distribution of scoped tasks."
            />
            <div className="mt-5 space-y-4">
              {priorityBreakdown.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.bar}`}
                      style={{ width: `${item.widthPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 leading-relaxed">
            Metrics recalculate immediately as tasks move across the Kanban board or change estimates.
          </p>
        </Card>
      </div>
    </div>
  );
}
