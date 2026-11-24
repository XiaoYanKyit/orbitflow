import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { KanbanPage } from './pages/KanbanPage';
import { TeamPage } from './pages/TeamPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProjectModal } from './components/modals/ProjectModal';
import { CreateTaskModal } from './components/modals/CreateTaskModal';
import { TaskDetailDrawer } from './components/drawers/TaskDetailDrawer';
import { ToastContainer } from './components/ui/ToastContainer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeController() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();
    if (theme === 'system') {
      media.addEventListener('change', applyTheme);
      return () => media.removeEventListener('change', applyTheme);
    }
    return undefined;
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeController />
        <AppShell>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/board" element={<KanbanPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>

        <ProjectModal />
        <CreateTaskModal />
        <TaskDetailDrawer />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
