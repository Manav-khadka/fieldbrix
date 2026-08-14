
# Fieldbrix — Tech Implementation Standards

### Single source of truth for all engineering, API, logging, testing, and process standards

### Version 1.0 · August 2026 · Binding on all contributors

---

## HOW TO USE THIS DOCUMENT

This is the binding behavior/engineering standards document. Dependency status, ownership and dated frontend registry results live in [`../react-libraries.md`](../react-libraries.md); application manifests and lockfiles are authoritative for installed versions.
When you write code, review code, open a PR, or onboard a new developer — this is the reference.

**Priority system:**

- `P0` — Non-negotiable. Code review rejects any violation without an approved exception on record.
- `P1` — Strong default. Override only with a comment explaining why.
- `P2` — Recommended. Use good judgment.

**When a rule feels wrong** — open a discussion. Don't silently break it.
If the rule is genuinely wrong for a specific case, update this document as part of the PR.

---

## TABLE OF CONTENTS

```
PART A  Universal Code Principles .............. SOLID, DRY, KISS, YAGNI, Fail Fast
PART B  Project Structure ...................... Monorepo layout, module boundaries
PART C  NestJS Backend Standards .............. Controllers, Services, Repositories, DTOs
PART D  API Contract — Response Format ........ Envelopes, status codes, pagination
PART E  API Contract — Request Standards ....... DTOs, validation, idempotency, correlation IDs
PART F  Exception Handling ..................... Hierarchy, filter, domain exceptions, Prisma mapping
PART G  Logging Standards ...................... Levels, structured format, logger, PII rules
PART H  React Frontend Standards .............. Components, hooks, state, API client
PART I  Flutter / Dart Standards ............... Widgets, Riverpod, offline-first, API client
PART J  Database Standards ..................... Migrations, queries, transactions
PART K  Testing Standards ...................... Structure, coverage, offline chaos tests
PART L  Git & PR Workflow ...................... Branches, commits, PR rules, review checklist
PART M  Documentation Standards ................ Comments, TSDoc, READMEs
PART N  Security Rules ......................... 15 non-negotiable P0 rules
PART O  Quick Reference Cards .................. One-page cheat sheets
```

---

# PART A — UNIVERSAL CODE PRINCIPLES

## A1. SOLID

---

### S — Single Responsibility

**One class / module / function has one reason to change.**

```typescript
// ❌ WRONG — TasksService does too many things
class TasksService {
  async completeTask(taskId: string) {
    await this.db.task.update({ where: { id: taskId }, data: { status: 'COMPLETED' } })
    await this.sendWhatsApp(task.customerId, 'Your task is complete')  // notification concern
    await this.generatePDF(taskId)                                    // document concern
    await this.deductInventory(task.partsUsed)                       // inventory concern
    await this.auditLog('TASK_COMPLETE', taskId)                      // audit concern
  }
}

// ✅ CORRECT — TasksService only manages task state; side effects via events
class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  async completeTask(taskId: string, tenantId: string): Promise<Task> {
    const task = await this.prisma.task.update({
      where: { id: taskId, tenantId },
      data:  { status: 'COMPLETED', completedAt: new Date() },
    })
    await this.events.publish(new TaskCompletedEvent(task))
    return task
    // NotificationsService, PdfService, InventoryService, AuditService
    // all react to TaskCompletedEvent independently — zero coupling
  }
}
```

**Rule P0:** A service method must not call another domain's service directly
unless it needs the return value to complete its own domain logic.
Cross-domain side effects go through events.

---

### O — Open/Closed

**Open for extension, closed for modification.**

```typescript
// ❌ WRONG — adding a new channel requires editing this class
class NotificationService {
  async send(channel: string, msg: string) {
    if (channel === 'whatsapp') { /* ... */ }
    else if (channel === 'sms') { /* ... */ }
    // every new channel = risk of breaking existing ones
  }
}

// ✅ CORRECT — new channel = new class, zero existing code changed
interface NotificationProvider {
  send(recipient: string, message: string): Promise<void>
  canHandle(channel: NotificationChannel): boolean
}
@Injectable() class WhatsAppProvider implements NotificationProvider { /* ... */ }
@Injectable() class SmsProvider    implements NotificationProvider { /* ... */ }
@Injectable() class PushProvider   implements NotificationProvider { /* ... */ }

@Injectable()
class NotificationService {
  constructor(@InjectAll('NOTIFICATION_PROVIDERS') private readonly providers: NotificationProvider[]) {}
  async send(channel: NotificationChannel, recipient: string, message: string) {
    const provider = this.providers.find(p => p.canHandle(channel))
    if (!provider) throw new UnsupportedChannelException(channel)
    await provider.send(recipient, message)
  }
}
```

**Rule P0:** Any switch/if-else that dispatches on a type, channel, or category
is a violation of O/C. Use polymorphism.

---

### L — Liskov Substitution

**Subtypes must be substitutable for their base types without altering correctness.**

```typescript
// ❌ WRONG — throws where base class promises a return value
class SubcontractorUser extends User {
  canViewCustomerPhone(): boolean {
    throw new Error('Not allowed')  // callers expect boolean, not a throw
  }
}

// ✅ CORRECT — safe default, never throws
class SubcontractorUser extends User {
  canViewCustomerPhone(): boolean { return false }
}
```

**Rule:** Never throw from a method the base class declares as returning a value.

---

### I — Interface Segregation

**No client should depend on methods it does not use.**

```typescript
// ❌ WRONG — fat interface forces every implementor to stub unused methods
interface FieldWorkerCapabilities {
  viewAllTasks(): Task[]    // dispatchers only
  viewPayroll(): void    // admins only
  completeTask(): void    // techs only
  checkIn(): void        // techs only
}

// ✅ CORRECT — split by consumer
interface FieldWorkerOps  { completeTask(id: string): Promise<void>; checkIn(dto: CheckInDto): Promise<void> }
interface DispatcherOps   { viewAllTasks(f: TaskFilter): Promise<Task[]>; reassignTask(id: string, to: string): Promise<void> }
interface AdminFinanceOps { viewPayroll(period: Period): Promise<PayrollSummary> }
```

---

### D — Dependency Inversion

**High-level modules must not depend on low-level modules. Both depend on abstractions.**

```typescript
// ❌ WRONG — hardcoded concrete dependency
class TasksService {
  async notifyTech(phone: string, msg: string) {
    const client = new MSG91Client(process.env.MSG91_KEY)  // concrete
    await client.sendSMS(phone, msg)
  }
}

// ✅ CORRECT — depends on interface; provider injected
interface SmsGateway { send(phone: string, msg: string): Promise<void> }

@Injectable()
class TasksService {
  constructor(@Inject('SMS_GATEWAY') private readonly sms: SmsGateway) {}
  async notifyTech(phone: string, msg: string) {
    await this.sms.send(phone, msg)
    // Swap MSG91 for Twilio = change one DI binding, zero service code changes
  }
}
```

**Rule P0:** No concrete third-party client (AWS SDK, MSG91, Razorpay, etc.)
may be imported directly in a domain service. Wrap in an adapter in `infrastructure/`.

---

## A2. Other Principles

### DRY — Don't Repeat Yourself

Every piece of knowledge has a single authoritative representation.

```typescript
// ❌ WRONG — tenant isolation check duplicated
async getTask(id: string, tenantId: string)    { const task = await this.prisma.task.findFirst({ where: { id, tenantId } }); if (!task) throw new NotFoundException() }
async updateTask(id: string, tenantId: string) { const task = await this.prisma.task.findFirst({ where: { id, tenantId } }); if (!task) throw new NotFoundException() }

// ✅ CORRECT — single authoritative helper
private async findOrFail(id: string, tenantId: string): Promise<Task> {
  const task = await this.prisma.task.findFirst({ where: { id, tenantId, deletedAt: null } })
  if (!task) throw new TaskNotFoundException(id)
  return task
}
async getTask(id: string, tenantId: string)               { return this.findOrFail(id, tenantId) }
async updateTask(id: string, tenantId: string, dto: any)  { await this.findOrFail(id, tenantId); return this.prisma.task.update({ where: { id }, data: dto }) }
```

