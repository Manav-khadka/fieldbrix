# Fieldbrix — Frontend Reference (Vite + React, Web Console)

Architecture and behavior are extracted from the engineering standards. Package approval, sprint ownership and the dated registry snapshot live only in [`../../react-libraries.md`](../../react-libraries.md); manifests and lockfiles are authoritative for versions actually installed.

Dependency rule: use the latest compatible stable open-source release when the owning sprint begins, commit the resolved lockfile, and reject deprecated or paid/premium runtime UI packages. Do not copy this document's examples into a manifest without the catalog gate.

**Priority system:**
- `P0` — Non-negotiable. Code review rejects any violation without an approved exception on record.
- `P1` — Strong default. Override only with a comment explaining why.
- `P2` — Recommended. Use good judgment.

---

# 1. FRONTEND TECH STACK

## 1.1 Framework Choice

```
Framework     : Vite + React + TypeScript (compatible stable set)
Type          : Single Page Application (SPA)
Why SPA       : Web console is 100% behind login screen
                SEO = irrelevant
                SSR (Next.js) adds complexity with zero benefit
                No caching layers to fight for live dashboard data
                Deployed as an immutable artifact to the EC2/nginx runtime
Why not Next  : ISR/SSG useless for authenticated dashboard
                {cache: 'no-store'} needed everywhere anyway
                Vercel lock-in concern
                SPA is simpler, cheaper, faster to iterate

Build time    : measured and recorded by CI for the pinned toolchain
Bundle size   : Tree-shakable by default
Deploy        : private S3 artifact upload + Systems Manager activation
```

## 1.2 Routing

```
Package       : @tanstack/react-router (catalog/lockfile)
Why TanStack  :
  ✅ Fully type-safe routes
     Navigate to wrong route = TypeScript error
  ✅ Type-safe search params
     ?status=OPEN is typed, not a random string
  ✅ Nested layouts (sidebar + content area)
  ✅ File-based routing (optional)
  ✅ Built-in data loading (like Remix loaders)
  ✅ No vendor lock-in (not tied to Vercel)

// Type-safe navigation - wrong route = compile error:
const navigate = useNavigate()
navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })

// Type-safe search params:
const { status, assigneeId } = useSearch({ from: '/tasks' })
// status and assigneeId are typed from route definition
// not strings you hope are correct
```

## 1.3 UI Components

```
Package       : shadcn/ui (not a package - it's copied code)
Why shadcn    :
  ✅ You own the component code (copy-paste, not npm install)
  ✅ Customize anything without fighting a library
  ✅ Radix UI primitives underneath (WAI-ARIA accessible)
  ✅ Tailwind CSS styling (utility-first, no CSS files)
  ✅ Most popular SaaS dashboard stack in 2026
  ✅ CLI: npx shadcn add button (adds the component to your code)
  ✅ AI-agent ready (shadcn/skills for Copilot/Cursor)

Components used from shadcn:
  Button, Input, Select, Dialog, Sheet (drawer),
  Table, Badge, Card, Tabs, Command (search palette),
  DatePicker, DropdownMenu, Avatar, Tooltip,
  Form (with React Hook Form integration),
  Sidebar (collapsible, works perfectly for dispatch layout)

Tailwind CSS   : v4 (2026) - CSS-first config
Radix UI       : v2.x - accessible primitives
```

## 1.4 Data Tables

```
Package       : @tanstack/react-table (catalog-approved compatible release)
Why TanStack  :
  ✅ Headless - you control every pixel of the UI
  ✅ Sorting, filtering, pagination built-in
  ✅ Virtual scrolling for large datasets
     (dispatch board: 500 tasks scrolls smoothly)
  ✅ Column visibility toggle (per user preference)
  ✅ Row selection for bulk actions
  ✅ Most popular 2026 React table library (~3M downloads/week)
  ✅ Works with shadcn/ui Table component

Key tables in Fieldbrix:
  Dispatch board       → virtual scroll, drag-drop rows
  Tasks list            → filter by status/assignee/date
  Contracts list       → expiry sorting, renewal status
  Customers list       → search, tier filter
  Inventory            → stock levels, reorder alerts
  Audit Explorer       → time filter, entity filter, export
```

## 1.5 Server State (API Data)

