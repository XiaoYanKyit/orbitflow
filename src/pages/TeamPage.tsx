import { useMemo, useState } from 'react';
import { Mail, MapPin, Plus } from 'lucide-react';
import { useMembers, useProjects, useTasks } from '../hooks/useOrbitQueries';
import { useAppStore } from '../store/useAppStore';
import {
  calculateMemberWorkloads,
  formatShortDate,
  getReferenceTodayIso,
} from '../utils/metrics';
import type { MemberWorkloadSummary } from '../types/domain';
import { Card } from '../components/ui/Card';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { Drawer } from '../components/ui/Drawer';
import { Button } from '../components/ui/Button';
import { PriorityText, TaskStatusText } from '../components/ui/SemanticText';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';

const DEPARTMENTS = ['All', 'Engineering', 'Product', 'Design', 'Operations'] as const;

export function TeamPage() {
  const membersQuery = useMembers();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();

  const density = useAppStore((s) => s.density);
  const openTaskDetail = useAppStore((s) => s.openTaskDetail);
  const openCreateTaskModal = useAppStore((s) => s.openCreateTaskModal);

  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const members = membersQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const todayIso = getReferenceTodayIso();

  const workloads = useMemo(
    () => calculateMemberWorkloads(members, tasks, todayIso),
    [members, tasks, todayIso]
  );

  const filteredWorkloads = useMemo(() => {
    if (departmentFilter === 'All') return workloads;
    return workloads.filter((w) => w.member.department === departmentFilter);
  }, [workloads, departmentFilter]);

  const teamStats = useMemo(() => {
    const totalCapacity = workloads.reduce((acc, w) => acc + w.member.weeklyCapacityHours, 0);
    const totalAllocated = workloads.reduce((acc, w) => acc + w.allocatedHours, 0);
    const avgUtilization =
      totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;
    const highLoadCount = workloads.filter((w) => w.utilizationPercent >= 85).length;
    return { totalCapacity, totalAllocated, avgUtilization, highLoadCount };
  }, [workloads]);

  const selectedSummary = selectedMemberId
    ? workloads.find((w) => w.member.id === selectedMemberId) ?? null
    : null;

  const selectedMemberTasks = useMemo(() => {
    if (!selectedMemberId) return [];
    return tasks
      .filter((t) => t.assigneeId === selectedMemberId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, selectedMemberId]);

  const columns: DataTableColumn<MemberWorkloadSummary>[] = useMemo(
    () => [
      {
        key: 'member',
        header: 'Member',
        sortable: true,
        sortValue: (row) => row.member.name,
        render: (row) => (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Avatar name={row.member.name} src={row.member.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {row.member.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {row.member.role}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        sortable: true,
        sortValue: (row) => row.member.department,
        render: (row) => (
          <div className="text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {row.member.department}
            </span>
            <span className="text-slate-400 dark:text-slate-500 block mt-0.5">
              {row.member.availability}
            </span>
          </div>
        ),
      },
      {
        key: 'active',
        header: 'In Progress',
        align: 'right',
        sortable: true,
        sortValue: (row) => row.inProgressCount,
        render: (row) => (
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {row.inProgressCount}
          </span>
        ),
      },
      {
        key: 'completed',
        header: 'Completed',
        align: 'right',
        sortable: true,
        sortValue: (row) => row.completedCount,
        render: (row) => (
          <span className="font-mono text-emerald-700 dark:text-emerald-400">
            {row.completedCount}
          </span>
        ),
      },
      {
        key: 'hours',
        header: 'Allocated / Cap',
        align: 'right',
        sortable: true,
        sortValue: (row) => row.allocatedHours,
        render: (row) => (
          <span className="font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {row.allocatedHours}h / {row.member.weeklyCapacityHours}h
          </span>
        ),
      },
      {
        key: 'utilization',
        header: 'Utilization',
        align: 'right',
        sortable: true,
        sortValue: (row) => row.utilizationPercent,
        render: (row) => {
          const isHigh = row.utilizationPercent >= 85;
          const isModerate = row.utilizationPercent >= 60 && row.utilizationPercent < 85;
          return (
            <div className="flex items-center justify-end gap-2.5 min-w-[120px]">
              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isHigh
                      ? 'bg-red-600'
                      : isModerate
                        ? 'bg-amber-500'
                        : 'bg-indigo-600 dark:bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, row.utilizationPercent)}%` }}
                />
              </div>
              <span
                className={`font-mono text-xs font-semibold w-9 text-right ${
                  isHigh
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {row.utilizationPercent}%
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  if (membersQuery.isLoading || tasksQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingSkeleton rows={5} />;
  }

  if (membersQuery.error || tasksQuery.error) {
    return (
      <ErrorState
        message={((membersQuery.error || tasksQuery.error) as Error).message}
        onRetry={() => {
          membersQuery.refetch();
          tasksQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Team & Workload
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor contributor bandwidth, sprint allocation, and assigned deliverables. Select a member to inspect their queue.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => openCreateTaskModal()}
          icon={<Plus className="w-4 h-4" />}
        >
          Assign New Task
        </Button>
      </div>

      {/* Team Summary Metrics */}
      <section aria-label="Team capacity summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Members</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {members.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            4 functional departments
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Utilization</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {teamStats.avgUtilization}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
            {teamStats.totalAllocated}h allocated of {teamStats.totalCapacity}h weekly
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Near Capacity (&ge;85%)</p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
              teamStats.highLoadCount > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {teamStats.highLoadCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {teamStats.highLoadCount > 0 ? 'Consider rebalancing backlog' : 'Healthy team load'}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Assigned Tasks</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {tasks.filter((t) => t.status !== 'done' && t.assigneeId).length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
            {tasks.filter((t) => t.status !== 'done' && !t.assigneeId).length} unassigned in queue
          </p>
        </Card>
      </section>

      {/* Reusable DataTable */}
      <DataTable
        data={filteredWorkloads}
        columns={columns}
        getRowKey={(row) => row.member.id}
        searchPlaceholder="Search members by name, role, or location..."
        searchFilter={(row, q) =>
          row.member.name.toLowerCase().includes(q) ||
          row.member.role.toLowerCase().includes(q) ||
          row.member.location.toLowerCase().includes(q)
        }
        pageSize={5}
        compact={density === 'compact'}
        onRowClick={(row) => setSelectedMemberId(row.member.id)}
        emptyTitle="No team members match your filter"
        emptyDescription="Switch departments or clear the search field to view the full team."
        toolbarRight={
          <div
            role="tablist"
            aria-label="Filter by department"
            className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 overflow-x-auto"
          >
            {DEPARTMENTS.map((dept) => {
              const active = departmentFilter === dept;
              return (
                <button
                  key={dept}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {dept}
                </button>
              );
            })}
          </div>
        }
      />

      {/* Member Detail Drawer */}
      <Drawer
        open={Boolean(selectedSummary)}
        onClose={() => setSelectedMemberId(null)}
        title={selectedSummary?.member.name ?? 'Team Member'}
        subtitle={selectedSummary ? `${selectedSummary.member.role} · ${selectedSummary.member.department}` : undefined}
      >
        {selectedSummary ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <Avatar
                name={selectedSummary.member.name}
                src={selectedSummary.member.avatarUrl}
                size="lg"
              />
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{selectedSummary.member.email}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{selectedSummary.member.location}</span>
                </p>
                <p className="font-mono tabular-nums text-slate-800 dark:text-slate-200 pt-0.5">
                  {selectedSummary.allocatedHours}h / {selectedSummary.member.weeklyCapacityHours}h weekly ({selectedSummary.utilizationPercent}%)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Assigned Tasks ({selectedMemberTasks.length})
                </h3>
              </div>

              {selectedMemberTasks.length === 0 ? (
                <EmptyState
                  title="No tasks assigned"
                  description="Assign an existing or new task to schedule work for this member."
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedMemberTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(null);
                          openTaskDetail(task.id);
                        }}
                        className="w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {task.title}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                            {task.estimatedHours}h
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-mono">{task.code}</span>
                          {project ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{project.name}</span>
                            </>
                          ) : null}
                          <span aria-hidden="true">·</span>
                          <TaskStatusText status={task.status} />
                          <span aria-hidden="true">·</span>
                          <PriorityText priority={task.priority} />
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Due {formatShortDate(task.dueDate)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