> **DRY ≠ always extract.** Two code blocks that look identical but represent different
> business concepts should NOT be merged. DRY applies to knowledge, not text.

---

### KISS — Keep It Simple

The simplest solution that works is the right solution.

```
Signs you are over-engineering:
  • More than 3 layers of indirection for a CRUD operation
  • A factory that creates factories
  • A config object with 40 properties and 35 defaults
  • An abstract base class with only one subclass
  • Generic types with 4+ type parameters
Rule P1: Before adding abstraction, ask "what problem does this solve today?"
         If the answer is "future flexibility" — don't add it yet.
```

---

### YAGNI — You Ain't Gonna Need It

Do not implement features until they are actually required.

```typescript
// ❌ WRONG — dead code added "for future use"
class CustomerService {
  async getCustomer(id: string) { /* ... */ }
  async getCustomerWithAnalytics() { /* never called */ }
  async exportCustomerToSalesforce() { /* no integration yet */ }
}

// ✅ CORRECT — implement when a concrete requirement exists
class CustomerService {
  async getCustomer(id: string, tenantId: string): Promise<Customer> { /* ... */ }
}
```

---

### Fail Fast

Validate at the boundary. Never pass invalid state deeper into the system.

```typescript
// ❌ WRONG — invalid data travels deep before failing
@Post() async create(@Body() dto: any) {  // 'any' disables all validation
  return this.tasksService.create(dto)    // crashes inside with an unclear error
}

// ✅ CORRECT — invalid input rejected at the HTTP boundary immediately
@Post()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
async create(@Body() dto: CreateTaskDto, @TenantId() tenantId: string) {
  // tenantId from JWT — never from body
  // dto validated by class-validator — 400 returned before this line if invalid
  return this.tasksService.create(dto, tenantId)
}
```

**Rule P0:** `tenantId` is NEVER accepted from request body, query param, or any
client-controlled input. It is extracted from the verified JWT only.

---

### Law of Demeter — Don't Talk to Strangers

A method should only call methods on: itself, its parameters, objects it creates, its direct dependencies.

```typescript
// ❌ WRONG — three hops into unrelated domains
const city = task.customer.site.address.city

// ✅ CORRECT — deliberate JOIN, one hop
const task = await this.prisma.task.findFirst({
  where: { id },
  include: { site: { select: { city: true } } }
})
const city = task.site.city
```

---

### Explicit over Implicit

Code should say what it does. Magic is a maintenance trap.

```typescript
// ❌ WRONG — magic string transitions with no record of what's allowed
async updateStatus(id: string, status: string) {
  await this.prisma.task.update({ where: { id }, data: { status } })
}

// ✅ CORRECT — allowed transitions are explicit, typed, and enforced
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.DRAFT]:       [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]:    [TaskStatus.ACCEPTED, TaskStatus.CANCELLED, TaskStatus.DRAFT],
  [TaskStatus.ACCEPTED]:    [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.PAUSED, TaskStatus.SUBMITTED, TaskStatus.CANCELLED],
  [TaskStatus.PAUSED]:      [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.SUBMITTED]:   [TaskStatus.COMPLETED, TaskStatus.REJECTED],
  [TaskStatus.REJECTED]:    [TaskStatus.IN_PROGRESS],
  [TaskStatus.COMPLETED]:   [],
  [TaskStatus.CANCELLED]:   [],
}

async transitionStatus(id: string, tenantId: string, newStatus: TaskStatus) {
  const task    = await this.findOrFail(id, tenantId)
  const allowed = ALLOWED_TRANSITIONS[task.status]
  if (!allowed.includes(newStatus))
    throw new InvalidStatusTransitionException(task.status, newStatus, allowed)
  return this.prisma.task.update({ where: { id }, data: { status: newStatus } })
}
```

---

### Early Return — Flatten Nesting

Never nest more than 3 levels deep. Use guard clauses and early returns.

```typescript
// ❌ WRONG — pyramid of doom
async processTask(id: string, tenantId: string) {
  const task = await this.findById(id, tenantId)
  if (task) {
    if (task.status === 'SUBMITTED') {
      if (task.assignedTo) {
        return this.approve(task)
      } else { throw new Error('Not assigned') }
    } else { throw new Error('Wrong status') }
  } else { throw new NotFoundException() }
}

// ✅ CORRECT — flat, readable, guard clauses
async processTask(id: string, tenantId: string) {
  const task = await this.findOrFail(id, tenantId)
  if (task.status !== 'SUBMITTED') throw new InvalidStatusTransitionException(task.status, 'COMPLETED', ['SUBMITTED'])
  if (!task.assignedTo)            throw new TaskNotAssignedException(id)
  return this.approve(task)
}
```

---

# PART B — PROJECT STRUCTURE

## B1. Monorepo Layout

```
fieldbrix/                          Root (Turborepo)
├── apps/
│   ├── api/                      NestJS backend
│   │   └── src/
│   │       ├── modules/          One folder per domain module
│   │       │   ├── tasks/
│   │       │   │   ├── tasks.module.ts
│   │       │   │   ├── tasks.controller.ts   HTTP only — no logic
│   │       │   │   ├── tasks.service.ts      Business logic only
│   │       │   │   ├── tasks.repository.ts   DB queries only
│   │       │   │   ├── dto/
│   │       │   │   │   ├── create-task.dto.ts
│   │       │   │   │   ├── update-task.dto.ts
│   │       │   │   │   └── task-response.dto.ts
│   │       │   │   ├── events/
│   │       │   │   │   ├── task-completed.event.ts
│   │       │   │   │   └── task-assigned.event.ts
│   │       │   │   ├── exceptions/
│   │       │   │   │   └── invalid-status-transition.exception.ts
│   │       │   │   └── tasks.service.spec.ts
│   │       │   └── customers/ auth/ billing/ attendance/ inventory/...
│   │       ├── shared/
│   │       │   ├── decorators/     @TenantId() @CurrentUser() @Roles()
│   │       │   ├── guards/         JwtAuthGuard RolesGuard TenantGuard
│   │       │   ├── interceptors/   ResponseTransformInterceptor AuditInterceptor
│   │       │   ├── filters/        GlobalExceptionFilter
│   │       │   ├── pipes/          TrimStringsPipe
│   │       │   ├── middleware/     CorrelationIdMiddleware RequestLoggingMiddleware
│   │       │   ├── exceptions/     DomainException + all typed exceptions
│   │       │   └── prisma/         PrismaService PrismaModule
│   │       └── infrastructure/     Adapters (implement domain interfaces)
│   │           ├── aws/            S3Adapter SqsAdapter
│   │           ├── whatsapp/       WhatsAppAdapter
│   │           └── payments/       RazorpayAdapter
│   └── web/                      Vite + React
│       └── src/
│           ├── pages/            Route-level components (smart)
│           ├── components/       Reusable UI (dumb)
│           ├── hooks/            Custom hooks (data fetching, state)
│           ├── lib/
│           │   ├── api/          Axios client + response parsing
│           │   └── queries/      TanStack Query definitions
│           └── store/            Zustand stores
├── lambdas/                      Python (stateless async tasks)
│   ├── pdf/                      WeasyPrint + Jinja2
│   ├── scheduler/                Renewal ladder, SLA timers
│   ├── notifications/            WhatsApp, SMS, email dispatch
│   └── media/                    S3 photo compression
├── mobile/                       Flutter
│   └── lib/
│       ├── features/             Feature-first organisation
│       │   └── tasks/
│       │       ├── data/         Repository + DTOs + models
│       │       ├── domain/       Business logic (pure Dart)
│       │       └── presentation/ Widgets + Riverpod providers
│       └── core/                 Shared: API client, DB, sync, router
└── packages/
    ├── types/                    Shared TypeScript types (api + web import)
    ├── schemas/                  Shared Zod schemas (validation: same rules FE+BE)
    └── config/                   ESLint, TSConfig, Prettier base configs
```

