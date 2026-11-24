import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  GripVertical,
  MessageSquare,
  Plus,
  Search,
} from 'lucide-react';
import {
  TASK_STATUS_COLUMNS,
  type Project,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TeamMember,
} from '../types/domain';
import {
  useMembers,
  useMoveTask,
  useProjects,
  useTasks,
} from '../hooks/useOrbitQueries';
import { useAppStore } from '../store/useAppStore';
import { formatShortDate, getReferenceTodayIso, isTaskOverdue } from '../utils/metrics';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { PriorityText } from '../components/ui/SemanticText';
import { ErrorState, LoadingSkeleton } from '../components/ui/States';

interface KanbanCardContentProps {
  task: Task;
  project?: Project;
  assignee?: TeamMember;
  todayIso: string;
  compact: boolean;
  onOpen: (id: string) => void;
  onQuickMove?: (taskId: string, status: TaskStatus) => void;
  dragHandleProps?: Record<string, unknown>;
}

function KanbanCardContent({
  task,
  project,
  assignee,
  todayIso,
  compact,
  onOpen,
  onQuickMove,
  dragHandleProps,
}: KanbanCardContentProps) {
  const overdue = isTaskOverdue(task, todayIso);

  return (
    <div
      className={`rounded-xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 transition-colors ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
          <span className="font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
            {task.code}
          </span>
          {project ? (
            <>
              <span aria-hidden="true" className="shrink-0">·</span>
              <span className="truncate">{project.name}</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Drag task ${task.code}`}
          className="p-1 -mr-1 -mt-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
          {...dragHandleProps}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="block w-full text-left text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors leading-snug cursor-pointer"
      >
        {task.title}
      </button>

      {task.tags.length > 0 ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {task.tags.join(' · ')}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <PriorityText priority={task.priority} />
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span
            className={`inline-flex items-center gap-1 font-mono tabular-nums whitespace-nowrap ${
              overdue
                ? 'text-red-700 dark:text-red-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-3 h-3" aria-hidden="true" />
            {formatShortDate(task.dueDate)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.comments.length > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500"
              aria-label={`${task.comments.length} comments`}
            >
              <MessageSquare className="w-3 h-3" aria-hidden="true" />
              {task.comments.length}
            </span>
          ) : null}
          {assignee ? <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" /> : null}
        </div>
      </div>

      {onQuickMove ? (
        <div className="pt-1 flex items-center justify-between gap-2">
          <label htmlFor={`move-${task.id}`} className="text-[11px] text-slate-400 dark:text-slate-500">
            Stage
          </label>
          <select
            id={`move-${task.id}`}
            aria-label={`Change status for ${task.code}`}
            value={task.status}
            onChange={(e) => onQuickMove(task.id, e.target.value as TaskStatus)}
            className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            {TASK_STATUS_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

function SortableKanbanCard({
  task,
  project,
  assignee,
  todayIso,
  compact,
  onOpen,
  onQuickMove,
}: Omit<KanbanCardContentProps, 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardContent
        task={task}
        project={project}
        assignee={assignee}
        todayIso={todayIso}
        compact={compact}
        onOpen={onOpen}
        onQuickMove={onQuickMove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface KanbanColumnProps {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  projects: Project[];
  members: TeamMember[];
  todayIso: string;
  compact: boolean;
  onAddTask: (status: TaskStatus) => void;
  onOpenTask: (taskId: string) => void;
  onQuickMove: (taskId: string, status: TaskStatus) => void;
}

function KanbanColumn({
  id,
  label,
  tasks,
  projects,
  members,
  todayIso,
  compact,
  onAddTask,
  onOpenTask,
  onQuickMove,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
    data: { type: 'column', status: id },
  });

  return (
    <section
      aria-label={`${label} column`}
      data-testid={`kanban-column-${id}`}
      className={`flex flex-col rounded-xl border transition-colors min-h-[420px] ${
        isOver
          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/25'
          : 'border-slate-200/80 dark:border-slate-800/90 bg-slate-100/60 dark:bg-[#0F172A]/70'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/70 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h2>
          <span
            data-testid={`column-count-${id}`}
            className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400"
          >
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(id)}
          aria-label={`Add task to ${label}`}
          className="p-1 rounded-md text-slate-500 hover:text-indigo-700 hover:bg-white dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 p-3 space-y-2.5">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="h-28 rounded-lg border border-dashed border-slate-300/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-center px-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">No tasks in {label}</p>
              <button
                type="button"
                onClick={() => onAddTask(id)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline mt-1 cursor-pointer"
              >
                Add task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableKanbanCard
                key={task.id}
                task={task}
                project={projects.find((p) => p.id === task.projectId)}
                assignee={members.find((m) => m.id === task.assigneeId)}
                todayIso={todayIso}
                compact={compact}
                onOpen={onOpenTask}
                onQuickMove={onQuickMove}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

export function KanbanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProject = searchParams.get('project') ?? 'all';

  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const membersQuery = useMembers();
  const moveTask = useMoveTask();

  const density = useAppStore((s) => s.density);
  const openTaskDetail = useAppStore((s) => s.openTaskDetail);
  const openCreateTaskModal = useAppStore((s) => s.openCreateTaskModal);
  const addToast = useAppStore((s) => s.addToast);

  const [projectFilter, setProjectFilter] = useState<string>(initialProject);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasks = tasksQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const todayIso = getReferenceTodayIso();

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== (priorityFilter as TaskPriority)) return false;
      if (q) {
        return (
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tasks, projectFilter, assigneeFilter, priorityFilter, search]);

  const columnsMap = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of filteredTasks) {
      grouped[task.status].push(task);
    }
    for (const col of TASK_STATUS_COLUMNS) {
      grouped[col.id].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [filteredTasks]);

  const activeDragTask = activeDragId ? tasks.find((t) => t.id === activeDragId) ?? null : null;

  const handleProjectFilterChange = (nextProjectId: string) => {
    setProjectFilter(nextProjectId);
    if (nextProjectId === 'all') {
      searchParams.delete('project');
    } else {
      searchParams.set('project', nextProjectId);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    let targetStatus: TaskStatus = draggedTask.status;
    let targetIndex: number | undefined;

    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '') as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        const targetColTasks = tasks
          .filter((t) => t.status === targetStatus && t.id !== taskId)
          .sort((a, b) => a.order - b.order);
        targetIndex = targetColTasks.findIndex((t) => t.id === overTask.id);
      }
    }

    if (draggedTask.status === targetStatus && overId === taskId) return;

    moveTask.mutate(
      { taskId, targetStatus, targetIndex },
      {
        onSuccess: () => {
          if (draggedTask.status !== targetStatus) {
            const label =
              TASK_STATUS_COLUMNS.find((c) => c.id === targetStatus)?.label ?? targetStatus;
            addToast({
              title: 'Status updated',
              description: `${draggedTask.code} moved to ${label}.`,
              variant: 'success',
            });
          }
        },
      }
    );
  };

  const handleQuickMove = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    moveTask.mutate(
      { taskId, targetStatus, targetIndex: 0 },
      {
        onSuccess: () => {
          const label =
            TASK_STATUS_COLUMNS.find((c) => c.id === targetStatus)?.label ?? targetStatus;
          addToast({
            title: 'Status updated',
            description: `${task.code} moved to ${label}.`,
            variant: 'success',
          });
        },
      }
    );
  };

  if (tasksQuery.isLoading || projectsQuery.isLoading || membersQuery.isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (tasksQuery.error || projectsQuery.error) {
    return (
      <ErrorState
        message={((tasksQuery.error || projectsQuery.error) as Error).message}
        onRetry={() => {
          tasksQuery.refetch();
          projectsQuery.refetch();
        }}
      />
    );
  }

  const hasActiveFilters =
    projectFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    priorityFilter !== 'all' ||
    search.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kanban Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag tasks across workflow stages or select a card to edit details, assignees, and comments.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() =>
            openCreateTaskModal({
              projectId: projectFilter !== 'all' ? projectFilter : undefined,
            })
          }
          icon={<Plus className="w-4 h-4" />}
        >
          Add to Board
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, code, or tag..."
            aria-label="Filter board tasks"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <label htmlFor="board-project-filter" className="sr-only">
          Filter by project
        </label>
        <select
          id="board-project-filter"
          value={projectFilter}
          onChange={(e) => handleProjectFilterChange(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key} · {p.name}
            </option>
          ))}
        </select>

        <label htmlFor="board-assignee-filter" className="sr-only">
          Filter by assignee
        </label>
        <select
          id="board-assignee-filter"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <label htmlFor="board-priority-filter" className="sr-only">
          Filter by priority
        </label>
        <select
          id="board-priority-filter"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleProjectFilterChange('all');
              setAssigneeFilter('all');
              setPriorityFilter('all');
              setSearch('');
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {/* 4-Column Kanban Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {TASK_STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={columnsMap[col.id]}
              projects={projects}
              members={members}
              todayIso={todayIso}
              compact={density === 'compact'}
              onAddTask={(status) =>
                openCreateTaskModal({
                  status,
                  projectId: projectFilter !== 'all' ? projectFilter : undefined,
                })
              }
              onOpenTask={openTaskDetail}
              onQuickMove={handleQuickMove}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragTask ? (
            <div className="shadow-xl rounded-xl opacity-95">
              <KanbanCardContent
                task={activeDragTask}
                project={projects.find((p) => p.id === activeDragTask.projectId)}
                assignee={members.find((m) => m.id === activeDragTask.assigneeId)}
                todayIso={todayIso}
                compact={density === 'compact'}
                onOpen={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
