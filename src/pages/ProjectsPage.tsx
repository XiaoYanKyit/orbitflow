import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useDeleteProject,
  useMembers,
  useProjects,
  useTasks,
} from '../hooks/useOrbitQueries';
import { useAppStore } from '../store/useAppStore';
import {
  calculateProjectProgress,
  filterAndSortProjects,
  formatShortDate,
  paginateItems,
} from '../utils/metrics';
import type { Project } from '../types/domain';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { PriorityText, ProjectStatusText } from '../components/ui/SemanticText';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';

const STATUS_TABS = [
  { id: 'all', label: 'All Projects' },
  { id: 'active', label: 'On Track' },
  { id: 'at_risk', label: 'At Risk' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
] as const;

export function ProjectsPage() {
  const projectsQuery = useProjects();
  const tasksQuery = useTasks();
  const membersQuery = useMembers();
  const deleteProject = useDeleteProject();

  const openCreateProjectModal = useAppStore((s) => s.openCreateProjectModal);
  const openEditProjectModal = useAppStore((s) => s.openEditProjectModal);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'progress' | 'targetDate' | 'priority' | 'name'>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const filtered = useMemo(
    () =>
      filterAndSortProjects(projects, tasks, {
        search,
        status: statusFilter,
        sortBy,
        sortDir,
      }),
    [projects, tasks, search, statusFilter, sortBy, sortDir]
  );

  const paginated = useMemo(() => paginateItems(filtered, page, 6), [filtered, page]);

  if (projectsQuery.isLoading || tasksQuery.isLoading || membersQuery.isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (projectsQuery.error || tasksQuery.error || membersQuery.error) {
    return (
      <ErrorState
        message={((projectsQuery.error || tasksQuery.error || membersQuery.error) as Error).message}
        onRetry={() => {
          projectsQuery.refetch();
          tasksQuery.refetch();
          membersQuery.refetch();
        }}
      />
    );
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject.mutateAsync(projectToDelete.id);
    setProjectToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track delivery progress, ownership, and milestone health across every product initiative.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={openCreateProjectModal}
          icon={<Plus className="w-4 h-4" />}
        >
          New Project
        </Button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter projects by status"
          className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 overflow-x-auto"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search projects or keys..."
              aria-label="Search projects"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="project-sort" className="sr-only">
              Sort projects by
            </label>
            <select
              id="project-sort"
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split(':') as [
                  typeof sortBy,
                  typeof sortDir,
                ];
                setSortBy(field);
                setSortDir(dir);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="updated:desc">Recently updated</option>
              <option value="progress:desc">Highest progress</option>
              <option value="progress:asc">Lowest progress</option>
              <option value="targetDate:asc">Earliest deadline</option>
              <option value="priority:desc">Highest priority</option>
              <option value="name:asc">Name (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      {paginated.items.length === 0 ? (
        <EmptyState
          title="No projects match your filters"
          description="Clear your search query or status filter, or create a new project to start tracking deliverables."
          action={
            <div className="flex items-center gap-2">
              {(search || statusFilter !== 'all') ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Reset filters
                </Button>
              ) : null}
              <Button variant="primary" size="sm" onClick={openCreateProjectModal}>
                New Project
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.items.map((project) => {
            const progress = calculateProjectProgress(project.id, tasks);
            const lead = members.find((m) => m.id === project.leadId);
            const squad = project.memberIds
              .map((id) => members.find((m) => m.id === id))
              .filter((m): m is NonNullable<typeof m> => Boolean(m));

            return (
              <Card key={project.id} className="flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {project.key}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{project.category}</span>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                        {project.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditProjectModal(project.id)}
                        aria-label={`Edit ${project.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(project)}
                        aria-label={`Delete ${project.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <ProjectStatusText status={project.status} />
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <PriorityText priority={project.priority} />
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      Due {formatShortDate(project.targetDate)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        {progress.completed} of {progress.total} tasks completed
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {progress.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          project.status === 'at_risk'
                            ? 'bg-amber-500'
                            : project.status === 'completed'
                              ? 'bg-emerald-600'
                              : 'bg-indigo-600 dark:bg-indigo-500'
                        }`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5">
                        {squad.slice(0, 4).map((m) => (
                          <Avatar
                            key={m.id}
                            name={m.name}
                            src={m.avatarUrl}
                            size="xs"
                            className="ring-2 ring-white dark:ring-[#111827]"
                          />
                        ))}
                      </div>
                      {lead ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          Lead: {lead.name.split(' ')[0]}
                        </span>
                      ) : null}
                    </div>

                    <Link
                      to={`/board?project=${project.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>Board</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {paginated.total > paginated.pageSize ? (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            Showing {(paginated.page - 1) * paginated.pageSize + 1}–
            {Math.min(paginated.page * paginated.pageSize, paginated.total)} of {paginated.total}{' '}
            projects
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={paginated.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="px-2 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {paginated.page} / {paginated.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={paginated.page >= paginated.totalPages}
              onClick={() => setPage((p) => Math.min(paginated.totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        title="Delete Project"
        description="This permanently removes the project and any tasks assigned to it in your local workspace."
        maxWidthClass="max-w-md"
      >
        {projectToDelete ? (
          <div className="space-y-5">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {projectToDelete.name}
              </span>{' '}
              (<span className="font-mono">{projectToDelete.key}</span>)?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setProjectToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteProject.isPending}
                onClick={handleConfirmDelete}
              >
                Delete Project
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