## B2. Module Boundary Rules

```
Rule P0: No file in modules/ may import from infrastructure/ directly.
         Modules import interfaces. Infrastructure implements them.
         The DI container wires them together.

Rule P0: No cross-module imports except through well-defined events or
         shared DTOs in packages/types.

Rule P1: If a service needs data from another domain, fire an event and
         let the other service react — or expose a dedicated query method
         on the other module's service (one-way dependency only).

Allowed dependency direction:
  Controller → Service → Repository → Prisma
  Service → EventBus → (other services react)
  Service → Interfaces (defined in shared/)
  Infrastructure adapters → Interfaces (implement them)
  ❌ Repository → Service (circular)
  ❌ Controller → Repository (skip layer)
  ❌ Service → Controller (skip layer)
```

---

# PART C — NESTJS BACKEND STANDARDS

## C1. Controllers

```typescript
// Controllers ONLY:
//   1. Parse and validate HTTP input (via DTOs + Guards)
//   2. Call ONE service method
//   3. Return the result
// Zero business logic. Zero DB calls. Zero conditionals.

@Controller('tasks')
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(AuditInterceptor, ResponseTransformInterceptor)
export class TasksController {

  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(Role.DISPATCHER, Role.OPS_MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTaskDto,
    @TenantId()    tenantId: string,    // from JWT via decorator
    @CurrentUser() user: AuthUser,      // from JWT via decorator
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(dto, tenantId, user.id)
  }

  @Get()
  @Roles(Role.DISPATCHER, Role.OPS_MANAGER, Role.SUPERVISOR, Role.OWNER)
  async findAll(
    @Query() filter: ListTasksDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResult<TaskResponseDto>> {
    return this.tasksService.findAll(filter, tenantId)
  }

  @Patch(':id/status')
  @Roles(Role.DISPATCHER, Role.OPS_MANAGER, Role.OWNER)
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionStatusDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TaskResponseDto> {
    return this.tasksService.transitionStatus(id, dto.status, tenantId, user.id)
  }
}

// Rule P0: Controllers have no if statements.
//          Any conditional = controller is doing the service's task.
// Rule P0: tenantId and user come from JWT decorators — never from dto.
```

---

## C2. Services

```typescript
@Injectable()
export class TasksService {
  // Services are the ONLY home for business logic.
  // They orchestrate repositories, events, and domain interfaces.
  // They never import Request/Response. Never touch HTTP.

  constructor(
    private readonly tasksRepository:    TasksRepository,
    private readonly events:            EventBus,
    @Inject('NOTIFICATION_GATEWAY')
    private readonly notify:            NotificationGateway,
  ) {}

  // Every public method must:
  //   1. Accept tenantId as an explicit parameter
  //   2. Return a typed result (never 'any')
  //   3. Have a name that states its PURPOSE, not its implementation
  async assignToWorker(
    taskId:      string,
    workerId:   string,
    reason:     string,
    tenantId:   string,
    assignedBy: string,
  ): Promise<TaskAssignmentResult> {
    const task    = await this.tasksRepository.findOrFail(taskId, tenantId)
    const worker = await this.tasksRepository.findWorkerOrFail(workerId, tenantId)

    this.assertCanAssign(task, worker)  // private guard — throws if rule violated

    const assignment = await this.tasksRepository.createAssignment({
      taskId: taskId, assigneeId: workerId, reason, assignedBy,
    })
    await this.events.publish(new TaskAssignedEvent({ task, worker, assignment }))
    return { task, assignment }
  }

  // Private guard methods encode business rules as named, testable units
  private assertCanAssign(task: Task, worker: User): void {
    if (!['DRAFT','ASSIGNED'].includes(task.status))
      throw new InvalidStatusTransitionException(task.status, 'ASSIGNED', ['DRAFT','ASSIGNED'])
    if (worker.status !== 'ACTIVE')
      throw new WorkerNotAvailableException(worker.id, `Worker status is ${worker.status}`)
  }
}
```

---

## C3. Repositories

```typescript
// Repositories ONLY contain Prisma queries.
// Zero business logic. Zero conditionals that express rules.

@Injectable()
export class TasksRepository {

  constructor(private readonly prisma: PrismaService) {}

  // Rule P0: every query includes tenantId in the WHERE clause
  async findById(id: string, tenantId: string): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findOrFail(id: string, tenantId: string): Promise<Task> {
    const task = await this.findById(id, tenantId)
    if (!task) throw new TaskNotFoundException(id)
    return task
  }

  // Complex filters go in the repository — not the service
  async findByFilter(filter: ListTasksDto, tenantId: string): Promise<PaginatedResult<Task>> {
    const where = {
      tenantId,
      deletedAt:  null,
      status:     filter.status     ? { in: filter.status }  : undefined,
      assignedTo: filter.assigneeId ?? undefined,
      scheduledStart:filter.scheduledFrom ? { gte: filter.scheduledFrom } : undefined,
      isOverdue:  filter.overdueOnly  ? true : undefined,
    }
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { scheduledStart: 'asc' },
        take:    filter.limit,
        skip:    filter.offset,
      }),
      this.prisma.task.count({ where }),
    ])
    return { items, total, page: filter.page, limit: filter.limit }
  }

  // Multi-step mutations use transactions
  async completeWithParts(taskId: string, parts: CreatePartsUsedDto[], tenantId: string): Promise<Task> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({ where: { id: taskId }, data: { status: 'COMPLETED' } })
      await tx.partsUsed.createMany({ data: parts.map(p => ({ ...p, taskId: taskId, tenantId })) })
      return task
    })
  }
}
```

---

## C4. DTOs

```typescript
// Rule P0: tenantId, createdBy, updatedBy, status are NEVER in any input DTO.
// Rule P0: idempotencyKey is REQUIRED on every mutation endpoint.
// Rule P1: whitelist: true — unknown fields are stripped, never persisted.

export class CreateTaskDto {

  @IsUUID()
  customerId: string

  @IsUUID()
  siteId: string

  @IsUUID() @IsOptional()
  serviceTargetId?: string

  @IsUUID()
  workflowVersionId: string

  @IsString() @MaxLength(100)
  workType: string  // tasks.work_type is NOT NULL — required, no default

  @IsEnum(TaskPriority) @IsOptional()
  priority?: TaskPriority

  @IsISO8601() @IsOptional() @Type(() => Date)
  scheduledStart?: Date

  @IsISO8601() @IsOptional() @Type(() => Date)
  scheduledEnd?: Date

  @IsString() @MaxLength(1000) @IsOptional()
  description?: string

  @IsString() @Length(36, 36)
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  idempotencyKey: string  // UUID v4, generated on client at moment of action

  // ❌ NEVER include: tenantId, createdBy, status, taskNumber, deletedAt
}

// Standard pagination DTO — always extend this, never reinvent it
export class PaginationDto {
  @IsInt() @Min(1) @Max(100) @IsOptional() @Type(() => Number)
  limit?: number = 20

  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  page?: number = 1

  get offset(): number { return ((this.page ?? 1) - 1) * (this.limit ?? 20) }
}
```

---

## C5. Naming Conventions — Backend

