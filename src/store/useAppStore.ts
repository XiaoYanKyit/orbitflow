import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DensityMode,
  TaskStatus,
  ThemeMode,
  WorkspaceProfilePreferences,
} from '../types/domain';
import { setMockApiBehavior } from '../services/mockApi';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface AppStoreState {
  theme: ThemeMode;
  density: DensityMode;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  selectedTaskId: string | null;
  activeCreateModal: 'task' | 'project' | null;
  createTaskDefaults: { status?: TaskStatus; projectId?: string } | null;
  editingProjectId: string | null;
  currentUserId: string;
  simulatedLatencyMs: number;
  simulateNextError: boolean;
  preferences: WorkspaceProfilePreferences;
  toasts: ToastItem[];

  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: DensityMode) => void;
  toggleSidebarCollapsed: () => void;
  setMobileNavOpen: (open: boolean) => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  openCreateTaskModal: (defaults?: { status?: TaskStatus; projectId?: string }) => void;
  openCreateProjectModal: () => void;
  openEditProjectModal: (projectId: string) => void;
  closeModals: () => void;
  setSimulatedLatencyMs: (ms: number) => void;
  setSimulateNextError: (flag: boolean) => void;
  updatePreferences: (prefs: WorkspaceProfilePreferences) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      density: 'comfortable',
      sidebarCollapsed: false,
      mobileNavOpen: false,
      selectedTaskId: null,
      activeCreateModal: null,
      createTaskDefaults: null,
      editingProjectId: null,
      currentUserId: 'mem-elena',
      simulatedLatencyMs: 160,
      simulateNextError: false,
      preferences: {
        displayName: 'Elena Vance',
        roleTitle: 'Principal Product Manager',
        email: 'elena.vance@orbitflow.io',
        weeklyDigest: true,
        deadlineReminders: true,
        mentionAlerts: true,
        defaultProjectView: 'grid',
      },
      toasts: [],

      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openTaskDetail: (selectedTaskId) => set({ selectedTaskId }),
      closeTaskDetail: () => set({ selectedTaskId: null }),
      openCreateTaskModal: (defaults) =>
        set({
          activeCreateModal: 'task',
          createTaskDefaults: defaults ?? null,
          editingProjectId: null,
        }),
      openCreateProjectModal: () =>
        set({
          activeCreateModal: 'project',
          editingProjectId: null,
        }),
      openEditProjectModal: (projectId) =>
        set({
          activeCreateModal: 'project',
          editingProjectId: projectId,
        }),
      closeModals: () =>
        set({
          activeCreateModal: null,
          createTaskDefaults: null,
          editingProjectId: null,
        }),
      setSimulatedLatencyMs: (ms) => {
        setMockApiBehavior({ latencyMs: ms });
        set({ simulatedLatencyMs: ms });
      },
      setSimulateNextError: (flag) => {
        setMockApiBehavior({ simulateNextError: flag });
        set({ simulateNextError: flag });
      },
      updatePreferences: (preferences) => set({ preferences }),
      addToast: (toast) => {
        const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-4) }));
        setTimeout(() => {
          get().dismissToast(id);
        }, 4200);
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'orbitflow_ui_state_v1',
      partialize: (state) => ({
        theme: state.theme,
        density: state.density,
        sidebarCollapsed: state.sidebarCollapsed,
        simulatedLatencyMs: state.simulatedLatencyMs,
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setMockApiBehavior({ latencyMs: state.simulatedLatencyMs });
        }
      },
    }
  )
);