```
Package       : @tanstack/react-query (catalog/lockfile)
Why           :
  ✅ Fetch, cache, sync, refetch server data
  ✅ Replaces 80% of global state management needs
  ✅ Background refetch (dispatch board stays fresh)
  ✅ Optimistic updates (task status flip feels instant)
  ✅ Infinite scroll for large lists
  ✅ Mutation with automatic cache invalidation

// Example: optimistic task assignment
const assignMutation = useMutation({
  mutationFn: (data) => api.tasks.assign(data),
  onMutate: async (data) => {
    // Instantly updates UI before server responds
    // Rolls back automatically if server returns error
    queryClient.setQueryData(['tasks'], optimisticUpdate(data))
  }
})
// Dispatch board feels instantaneous
// No loading spinners on every action
```

## 1.6 Client State

```
Package       : zustand (catalog/lockfile)
Why Zustand   :
  ✅ 1KB, zero boilerplate vs Redux
  ✅ No Provider wrapper needed
  ✅ Works with TypeScript perfectly
  ✅ Persist to localStorage for preferences

Used for:
  Tenant config store    ← customization settings
  UI preferences         ← collapsed sidebar, theme
  Notifications          ← unread count, toast queue
  Active filters         ← dispatch board filter state
  Map state               ← selected technician, zoom level
```

## 1.7 Forms

```
Package       : react-hook-form + zod (catalog-approved compatible releases)
Why           :
  ✅ Minimal re-renders (performance critical for
     config studio with 50+ fields)
  ✅ Zod schema shared between:
     - Frontend form validation
     - Backend NestJS pipe validation
     - One source of truth, never out of sync

// Shared schema (packages/types/src/schemas/task.ts):
export const CreateTaskSchema = z.object({
  description: z.string().min(1).max(500),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),  // matches task_priority DB enum
  scheduledStart: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional()
})
// Same schema validates on frontend AND backend
// Change validation once, applies everywhere
```

## 1.8 Charts & Data Visualization

```
Package       : recharts (catalog-approved compatible release)
Why Recharts  :
  ✅ Built on D3, React-native API
  ✅ Composable components
  ✅ Works with shadcn/ui theming
  ✅ Responsive by default

Charts used in Fieldbrix:
  AreaChart     → revenue trend, task volume over time
  BarChart      → tasks by status, revenue by branch
  PieChart      → task type distribution
  LineChart     → SLA compliance over time
  RadarChart    → technician performance scorecard
  Heatmap       → attendance / idle time visualization
```

## 1.9 Maps

```
Package       : maplibre-gl + react-map-gl
Owner         : Sprint 22 only
Allowed use   : consented, task-bound visit tracking and safe site/visit context
Forbidden     : off-duty tracking, route optimization, traffic-based recommendations,
                route replay beyond approved retention, and nearest-technician selection
Why MapLibre  : open-source runtime with no paid/premium UI license dependency
```

## 1.10 Real-time Updates

```
Method        : Server-Sent Events (SSE)
Package       : Browser native EventSource API
                (no package needed)
Why SSE over WebSocket:
  ✅ One-way server→client (all you need for dashboard)
  ✅ Auto-reconnects on disconnect
  ✅ Works through Cloudflare proxy
  ✅ Much simpler than WebSocket
  ✅ HTTP/2 multiplexing (efficient)
  ❌ WebSocket needed only if client sends high-frequency
     messages back (you don't need this)

// React hook:
function useRealtimeTasks(tenantId: string) {
  useEffect(() => {
    const es = new EventSource('/api/events/stream')
    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      queryClient.invalidateQueries(['tasks'])
    }
    return () => es.close()
  }, [tenantId])
}
// Dispatch board live-updates without polling
```

## 1.11 Drag and Drop (Dispatch Board)

```
Package       : @dnd-kit/core + @dnd-kit/sortable
Why dnd-kit   :
  ✅ Accessible (keyboard navigable)
  ✅ Touch support (iPad dispatch use case)
  ✅ Works with virtual scroll
  ✅ No HTML5 drag API quirks
  ✅ Smooth animations with @dnd-kit/animation

Use case      : Drag task card from unassigned queue
                onto technician's schedule slot
                → instant optimistic update
                → API call in background
                → rollback if API fails
```

## 1.12 Internationalization

```
Package       : react-i18next + i18next (catalog/lockfile)
Languages     : en, hi, ta, te, kn, mr, gu, bn (launch)
                + en-GB, en-US (at UK/US expansion)
Why           : India market requires vernacular UI
                (blueprint D3 - adoption critical)
Number format : Intl.NumberFormat (₹ lakh/crore, £, $)
Date format   : date-fns + locale (DD/MM for IN, MM/DD for US)
Currency      : Per-tenant configuration (₹/£/$)
```

## 1.13 Frontend libraries summary