```
Files          : kebab-case.ts            tasks.service.ts  create-task.dto.ts
Classes        : PascalCase               TasksService  CreateTaskDto  TaskAssignedEvent
Interfaces     : PascalCase (no I prefix) NotificationGateway (not INotificationGateway)
Enums          : PascalCase               TaskStatus  TaskPriority
Enum values    : SCREAMING_SNAKE          TaskStatus.IN_PROGRESS
Methods        : camelCase, verb-first    assignToWorker()  findOrFail()  assertCanAssign()
Variables      : camelCase, noun          assignedTask  workerList
Constants      : SCREAMING_SNAKE          ALLOWED_TRANSITIONS  MAX_RETRY_COUNT
Booleans       : is/has/can prefix        isOverdue  hasGpsException  canViewPii
Method length  : max 30 lines — extract private helpers if longer
File length    : max 300 lines — split the module if longer
Nesting depth  : max 3 levels — flatten with early returns
```

---

# PART D — API CONTRACT: RESPONSE FORMAT

## D1. The Golden Rule

> **Every API call returns the same envelope shape — success or failure.**
> The client never guesses. The body always tells the full story.

---

## D2. Success Responses

```json
// Single resource — HTTP 200 or 201
{
  "success": true,
  "data": {
    "id": "9f4e1a2b-...",
    "taskNumber": "T-20260808-000042",
    "status": "ASSIGNED"
  },
  "meta": {
    "requestId": "req_7x9k2m4n",
    "timestamp": "2026-08-08T14:23:45.123Z",
    "apiVersion": "v1"
  }
}

// Paginated list — HTTP 200
{
  "success": true,
  "data": [ { "id": "..." }, { "id": "..." } ],
  "pagination": {
    "total":      124,
    "page":         2,
    "limit":       20,
    "totalPages":   7,
    "hasNext":   true,
    "hasPrev":   true
  },
  "meta": { "requestId": "req_7x9k2m4n", "timestamp": "...", "apiVersion": "v1" }
}

// Action with no returnable resource — HTTP 200 (NOT 204)
{
  "success": true,
  "data": null,
  "meta": { "requestId": "req_7x9k2m4n", "timestamp": "...", "apiVersion": "v1" }
}
```

> **Rule P0:** We do NOT use HTTP 204. Reason: 204 has no body. Mobile and web clients
> always expect the envelope. Use 200 with `data: null` instead.

---

## D3. Error Responses

```json
// Validation error — HTTP 400
{
  "success": false,
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "Request validation failed. Fix the fields listed in 'fields'.",
    "fields": [
      { "field": "scheduledStart", "value": "not-a-date", "message": "Must be a valid ISO 8601 date" },
      { "field": "customerId",  "value": "12345",       "message": "Must be a UUID" }
    ],
    "requestId": "req_7x9k2m4n",
    "timestamp": "2026-08-08T14:23:45.123Z"
  }
}

// Business rule violation — HTTP 422
{
  "success": false,
  "error": {
    "code":    "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from IN_PROGRESS to DRAFT.",
    "hint":    "Allowed next statuses: PAUSED, SUBMITTED, CANCELLED.",
    "context": {
      "currentStatus":     "IN_PROGRESS",
      "requestedStatus":   "DRAFT",
      "allowedTransitions": ["PAUSED", "SUBMITTED", "CANCELLED"]
    },
    "requestId": "req_7x9k2m4n",
    "timestamp": "2026-08-08T14:23:45.123Z"
  }
}

// Idempotency replay — HTTP 409 (TREAT AS SUCCESS on client)
{
  "success": false,
  "error": {
    "code":    "DUPLICATE_IDEMPOTENCY_KEY",
    "message": "Already processed. Original result is in 'data'.",
    "hint":    "This is a safe replay.",
    "data":    { "id": "9f4e1a2b-...", "taskNumber": "T-20260808-000042" },
    "requestId": "req_7x9k2m4n",
    "timestamp": "2026-08-08T14:23:45.123Z"
  }
}

// Unauthorised — HTTP 401
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Authentication required.", "requestId": "...", "timestamp": "..." }
}

// Forbidden — HTTP 403
{
  "success": false,
  "error": { "code": "FORBIDDEN", "message": "Role FIELD_WORKER cannot approve tasks.", "requestId": "...", "timestamp": "..." }
}

// Not found — HTTP 404
{
  "success": false,
  "error": { "code": "TASK_NOT_FOUND", "message": "Task 9f4e1a2b-... was not found or does not belong to your account.", "requestId": "...", "timestamp": "..." }
}

// Server error — HTTP 500 (no internal details ever exposed)
{
  "success": false,
  "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred. Quote requestId to support.", "requestId": "req_7x9k2m4n", "timestamp": "..." }
}
```

---

## D4. HTTP Status Code Map

```
200  Successful GET, successful action returning data           OK
201  Successful POST that created a resource                    Created
200  Successful action with no returnable data   (data: null)  OK  — NOT 204
400  Malformed input (wrong types, missing fields)             Bad Request
401  No token, expired token, invalid signature                Unauthorized
403  Valid token, role lacks permission                        Forbidden
404  Resource not found (or cross-tenant probe)                Not Found
409  Idempotency replay / duplicate unique constraint          Conflict
422  Business rule violation (valid input, invalid state)      Unprocessable Entity
429  Rate limit exceeded                                       Too Many Requests
500  Unexpected server error                                   Internal Server Error
503  Planned maintenance / health check failing                Service Unavailable

Rule P0: Never use 200 for an error.
Rule P0: Never use 204 — always return the envelope.
Rule:    422 = domain rule violation.  400 = input format violation.  Never swap.
Rule:    404 message never reveals whether the resource exists in another tenant.
```

---

## D5. Response Interceptor (NestJS)

```typescript
// shared/interceptors/response-transform.interceptor.ts
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req       = ctx.switchToHttp().getRequest<Request>()
    const requestId = (req.headers['x-request-id'] as string) ?? generateRequestId()

    return next.handle().pipe(
      map((data) => {
        // Paginated result detection (service returns { items, total, page, limit })
        if (data && typeof data === 'object' && 'items' in data && 'total' in data) {
          return {
            success:    true,
            data:       data.items,
            pagination: {
              total:      data.total,
              page:       data.page,
              limit:      data.limit,
              totalPages: Math.ceil(data.total / data.limit),
              hasNext:    data.page * data.limit < data.total,
              hasPrev:    data.page > 1,
            },
            meta: buildMeta(requestId),
          }
        }
        return { success: true, data: data ?? null, meta: buildMeta(requestId) }
      }),
    )
  }
}

function buildMeta(requestId: string) {
  return { requestId, timestamp: new Date().toISOString(), apiVersion: 'v1' }
}

// Register globally in main.ts:
// app.useGlobalInterceptors(new ResponseTransformInterceptor())
```

---

# PART E — API CONTRACT: REQUEST STANDARDS

## E1. Validation Pipe (global)

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist:            true,   // strip fields not declared in DTO
  forbidNonWhitelisted: true,   // 400 if unknown fields sent (prevents injection)
  transform:            true,   // auto-transform types
  transformOptions: { enableImplicitConversion: false },  // explicit @Type() required
  exceptionFactory: (errors) =>
    new BadRequestException(errors.flatMap(e => Object.values(e.constraints ?? {})))
}))
```

## E2. Correlation ID Middleware

```typescript
// Every request gets a correlation ID.
// It flows through: all log entries, response meta, Lambda invocations,
// WhatsApp notifications, and Prisma query comments.
// Support queries all logs by correlationId to trace a full request.

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ??
      (req.headers['x-request-id']    as string)  ??
      `req_${randomBytes(6).toString('hex')}`

    req['correlationId'] = correlationId
    res.setHeader('x-request-id',     correlationId)
    res.setHeader('x-correlation-id', correlationId)
    correlationStore.run({ correlationId }, next)
  }
}
// Mobile app sends its own correlationId in X-Correlation-Id header
// for offline submissions — essential for matching device logs to server logs
```

## E3. Idempotency Rules

```typescript
// Rule P0: idempotencyKey required on every mutation (POST/PATCH that creates/changes state)
// Rule P0: key is generated on the CLIENT at the moment of user action — not at send time
// Rule:    same key on retry → server returns cached response → no duplicate

