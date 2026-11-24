# OrbitFlow

OrbitFlow is a responsive B2B project management SaaS web application built with React, TypeScript, Tailwind CSS, TanStack Query, Zustand, React Hook Form, Zod, Recharts, and `@dnd-kit`.

## Features

- **Overview Dashboard (`/`)**: Workspace KPIs, team workload vs. weekly capacity bar chart, active project progress indicators, clickable upcoming deadlines, and a live activity log.
- **Projects (`/projects`)**: Searchable, status-filterable, sortable, and paginated project directory with full create, edit, and delete workflows and deep links into filtered Kanban boards.
- **Kanban Board (`/board`)**: Drag-and-drop workflow across **Backlog**, **In Progress**, **Review**, and **Done** powered by `@dnd-kit/core` and `@dnd-kit/sortable`, with optimistic updates, keyboard/select stage transitions, multi-facet filtering, and `localStorage` persistence.
- **Task Detail Drawer**: Slide-over editor for status, priority, assignee, due date, project, estimate hours, tags, task deletion, and a live threaded comment stream.
- **Team & Workload (`/team`)**: Contributor utilization metrics paired with a reusable generic `DataTable` supporting live search, accessible column sorting (`aria-sort`), pagination, and a contributor task-queue drawer.
- **Analytics (`/analytics`)**: Timeframe (`7d` / `30d` / `90d`) and project-scoped completion velocity charts, stage distribution, effort breakdown, and one-click CSV report export.
- **Settings (`/settings`)**: Light / Dark / System theme controller, interface density preferences, validated profile & notification form, and demo API controls (configurable latency, simulated error testing, and seed data reset).

## Architecture

```text
src/
├── components/
│   ├── drawers/       # TaskDetailDrawer
│   ├── layout/        # AppShell (responsive sidebar + breadcrumb header)
│   ├── modals/        # ProjectModal, CreateTaskModal
│   └── ui/            # Button, Card, Modal, Drawer, DataTable, FormField, Avatar, States, ToastContainer
├── data/              # Deterministic B2B workspace seed dataset
├── hooks/             # TanStack Query queries and optimistic mutations
├── pages/             # Route-level views (Overview, Projects, Kanban, Team, Analytics, Settings)
├── schemas/           # Zod schemas shared with React Hook Form
├── services/          # OrbitFlowApiService contract + local Promise-based mockApi
├── store/             # Persisted Zustand UI state (theme, density, modals, toasts)
├── types/             # Strict TypeScript domain models
└── utils/             # Pure calculation helpers + node:test unit tests
```

### Demo vs. Production Service Boundary

All UI views interact exclusively with TanStack Query hooks (`src/hooks/useOrbitQueries.ts`), which delegate to the `OrbitFlowApiService` interface (`src/services/mockApi.ts`).

- **Demo Mode (default)**: Runs against a Promise-based local service with configurable network latency, optional error simulation, and `localStorage` persistence (`orbitflow_workspace_db_v1`).
- **Production Mode**: Implement `OrbitFlowApiService` with an authenticated HTTP/GraphQL client targeting `VITE_API_BASE_URL` and set `VITE_API_MODE=production`—no page components or state hooks need to change.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Quality Checks & Tests

```bash
# TypeScript typecheck / lint
npm run lint

# Unit tests for domain logic, Kanban transitions, pagination, CSV export, and Zod schemas
npx --yes tsx --test src/utils/metrics.test.ts

# Production build
npm run build
```

## Demo Limitations

- Data is persisted per browser via `localStorage`; there is no multi-user real-time server sync in demo mode.
- Authentication is simulated with a default workspace lead profile (`Elena Vance`), editable under **Settings**.
- No secrets or external API keys are required to run or deploy the demo.

## Deployment (Vercel)

OrbitFlow includes a `vercel.json` configuration with SPA client-side routing rewrites (`/((?!assets|src/assets|favicon.ico).*) -> /index.html`) and security headers.

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel (framework preset: **Vite**, build command: `npm run build`, output directory: `dist`).
3. Optional environment variables (see `.env.example`):
   - `VITE_API_MODE=demo`
   - `VITE_APP_NAME=OrbitFlow`
   - `VITE_API_BASE_URL=` (only needed when pointing to a live backend)
4. Deploy.