The binding status, ownership and audit snapshot are in [`../../react-libraries.md`](../../react-libraries.md). Notable decisions are React Big Calendar instead of premium scheduler plugins, exact-pinned `react-data-grid@7.0.0-beta.61` as the sole prerelease exception, official SheetJS `0.20.3` tarball, MapLibre only in Sprint 22, and `date-fns` as the single date utility. The installed manifest/lockfile—not a duplicated matrix in prose—defines the build.

---

# 2. FRONTEND CODE STANDARDS

## 2.1 Component Rules

```typescript
// Smart components: one per page/route. Fetch data. Pass data down.
// Dumb components: receive typed props, emit callbacks. Zero async.

// Rule P0: No useEffect + fetch inside a component.
//          Data fetching lives in TanStack Query hooks in hooks/ or lib/queries/

// ❌ WRONG — fetches and transforms inside a component
function TaskCard({ taskId }: { taskId: string }) {
  const [task, setTask] = useState(null)
  useEffect(() => { fetch(`/api/tasks/${taskId}`).then(r => r.json()).then(setTask) }, [taskId])
  return <div>{task?.title}</div>
}

// ✅ CORRECT — dumb component receives typed props
interface TaskCardProps {
  title: string; priority: TaskPriority; status: TaskStatus
  onAssign: (taskId: string) => void
}
function TaskCard({ title, priority, status, onAssign }: TaskCardProps) {
  return (
    <Card>
      <PriorityBadge priority={priority} />
      <h3>{title}</h3>
      <StatusBadge status={status} />
    </Card>
  )
}
// Smart parent (DispatchBoardPage) fetches → transforms → passes down
```

## 2.2 Custom Hooks

```typescript
// Named return objects — never confusing positional tuples
function useTask(id: string) {
  const query = useQuery({ queryKey: ['tasks', id], queryFn: () => api.tasks.get(id), staleTime: 30_000 })
  return { task: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }
}

function useAssignTask() {
  const queryClient = useQueryClient()
  return useMutation<Task, ApiError, AssignTaskDto>({
    mutationFn: (dto) => api.tasks.assign(dto),
    onSuccess: (task, dto) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', dto.taskId] })
      toast.success(`Task ${task.taskNumber} assigned`)
    },
    onError: (error: ApiError) => handleApiError(error),
  })
}
```

## 2.3 API Client & Error Handling

```typescript
// lib/api/client.ts — unwraps the envelope automatically
const http = axios.create({ baseURL: '/api/v1' })

http.interceptors.response.use(
  (res) => res.data.data,     // unwrap envelope on success
  (err: AxiosError) => {
    const envelope = err.response?.data as ApiEnvelope
    return Promise.reject(envelope?.error ?? { code: 'NETWORK_ERROR', message: 'Network error.', requestId: 'unknown', timestamp: new Date().toISOString() })
  },
)

// Centralised error handler — import and call from every mutation's onError
export function handleApiError(error: ApiError, form?: UseFormReturn<any>): void {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      error.fields?.forEach(f => form?.setError(f.field as any, { message: f.message }))
      break
    case 'DUPLICATE_IDEMPOTENCY_KEY':
      // Treat as success — use error.data as the result
      break
    case 'INVALID_STATUS_TRANSITION':
      toast.error(`${error.message} ${error.hint ?? ''}`)
      break
    case 'RATE_LIMITED':
      toast.error(`Rate limited. Try again in ${error.retryAfterSeconds}s.`)
      break
    default:
      toast.error(`${error.message}  (ref: ${error.requestId})`)
  }
}
```

## 2.4 Naming Conventions — Frontend

```
Files          : PascalCase.tsx for components, camelCase.ts for everything else
Components     : PascalCase               DispatchBoard  TaskCard  PriorityBadge
Hooks          : camelCase, use prefix    useTask  useAssignTask  useCurrentUser
Query keys     : array literals           ['tasks']  ['tasks', id]  ['tasks', 'list', filter]
Event handlers : handle prefix            handleAssign  handleStatusChange
Boolean props  : is/has/can              isLoading  hasError  canEdit
```

## Quick Reference — Frontend Row

```
Layer      | Technology          | Key reason
───────────┼─────────────────────┼──────────────────────────────
Frontend   | Vite + React 19 SPA | No SSR needed, fast builds
           | TanStack Router     | Type-safe routes
           | shadcn/ui + Radix   | Owned components, accessible
           | TanStack Table      | Virtual scroll, composable
           | TanStack Query      | Server state, optimistic UI
           | Zustand             | Client state, 1KB
           | React Hook Form+Zod | Shared schema with backend
           | Recharts            | Charts
           | MapLibre (Sprint 22)| Consented visit tracking only
           | SSE                 | Real-time updates
```