// Server-side check in every mutation handler (via IdempotencyService):
async create(dto: CreateTaskDto, tenantId: string, actorId: string) {
  return this.idempotency.executeOnce(
    dto.idempotencyKey, tenantId, 'CREATE_TASK', null,
    async () => {
      // This block runs ONLY on first call.
      // On retry: skipped, cached response returned.
      const task = await this.tasksRepository.create(dto, tenantId, actorId)
      await this.events.publish(new TaskCreatedEvent(task))
      return task
    }
  )
}
```

---

# PART F — EXCEPTION HANDLING

## F1. Exception Hierarchy

```
DomainException (base — never throw directly)
│
├── 400 Bad Request
│   └── InvalidIdFormatException
│
├── 401 Unauthorized
│   ├── TokenExpiredException
│   └── InvalidTokenException
│
├── 403 Forbidden
│   ├── InsufficientRoleException
│   └── TenantMismatchException          ← cross-tenant probe attempt
│
├── 404 Not Found
│   ├── TaskNotFoundException
│   ├── CustomerNotFoundException
│   ├── SiteNotFoundException
│   ├── UserNotFoundException
│   └── WorkflowVersionNotFoundException
│
├── 409 Conflict
│   ├── IdempotencyReplayException        ← includes original result in context
│   ├── DuplicateCustomerCodeException
│   └── DuplicateTaskNumberException
│
├── 422 Unprocessable (business rules)
│   ├── InvalidStatusTransitionException  ← includes allowed transitions
│   ├── WorkerNotAvailableException
│   ├── OfflineSubmissionExpiredException
│   ├── CustomerOnHoldException
│   ├── SiteNotActiveException
│   └── PlanLimitExceededException
│
└── 500 Internal (should never reach production)
    ├── DatabaseConnectionException
    └── ExternalServiceException

Rules:
  Every 422 must include context (what was expected, what was found).
  Every 409 from idempotency replay must include the original result.
  500s are never exposed to clients — requestId only.
  If you are about to write 'throw new Error()', stop and create a DomainException.
```

## F2. DomainException Base Class

```typescript
// shared/exceptions/domain.exception.ts
export abstract class DomainException extends Error {
  abstract readonly code:       string
  abstract readonly httpStatus: number

  constructor(
    message:             string,
    public readonly hint?:    string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

// Example typed exceptions
export class TaskNotFoundException extends DomainException {
  readonly code = 'TASK_NOT_FOUND'; readonly httpStatus = 404
  constructor(id: string) { super(`Task ${id} was not found or does not belong to your account.`) }
}

export class InvalidStatusTransitionException extends DomainException {
  readonly code = 'INVALID_STATUS_TRANSITION'; readonly httpStatus = 422
  constructor(from: string, to: string, allowed: string[]) {
    super(`Cannot transition from ${from} to ${to}.`, `Allowed: ${allowed.join(', ')}.`, { from, to, allowed })
  }
}

export class IdempotencyReplayException extends DomainException {
  readonly code = 'DUPLICATE_IDEMPOTENCY_KEY'; readonly httpStatus = 409
  constructor(key: string, public readonly originalResult: unknown) {
    super(`Request with key '${key}' already processed.`, 'Safe replay. Original result in data.')
  }
}
```

## F3. Global Exception Filter

```typescript
// shared/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new FieldbrixLogger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()
    const requestId = req['correlationId'] ?? 'unknown'

    const { status, body } = this.mapException(exception, requestId)

    // Log appropriately (see Part G logging rules)
    if (status >= 500) this.logger.error('Unhandled server error', { requestId, stack: exception instanceof Error ? exception.stack : String(exception) })
    else if (status >= 400 && status !== 404) this.logger.warn('Client error', { requestId, code: (exception as any)?.code })

    res.status(status).json(body)
  }

  private mapException(exception: unknown, requestId: string) {
    // ① Domain exceptions (business rules)
    if (exception instanceof DomainException) {
      const body: any = { success: false, error: { code: exception.code, message: exception.message, requestId, timestamp: new Date().toISOString() } }
      if (exception.hint)    body.error.hint    = exception.hint
      if (exception.context) body.error.context = exception.context
      if (exception instanceof IdempotencyReplayException) body.error.data = exception.originalResult
      return { status: exception.httpStatus, body }
    }
    // ② NestJS HttpException (validation errors, auth, etc.)
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      if (typeof res === 'object' && Array.isArray((res as any).message)) {
        return { status: 400, body: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', fields: this.parseValidationMessages((res as any).message), requestId, timestamp: new Date().toISOString() } } }
      }
      return { status: exception.getStatus(), body: { success: false, error: { code: this.statusToCode(exception.getStatus()), message: typeof res === 'string' ? res : (res as any).message, requestId, timestamp: new Date().toISOString() } } }
    }
    // ③ Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaError(exception, requestId)
    }
    // ④ Everything else = 500 (no internals ever exposed)
    return { status: 500, body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error. Quote requestId to support.', requestId, timestamp: new Date().toISOString() } } }
  }

  private mapPrismaError(err: Prisma.PrismaClientKnownRequestError, requestId: string) {
    const map: Record<string, [number, string, string]> = {
      P2002: [409, 'DUPLICATE_RECORD',      `A record with this ${(err.meta?.target as string[])?.join(', ')} already exists.`],
      P2025: [404, 'RECORD_NOT_FOUND',      'Record not found.'],
      P2003: [422, 'FOREIGN_KEY_VIOLATION', 'A referenced record does not exist.'],
      P2023: [400, 'INVALID_ID_FORMAT',     'One or more IDs are not valid UUIDs.'],
    }
    const [status, code, message] = map[err.code] ?? [500, 'DATABASE_ERROR', 'A database error occurred.']
    return { status, body: { success: false, error: { code, message, requestId, timestamp: new Date().toISOString() } } }
  }

  private parseValidationMessages(messages: string[]): FieldError[] {
    return messages.map(msg => { const [field, ...rest] = msg.split(' '); return { field, message: msg } })
  }

  private statusToCode(s: number): string {
    return { 400:'BAD_REQUEST', 401:'UNAUTHORIZED', 403:'FORBIDDEN', 404:'NOT_FOUND', 409:'CONFLICT', 422:'UNPROCESSABLE_ENTITY', 429:'RATE_LIMITED', 500:'INTERNAL_ERROR', 503:'SERVICE_UNAVAILABLE' }[s] ?? 'UNKNOWN_ERROR'
  }
}
// Register globally:  app.useGlobalFilters(new GlobalExceptionFilter())
```

---

# PART G — LOGGING STANDARDS

## G1. Log Levels

```
FATAL   Process cannot continue. Immediate page.
        app.use('exit') fires. Should never occur in healthy production.
        logger.fatal('DB connection failed at startup', { host, err })

ERROR   An operation failed and requires investigation. Alert fires. Ticket auto-created.
        Should be near-zero in healthy production.
        logger.error('S3 upload failed after retries', { s3Key, err, retries })

WARN    Unexpected but recovered. Review in weekly ops meeting. No immediate alert.
        logger.warn('Mock location detected', { userId, taskId, lat, lng })
        logger.warn('Client error rate elevated', { tenantId, errorRate, windowMin: 5 })

INFO    Normal business events. No action required. Searchable event history.
        logger.info('Task completed', { taskId, tenantId, result, durationMs })
        logger.info('User logged in', { userId, tenantId, device, appVersion })

DEBUG   Technical detail. Disabled in production default. Enable per-tenant to debug.
        logger.debug('Prisma query', { query, durationMs })
        logger.debug('Sync batch received', { mutations: 12, deviceId })

