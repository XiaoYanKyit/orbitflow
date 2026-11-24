import { useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useMembers } from '../../hooks/useOrbitQueries';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false },
  { to: '/board', label: 'Kanban Board', icon: KanbanSquare, end: false },
  { to: '/team', label: 'Team', icon: Users, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

const ROUTE_META: Record<string, { section: string; page: string }> = {
  '/': { section: 'Workspace', page: 'Overview' },
  '/projects': { section: 'Workspace', page: 'Projects' },
  '/board': { section: 'Delivery', page: 'Kanban Board' },
  '/team': { section: 'Organization', page: 'Team & Workload' },
  '/analytics': { section: 'Insights', page: 'Analytics' },
  '/settings': { section: 'Preferences', page: 'Settings' },
};

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const openCreateTaskModal = useAppStore((s) => s.openCreateTaskModal);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const preferences = useAppStore((s) => s.preferences);
  const { data: members } = useMembers();

  const currentMember = members?.find((m) => m.id === currentUserId);
  const routeInfo = ROUTE_META[location.pathname] ?? { section: 'Workspace', page: 'Overview' };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  const renderSidebarLinks = (collapsed: boolean) => (
    <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[#F8F9FB] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0F172A] transition-[width] duration-150 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        <div
          className={`h-14 flex items-center border-b border-slate-200/90 dark:border-slate-800 px-4 ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <NavLink
            to="/"
            className="flex items-center gap-2.5 text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="24" height="24" rx="6" className="fill-indigo-600 dark:fill-indigo-500" />
              <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="1.75" />
              <circle cx="15.8" cy="8.2" r="1.8" fill="white" />
            </svg>
            {!sidebarCollapsed ? (
              <span className="font-display font-bold text-[16px] tracking-tight">OrbitFlow</span>
            ) : null}
          </NavLink>
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {renderSidebarLinks(sidebarCollapsed)}

        <div className="border-t border-slate-200/90 dark:border-slate-800 p-3">
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label="Expand sidebar"
              className="w-full h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <NavLink
              to="/settings"
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <Avatar
                name={preferences.displayName}
                src={currentMember?.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {preferences.displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {preferences.roleTitle}
                </p>
              </div>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Mobile Slide-over Navigation */}
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-slate-950/45"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[264px] max-w-[82vw] bg-white dark:bg-[#0F172A] h-full flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
                OrbitFlow
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderSidebarLinks(false)}
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
              <Avatar
                name={preferences.displayName}
                src={currentMember?.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {preferences.displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {preferences.email}
                </p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xs border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
                {routeInfo.section}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {routeInfo.page}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreateTaskModal()}
              icon={<Plus className="w-4 h-4" />}
            >
              New Task
            </Button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
