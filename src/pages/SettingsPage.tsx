import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Monitor, Moon, RotateCcw, Sun, Zap } from 'lucide-react';
import {
  profilePreferencesSchema,
  type ProfilePreferencesValues,
} from '../schemas/forms';
import { useAppStore } from '../store/useAppStore';
import { useResetDemoData } from '../hooks/useOrbitQueries';
import { API_CONFIG } from '../services/mockApi';
import type { DensityMode, ThemeMode } from '../types/domain';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SelectField, TextField } from '../components/ui/FormField';

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const DENSITY_OPTIONS: Array<{ id: DensityMode; label: string; detail: string }> = [
  { id: 'comfortable', label: 'Comfortable', detail: 'Spacious padding for reading and review' },
  { id: 'compact', label: 'Compact', detail: 'Higher density for large boards and tables' },
];

export function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const density = useAppStore((s) => s.density);
  const setDensity = useAppStore((s) => s.setDensity);
  const preferences = useAppStore((s) => s.preferences);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const simulatedLatencyMs = useAppStore((s) => s.simulatedLatencyMs);
  const setSimulatedLatencyMs = useAppStore((s) => s.setSimulatedLatencyMs);
  const simulateNextError = useAppStore((s) => s.simulateNextError);
  const setSimulateNextError = useAppStore((s) => s.setSimulateNextError);
  const addToast = useAppStore((s) => s.addToast);

  const resetDemo = useResetDemoData();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfilePreferencesValues>({
    resolver: zodResolver(profilePreferencesSchema),
    defaultValues: preferences,
  });

  useEffect(() => {
    reset(preferences);
  }, [preferences, reset]);

  const onSavePreferences = (values: ProfilePreferencesValues) => {
    updatePreferences(values);
    addToast({
      title: 'Preferences saved',
      description: 'Workspace profile and notification settings updated locally.',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure appearance, notification preferences, and demo API simulation behavior.
        </p>
      </div>

      {/* Appearance & Density */}
      <Card>
        <CardHeader
          title="Appearance & Interface Density"
          subtitle="Theme selection persists across sessions and adapts every surface, chart, and border."
        />
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Color Theme
            </span>
            <div
              role="radiogroup"
              aria-label="Color theme"
              className="grid grid-cols-3 gap-2"
            >
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(opt.id)}
                    className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Layout Density
            </span>
            <div role="radiogroup" aria-label="Layout density" className="grid grid-cols-2 gap-2">
              {DENSITY_OPTIONS.map((opt) => {
                const active = density === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDensity(opt.id)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/60'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        active
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {opt.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile & Notification Form */}
      <Card>
        <CardHeader
          title="Workspace Profile & Notifications"
          subtitle="Validated with React Hook Form and Zod; saved to browser localStorage."
        />
        <form onSubmit={handleSubmit(onSavePreferences)} noValidate className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              id="pref-display-name"
              label="Display name"
              required
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <TextField
              id="pref-role-title"
              label="Role title"
              required
              error={errors.roleTitle?.message}
              {...register('roleTitle')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              id="pref-email"
              label="Work email"
              type="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <SelectField
              id="pref-default-view"
              label="Default projects layout"
              options={[
                { value: 'grid', label: 'Card Grid' },
                { value: 'table', label: 'Compact Table' },
              ]}
              error={errors.defaultProjectView?.message}
              {...register('defaultProjectView')}
            />
          </div>

          <fieldset className="pt-2 space-y-2.5">
            <legend className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notification channels
            </legend>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('weeklyDigest')}
              />
              <span>Send Monday morning delivery summary digest</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('deadlineReminders')}
              />
              <span>Alert 24 hours before assigned task due dates</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('mentionAlerts')}
              />
              <span>Notify immediately on task review comments</span>
            </label>
          </fieldset>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button type="submit" variant="primary" size="sm" disabled={!isDirty}>
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Demo Service & Production Boundary */}
      <Card>
        <CardHeader
          title="Demo Data Service & Production Architecture"
          subtitle="Clear separation between local portfolio demo state and a production backend API."
        />
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Active Environment: {API_CONFIG.mode === 'production' ? 'Production API' : 'Local Demo Service'}
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                All CRUD operations run through a Promise-based service implementing{' '}
                <code className="font-mono text-indigo-700 dark:text-indigo-300">OrbitFlowApiService</code>{' '}
                and persist changes in <code className="font-mono">localStorage</code>.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Production Backend Migration Path
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Set <code className="font-mono">VITE_API_MODE=production</code> and{' '}
                <code className="font-mono">VITE_API_BASE_URL</code> to swap the mock service for a real REST or GraphQL API without changing any UI components or TanStack Query hooks.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="latency-range"
                  className="text-xs font-semibold text-slate-900 dark:text-slate-100 block"
                >
                  Simulated API Latency
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adjust response delay to preview loading skeletons and optimistic mutations.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input
                  id="latency-range"
                  type="range"
                  min={0}
                  max={1200}
                  step={100}
                  value={simulatedLatencyMs}
                  onChange={(e) => setSimulatedLatencyMs(Number(e.target.value))}
                  className="w-32 accent-indigo-600"
                />
                <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 w-14 text-right">
                  {simulatedLatencyMs} ms
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Simulate Next Request Failure
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Arms a one-time API error so you can inspect the error boundary and retry recovery UI on your next action.
                </p>
              </div>
              <Button
                variant={simulateNextError ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => {
                  const next = !simulateNextError;
                  setSimulateNextError(next);
                  addToast({
                    title: next ? 'Error simulation armed' : 'Error simulation disarmed',
                    description: next
                      ? 'The next API mutation or refetch will return a recoverable error.'
                      : 'Normal mock API responses restored.',
                    variant: 'info',
                  });
                }}
                icon={<Zap className="w-3.5 h-3.5" />}
              >
                {simulateNextError ? 'Error Armed (Click to Cancel)' : 'Arm Simulated Error'}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Reset Seed Workspace Data
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Restore all default demo projects, Kanban tasks, and comment threads.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={resetDemo.isPending}
                onClick={() => resetDemo.mutate()}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset Demo Data
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