TRACE   Step-by-step algorithm. Development only. Never deployed.
```

## G2. Structured Log Format — Every Entry Is JSON

```json
{
  "timestamp":     "2026-08-08T14:23:45.123Z",
  "level":         "INFO",
  "service":       "fieldbrix-api",
  "module":        "TasksService",
  "method":        "completeTask",
  "tenantId":      "abc-123",
  "actorId":       "user-456",
  "correlationId": "req_7x9k2m4n",
  "message":       "Task completed successfully",
  "taskId":        "task-789",
  "durationMs":    143,
  "env":           "production",
  "appVersion":    "2.4.1"
}
```

## G3. Logger Service

```typescript
// shared/logger/fieldbrix-logger.ts
export class FieldbrixLogger {
  private readonly winston: WinstonLogger

  constructor(private readonly module: string) {
    this.winston = createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
      transports: [new transports.Console()],
    })
  }

  error(message: string, ctx?: LogContext & { err?: Error }) {
    const { err, ...rest } = ctx ?? {}
    this.log('error', message, { ...rest, ...(err && { stack: err.stack, errorName: err.name }) })
  }
  warn (msg: string, ctx?: LogContext) { this.log('warn',  msg, ctx) }
  info (msg: string, ctx?: LogContext) { this.log('info',  msg, ctx) }
  debug(msg: string, ctx?: LogContext) { this.log('debug', msg, ctx) }

  private log(level: string, message: string, ctx?: LogContext) {
    const store = correlationStore.getStore()
    this.winston.log(level, message, {
      module:        this.module,
      correlationId: store?.correlationId,
      service:       'fieldbrix-api',
      env:           process.env.NODE_ENV,
      appVersion:    process.env.APP_VERSION,
      ...ctx,
    })
  }
}
```

## G4. What to NEVER Log

```
❌ NEVER:
  JWT tokens (full or partial)
  Passwords or password hashes
  API keys, secrets, or credentials (log 'api_key: [redacted]')
  Aadhaar, PAN, passport, SSN numbers
  Full credit card numbers or CVVs
  OTP codes
  S3 presigned URLs (they are temporary access grants)
  Full request bodies (may contain PII)
  Full response bodies (same reason)
  Full customer phone numbers → log last 4 only: '**7890'

✅ SAFE:
  UUIDs (tenantId, userId, taskId — identifiers, not PII)
  Task numbers (T-20260808-000042)
  Status values, priority, error codes
  Durations, latency in ms, counts
  HTTP method + URL path (NOT query params if they contain tokens)
  Action names: 'task_completed', 'payment_received'
  Partial phone for debugging: '**7890'
```

## G5. Audit Log vs Operational Log — Two Separate Systems

```
OPERATIONAL LOGS (Winston → CloudWatch)
  Purpose   : Engineering debug and alerting
  Audience  : Engineers, SRE
  Retention : 30 days
  Storage   : CloudWatch Log Groups
  PII       : Must not contain PII
  Example   : "S3 upload completed | taskId=abc | durationMs=234"

AUDIT LOG (audit_logs table in PostgreSQL)
  Purpose   : Business accountability, compliance, dispute resolution
  Audience  : Tenant admins, auditors, compliance officers, support
  Retention : 8 years (India GST) / 6 years (UK) / 7 years (US)
  Storage   : Append-only hash-chained DB table
  PII       : Contains entity diffs — handled per DPDP/GDPR
  Example   : actor=Ravi, action=TASK_COMPLETE, before={status:IN_PROGRESS}, after={status:COMPLETED}

Rule P0: A CloudWatch log entry is NOT a substitute for an audit event.
Rule P0: An audit event is NOT a substitute for a log entry.
Both are mandatory. They serve completely different audiences.
```

---

# PART H — REACT FRONTEND STANDARDS

## H1. Component Rules

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

## H2. Custom Hooks

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
    onError: (error: ApiError) => handleApiError(error),  // see H3
  })
}
```

## H3. API Client & Error Handling

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

## H4. Naming Conventions — Frontend

```
Files          : PascalCase.tsx for components, camelCase.ts for everything else
Components     : PascalCase               DispatchBoard  TaskCard  PriorityBadge
Hooks          : camelCase, use prefix    useTask  useAssignTask  useCurrentUser
Query keys     : array literals           ['tasks']  ['tasks', id]  ['tasks', 'list', filter]
Event handlers : handle prefix            handleAssign  handleStatusChange
Boolean props  : is/has/can              isLoading  hasError  canEdit
```

---

# PART I — FLUTTER / DART STANDARDS

## I1. Widget Rules

```dart
// Widgets display state and emit events. No business logic. No async in build().

// ❌ WRONG — async work in build
class TaskCard extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final task = ref.watch(taskFutureProvider);  // triggers on every rebuild
    if (task == null) return CircularProgressIndicator();
    return Text(task.title);
  }
}

// ✅ CORRECT — AsyncValue handles all states cleanly
class TaskCard extends ConsumerWidget {
  final String taskId;
  const TaskCard({required this.taskId, super.key});

  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(taskProvider(taskId)).when(
      data:    (task)   => TaskCardContent(task: task),
      loading: ()      => const TaskCardSkeleton(),
      error:   (e, st) => TaskCardError(error: e),
    );
  }
}
```

## I2. Riverpod Providers

```dart
// Declare at file top-level — NEVER inside a widget or method
final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository(db: ref.watch(driftDatabaseProvider), sync: ref.watch(powerSyncProvider))
});

final taskProvider = FutureProvider.family<Task, String>((ref, taskId) async {
  return ref.watch(tasksRepositoryProvider).findById(taskId)
});

// Test override — clean, zero coupling
final container = ProviderContainer(overrides: [
  tasksRepositoryProvider.overrideWithValue(MockTasksRepository()),
]);
```

## I3. Offline-First Rule

```dart
// Rule P0: Every user action that mutates data must:
//   1. Write to local Drift DB first
//   2. Add to PowerSync upload queue
//   3. Return immediately — NEVER wait for network

// ❌ WRONG — blocks if offline
Future<void> completeTask(String taskId, CompleteTaskDto dto) async {
  await api.tasks.complete(taskId, dto)  // hangs when offline
  await localDb.updateTaskStatus(taskId, TaskStatus.completed)
}

// ✅ CORRECT — local-first
Future<void> completeTask(String taskId, CompleteTaskDto dto) async {
  // 1. Write locally — always succeeds
  await localDb.updateTaskStatus(taskId, TaskStatus.completed)
  // 2. Queue mutation — PowerSync syncs on reconnect
  await localDb.storePendingMutation(
    id:        const Uuid().v4(),  // stable UUID — idempotency key
    table:     'tasks',            // real server table — not a made-up name
    operation: 'UPDATE',
    payload:   dto.toJson(),
  )
  // 3. Return immediately — UI updates from local state, user never waits
}
```

## I4. Flutter API Client

```dart
// Mirrors the server envelope exactly
class ApiClient {
  Future<ApiResponse<T>> post<T>(String path, Map<String, dynamic> body, T Function(dynamic) fromJson) async {
    body['idempotencyKey'] ??= const Uuid().v4()  // auto-attach if not provided
    try {
      final response = await _dio.post(path, data: body)
      return ApiResponse.fromJson(response.data, fromJson)
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        final errorCode = e.response?.data?['error']?['code'] as String?
        if (errorCode == 'DUPLICATE_IDEMPOTENCY_KEY') {
          // Idempotency replay → treat as success
          return ApiResponse.fromJson({ 'success': true, 'data': e.response?.data?['error']?['data'], 'meta': {} }, fromJson)
        }
      }
      return _handleDioError<T>(e)
    }
  }
}
```

## I5. Naming Conventions — Flutter

```
Files      : snake_case.dart             task_card.dart  tasks_repository.dart
Classes    : PascalCase                  TaskCard  TasksRepository  CheckInEvent
Providers  : camelCase, noun suffix      taskProvider  tasksRepositoryProvider
Methods    : camelCase, verb-first       completeTask()  findById()  handleCheckIn()
Constants  : lowerCamelCase             const maxPhotoSize = 1024 * 1024
Private    : _ prefix                   _buildHeader()  _isLoading
Booleans   : is/has/can                 isSyncing  hasGpsException  canCheckIn
```

---

# PART J — DATABASE STANDARDS

## J1. Migration Rules

```sql
-- Every migration:
--   1. Named: 20260808_001_add_task_flags.sql
--   2. Idempotent: safe to run twice (IF NOT EXISTS, ON CONFLICT DO NOTHING)
--   3. Non-destructive: never DROP in same migration as ADD replacement
--   4. Reversible: every up-migration has a paired down-migration
--   5. Tested on staging with production-scale data volume before merge

-- ❌ WRONG — destructive, breaks rollback
ALTER TABLE tasks DROP COLUMN old_status;
ALTER TABLE tasks ADD  COLUMN status TEXT;

-- ✅ CORRECT — two-phase, safe rollback
-- Phase 1 (this migration): add new column, keep old, backfill
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_v2 task_status;
UPDATE tasks SET status_v2 = status::task_status WHERE status_v2 IS NULL;
-- Phase 2 (next sprint, after phase 1 confirmed stable for 1 week):
-- ALTER TABLE tasks DROP COLUMN IF EXISTS status;
-- ALTER TABLE tasks RENAME COLUMN status_v2 TO status;
```

**Rule P0:** Never drop a column in the same migration that adds its replacement.

## J2. Query Rules

```typescript
// Rule P0: every Prisma query includes tenantId in WHERE
// Rule P1: select only the fields you need — never findMany with no select on large tables
// Rule P0: no N+1 queries — use include or a second query, never a loop + query

// ❌ WRONG — N+1
const tasks = await prisma.task.findMany({ where: { tenantId } })
for (const t of tasks) { const c = await prisma.customer.findUnique({ where: { id: t.customerId } }) }

// ✅ CORRECT — single query
const tasks = await prisma.task.findMany({
  where:   { tenantId, deletedAt: null },
  include: { customer: { select: { id: true, name: true } } }  // only needed fields
})

// Rule: EXPLAIN ANALYZE any new query pattern in staging before merging
// Rule: every new WHERE clause column must have a corresponding index in schema.sql
```

---

# PART K — TESTING STANDARDS

## K1. Test Structure — AAA (Arrange, Act, Assert)

```typescript
// Test name format: 'should [expected behaviour] when [condition]'
describe('TasksService', () => {
  describe('assignToWorker', () => {

    it('should create assignment and publish event when task is in DRAFT status', async () => {
      // Arrange
      const mockTask    = buildTask({ status: TaskStatus.DRAFT })
      const mockWorker = buildUser({ status: UserStatus.ACTIVE })
      mockRepo.findOrFail.mockResolvedValue(mockTask)
      mockRepo.findWorkerOrFail.mockResolvedValue(mockWorker)
      mockRepo.createAssignment.mockResolvedValue(buildAssignment())

      // Act — one call to the thing being tested
      const result = await service.assignToWorker(mockTask.id, mockWorker.id, 'reason', TENANT_ID, ADMIN_ID)

      // Assert
      expect(mockRepo.createAssignment).toHaveBeenCalledWith(expect.objectContaining({ taskId: mockTask.id }))
      expect(mockEvents.publish).toHaveBeenCalledWith(expect.any(TaskAssignedEvent))
      expect(result.assignment).toBeDefined()
    })

    it('should throw InvalidStatusTransitionException when task is COMPLETED', async () => {
      // Arrange
      mockRepo.findOrFail.mockResolvedValue(buildTask({ status: TaskStatus.COMPLETED }))

      // Act + Assert
      await expect(service.assignToWorker('task-id', 'worker-id', 'reason', TENANT_ID, ADMIN_ID))
        .rejects.toThrow(InvalidStatusTransitionException)

      // Verify zero side effects
      expect(mockRepo.createAssignment).not.toHaveBeenCalled()
      expect(mockEvents.publish).not.toHaveBeenCalled()
    })
  })
})
```

## K2. Coverage Requirements

```
Unit tests (services, repositories)    : minimum 80% line coverage
Integration (controller + service)     : all happy paths + top 3 error paths per endpoint
E2E (HTTP → DB → response)            : all MVP user stories have one E2E test
Offline/sync chaos tests               : all Edge cases from blueprint G-catalog
  — network partition mid-sync
  — same mutation replayed 10x
  — status conflict (completed offline + cancelled online)
  — device clock skew ±5 minutes
  — storage-full scenario

Rule P0: A PR adding a service method without tests is rejected.
Rule:    Tests must not share mutable state between test cases.
Rule:    Test data builders in /test/builders/ — no inline object literals.
Rule:    Test what behaviour the method produces, not how it produces it.
```

---

# PART L — GIT & PR WORKFLOW

## L1. Branch Naming

```
feature/FOS-{ticket}-{description}      feature/FOS-142-task-assignment-api
fix/FOS-{ticket}-{description}          fix/FOS-201-duplicate-checkin-event
chore/FOS-{ticket}-{description}        chore/FOS-89-add-missing-indexes
hotfix/FOS-{ticket}-{description}       hotfix/FOS-310-payment-double-charge
```

## L2. Commit Messages — Conventional Commits (mandatory)

```
Format: <type>(<scope>): <description>

type    : feat  fix  chore  refactor  test  docs  perf  ci  revert
scope   : tasks  auth  billing  mobile  infra  db  shared
summary : imperative, lowercase, ≤72 chars, no trailing period

Examples:
  feat(tasks): add idempotency key validation on create
  fix(auth): prevent tenant_id from being overridden via request body
  refactor(tasks): extract status transition into typed map
  test(tasks): add missing coverage for SAFETY_STOP transition
  chore(db): add composite index on tasks(tenant_id, status)
  perf(tasks): replace N+1 query in task list with single JOIN
  docs(api): add OpenAPI descriptions to task assignment endpoint

❌ Wrong: "fix bug"  "WIP"  "update"  "changes"  "Ravi's work"
```

## L3. PR Rules

```
Author self-review before opening:
  □ All tests pass locally
  □ TypeScript compiles with zero errors (tsc --noEmit)
  □ ESLint passes with zero warnings
  □ Every new service method has a unit test
  □ Every new Prisma query includes tenantId in WHERE
  □ New columns have paired up + down migrations
  □ idempotencyKey on every new mutation endpoint
  □ No console.log() in production code
  □ No TODO comments (convert to tickets)
  □ PR description explains WHY, not WHAT

Size      : max 400 lines changed. Large features = stacked PRs.
Reviews   : 1 approver for fix/chore, 2 for feat, CTO for DB migrations
Turnaround: reviewer responds within 1 business day
Merge     : squash-and-merge only. No merge commits on main.
```

## L4. Code Review Checklist — Reviewer

```
Security
  □ tenantId from JWT only — never request body?
  □ All Prisma queries filtered by tenantId?
  □ PII fields masked before returning by role?
  □ No hardcoded secrets or API keys?
  □ No 'any' typed inputs accepted?

Correctness
  □ Status transitions validated against ALLOWED_TRANSITIONS?
  □ idempotencyKey validated on every mutation?
  □ Financial values in integer minor-units (paise/pence/cents)?
  □ Timezone-sensitive ops stored UTC, displayed local?

Architecture
  □ No business logic in controller (no if/else/switch)?
  □ No infrastructure import in domain module?
  □ No repository skipped (direct Prisma in service)?
  □ New domain exceptions extend DomainException?

Performance
  □ N+1 query patterns absent (loop + query)?
  □ New WHERE columns indexed?
  □ Large result sets paginated?
  □ Expensive ops queued to Lambda?

Testing
  □ Every new public service method has a unit test?
  □ Failure paths tested alongside happy paths?
  □ Tests test behaviour, not implementation?

Offline / Mobile
  □ Mobile mutations write to local DB before network?
  □ Every mutation has device-generated idempotency key?
  □ Offline failure path tested?
```

---

# PART M — DOCUMENTATION STANDARDS

## M1. Comment Style

```typescript
// Rule: comments explain WHY, not WHAT. The code shows what.

// ❌ WRONG — narrates the obvious
// Increment retry count
retryCount++

// ❌ WRONG — outdated (code changed, comment did not)
// Returns null if not found
async findOrFail(id: string) { throw new NotFoundException() }

// ✅ CORRECT — explains a non-obvious decision
// Integer minor-units throughout; convert to decimal only at the display layer.
// Prevents floating-point rounding errors in GST calculations (seen ₹0.01 discrepancy at scale).
const amountPaise = Math.round(amountRupees * 100)

// ✅ CORRECT — explains a workaround
// Prisma does not support partial unique indexes. The UNIQUE (tenant_id, code)
// WHERE deleted_at IS NULL constraint lives in the DB schema (schema.sql).
// We check here to return a user-friendly error instead of a Prisma P2002.
const existing = await this.findByCode(dto.code, tenantId)
if (existing) throw new DuplicateCustomerCodeException(dto.code)
```

## M2. TSDoc on All Public Service Methods

```typescript
/**
 * Transitions a task to a new status, enforcing the allowed-transition graph.
 *
 * @param taskId     - UUID of the task to transition
 * @param newStatus - Target status; must be reachable from current status
 * @param tenantId  - Caller's tenant; used for row-level isolation
 * @param actorId   - User performing the transition (recorded in audit log)
 *
 * @throws {InvalidStatusTransitionException}  if newStatus is not in ALLOWED_TRANSITIONS[current]
 * @throws {TaskNotFoundException}              if task does not exist in this tenant
 *
 * @returns Updated task with new status and updatedAt
 */
async transitionStatus(taskId: string, newStatus: TaskStatus, tenantId: string, actorId: string): Promise<Task>
```

**Rule:** Every public service method needs a TSDoc comment.
Every `@throws` that can be raised must be listed. Private methods: comment only if non-obvious.

---

# PART N — SECURITY RULES (ALL P0, NON-NEGOTIABLE)

```
N1.  tenantId comes from JWT only. Never from request body, query param, or header.
N2.  Every Prisma query in a repository includes tenantId in WHERE. No exceptions.
N3.  RLS is enabled on all tenant-scoped tables. NestJS sets app.tenant_id per transaction.
N4.  No raw SQL with string interpolation. Parameterized queries only (Prisma handles this).
N5.  Passwords: bcrypt cost factor ≥12. Never stored in plain text. Never logged.
N6.  TOTP secrets and third-party credentials: AES-256-GCM encrypted at rest.
N7.  PII fields flagged in schema (is_pii column). Masked in responses by role via interceptor.
N8.  Audit log entry written for every mutation. AuditInterceptor is non-removable.
N9.  Rate limiting per tenant at API gateway. No tenant can starve others (noisy-neighbor protection).
N10. No secrets in code. All from environment variables or encrypted AWS SSM Parameter Store.
N11. No console.log() with user data in production. Structured JSON logs only (Winston).
N12. Dependencies are reviewed monthly and by weekly automated update PRs. Use the latest mutually compatible stable, non-deprecated, approved open-source release; commit lockfiles. Paid/premium frontend runtime packages are prohibited. A vulnerable, deprecated, retracted or discontinued direct dependency blocks merge/release unless Security records a time-bounded exception. Critical fixes are triaged immediately and patched within 72 hours.
N13. Impersonation: both support agent ID and target tenant logged to audit trail on every action.
N14. File uploads: mime-type validated server-side (not just filename extension). Max size enforced.
N15. Idempotency keys validated on all mutation endpoints. Server rejects non-UUID-v4 format.
```

---

# PART O — QUICK REFERENCE CARDS

## O1. Architectural Decisions

```
Question                                     Answer
─────────────────────────────────────────────────────────────────────────────
Where does business logic live?              Service layer only
Where does DB querying live?                 Repository layer only
Where does HTTP parsing live?                Controller layer only
Where does infrastructure (AWS/MSG91) live?  infrastructure/ adapters
Where does tenantId come from?               JWT — always and only
Can a controller have an if statement?       No
Can a service import from infrastructure/?   No — import the interface only
Can a service call another service directly? Only if return value is needed; else event
Can we accept 'any' in TypeScript?          No — strict mode enforced in tsconfig
When should a mutation fire an event?        When it needs to trigger cross-domain side effects
```

## O2. Response Shape Cheatsheet

```
Scenario                     HTTP   success  has data  has error  has pagination
──────────────────────────────────────────────────────────────────────────────────
GET single resource          200    true     ✓          —          —
GET list (paginated)         200    true     ✓ (array)  —          ✓
POST (create)                201    true     ✓          —          —
POST action, no resource     200    true     data:null  —          —
DELETE (soft)                200    true     ✓          —          —
Validation failed            400    false    —          ✓ + fields —
Auth missing / expired       401    false    —          ✓          —
Role insufficient            403    false    —          ✓          —
Not found                    404    false    —          ✓          —
Idempotency replay           409    false    —          ✓ + data   —
Business rule violated       422    false    —          ✓ + hint   —
Rate limited                 429    false    —          ✓ + retry  —
Server error                 500    false    —          ✓          —
```

## O3. Log Level Decision

```
Did the process crash or exit?                   → FATAL
Did an operation fail needing investigation?     → ERROR (alert fires)
Unexpected but recovered?                        → WARN  (review weekly)
Normal business event?                           → INFO
Technical detail for debugging?                  → DEBUG (disabled in prod)
Step-by-step algorithm trace?                    → TRACE (dev only)
```

## O4. Error Code Reference

```
HTTP  Code                          When
──────────────────────────────────────────────────────────────────────────────
400   VALIDATION_ERROR              class-validator rejected the DTO
401   UNAUTHORIZED                  No / expired / invalid JWT
403   FORBIDDEN                     Role cannot perform this action
403   TENANT_MISMATCH               Cross-tenant resource probe
404   TASK_NOT_FOUND                Resource missing in this tenant
404   CUSTOMER_NOT_FOUND
404   WORKFLOW_VERSION_NOT_FOUND
409   DUPLICATE_IDEMPOTENCY_KEY     Replay — original result in error.data
409   DUPLICATE_CUSTOMER_CODE       Unique code conflict
422   INVALID_STATUS_TRANSITION     Bad state machine move (+ allowed list)
422   WORKER_NOT_AVAILABLE          Worker inactive or suspended
422   PLAN_LIMIT_EXCEEDED           Tenant hit plan feature ceiling
422   OFFLINE_SUBMISSION_EXPIRED    Submission older than 72 hours
429   RATE_LIMITED                  Per-tenant rate cap (+ retryAfterSeconds)
500   INTERNAL_ERROR                Unexpected — log correlationId + contact support
503   SERVICE_UNAVAILABLE           Maintenance mode
```

## O5. PR Size Guide

```
Lines changed   Action
─────────────────────────────────────────────────────────
< 50            Single focused fix or improvement
50 – 200        Normal feature or enhancement
200 – 400       Larger feature — consider splitting
> 400           Must split into stacked PRs
Any size        DB migration = separate PR, CTO approval
```

---

*Document owner: CTO.
This file lives at `/docs/tech_implementation_standards.md` in the monorepo root.
Linked from: onboarding checklist, PR template, README.
Changes to P0 rules require CTO approval + team announcement.
Last updated: August 2026.*
