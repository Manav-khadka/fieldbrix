# Fieldbrix — Mobile Reference (Flutter)

Architecture and behavior are extracted from the engineering standards. `fieldbrix_app/pubspec.yaml` and `pubspec.lock` are authoritative for installed versions; the owning sprint must select the latest mutually compatible stable, non-discontinued open-source packages and prove them on the supported device matrix.

**Priority system:**

- `P0` — Non-negotiable. Code review rejects any violation without an approved exception on record.
- `P1` — Strong default. Override only with a comment explaining why.
- `P2` — Recommended. Use good judgment.

---

# 1. MOBILE TECH STACK

## 1.1 Framework

```
SDK           : Flutter stable pinned by CI and the repository toolchain
Language      : matching stable Dart SDK
Targets       : Android 10+ (primary), iOS 14+ (secondary)
Min device    : 2GB RAM, ₹7,000 Android phones
                (Xiaomi Redmi, Realme C-series, Samsung A-series)
Why Flutter   :
  ✅ Single codebase Android + iOS
  ✅ Compiled to native ARM (not JS bridge)
  ✅ Excellent offline-first story
  ✅ Good performance on low-end Android
  ✅ Growing India developer community
  ✅ Google backing = long-term safety
Architecture  : Clean Architecture
                Feature → Data → Domain → Presentation
State mgmt    : Riverpod 2.x (hooks-based, compile-safe)
DI            : Riverpod providers (replaces get_it for DI)
Navigation    : go_router (pubspec/lock)
```

## 1.2 Local Database

```
Package       : drift (pubspec/lock)
Why Drift     :
  ✅ SQL ORM on SQLite - type-safe queries
  ✅ Actively maintained (Jun 2026 confirmed)
  ✅ Reactive queries (UI updates when data changes)
  ✅ Built-in isolate threading
     (DB operations never block UI thread)
  ✅ Works everywhere Flutter runs
  ✅ Compile-time query verification
  ✅ Migration support (schema evolves safely)
  ✅ Works with PowerSync (PowerSync uses sqlite_async
     which is compatible with Drift)

// Drift table definition:
class Tasks extends Table {
  TextColumn get id => text()()
  TextColumn get tenantId => text()()
  TextColumn get status => textEnum<TaskStatus>()()
  DateTimeColumn get scheduledStart => dateTime().nullable()()
  // assigneeId is NOT a tasks column server-side (assignment lives in
  // task_assignments). This is a materialized column: PowerSync's
  // Sync Rules resolve the current assignee via a join and flatten it
  // here so the mobile UI can query it without a local join.
  TextColumn get assigneeId => text().nullable()()
  // Drift generates type-safe query builder from this
}

// Type-safe query:
final tasks = await (
  select(tasks)..where((t) => t.status.equals(TaskStatus.open))
).get()
// Wrong field name = compile error, not runtime error

Why not ObjectBox:
  Not open source (planned for v4.1 but not yet)
  NoSQL doesn't fit relational field-service data model naturally
  (Tasks → Checklists → Parts → Payments = relational)
  SQL is more natural for complex dispatch queries

Why not Isar:
  Author radio silence in 2026
  Rust core has stability concerns
  Abandoned = migration cost later
```

## 1.3 Database Encryption

```
Package       : sqlcipher_flutter_libs
Why           : AES-256 encryption on local SQLite
                If device is lost/stolen,
                data is unreadable without key
Key storage   : flutter_secure_storage
                (iOS Keychain / Android Keystore hardware)
                Key never leaves the device chip
Performance   : ~5-10% overhead vs unencrypted
                Imperceptible on modern devices
BIPA          : Biometric/liveness templates NOT stored
                On-device processing only (H1 blueprint)
```

## 1.4 Offline Sync

```
Package       : powersync (pubspec/lock)
                Apache 2.0 license
Why PowerSync :
  ✅ Handles ALL offline sync complexity
  ✅ Syncs Postgres (RDS) ↔ SQLite (device)
  ✅ Per-user data filtering (Sync Rules)
     Technician only gets their own tenant's data
  ✅ Upload queue built-in (outbox pattern)
  ✅ Conflict detection hooks
  ✅ Works with Drift (both use SQLite)
  ✅ Self-hosted Open Edition = $0
  ✅ Reactive queries (UI updates on sync)

Without PowerSync you'd build:
  □ Outbox queue implementation
  □ Delta sync (what changed since last sync)
  □ Per-device change tracking on server
  □ Retry + resumable logic
  □ Ordering guarantees
  □ Idempotency keys
  □ Conflict detection
  ≈ 4-8 weeks of complex work + ongoing bugs

Sync Rules example (server config):
  bucket_definitions:
    by_technician:
      parameters: SELECT request.user_id() AS user_id
      data:
        - SELECT t.* FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id AND ta.ended_at IS NULL
            WHERE ta.tenant_user_id = bucket.user_id
        - SELECT * FROM task_runs WHERE performed_by_tenant_user_id = bucket.user_id
  // Technician ONLY receives their own assigned tasks
  // Owner receives all tasks for their tenant
  // Enforced server-side, not client-side
```

## 1.5 HTTP Client

```
Package       : dio (pubspec/lock)
Why Dio       :
  ✅ Interceptors for auth token auto-refresh
  ✅ Interceptors for retry on network failure
  ✅ Request cancellation
  ✅ FormData for multipart (if needed)
  ✅ Mock adapter for testing

Interceptors configured:
  AuthInterceptor      → adds Bearer token to every request
                         silently refreshes on 401
                         logs out only on refresh failure
  RetryInterceptor     → retry 3x with exponential backoff
                         on network errors (not 4xx/5xx)
  TenantInterceptor    → adds X-Tenant-Id header
  LoggingInterceptor   → structured request/response logs
                         (debug only, stripped in production)
  OfflineInterceptor   → queues requests when offline
                         (for non-sync API calls like SOS)
```

## 1.6 State Management

```
Package       : flutter_riverpod (pubspec/lock)
Why Riverpod  :
  ✅ Compile-safe (wrong provider type = compile error)
  ✅ Testable (override providers in tests)
  ✅ No BuildContext needed for providers
  ✅ Auto-disposal (no memory leaks)
  ✅ Works as DI container (replaces get_it)
  ✅ AsyncValue handles loading/error/data states

Provider types used:
  Provider          → config, constants
  StateProvider     → simple UI state (selected tab)
  StateNotifierProvider → complex state (dispatch board)
  FutureProvider    → async data (load from local DB)
  StreamProvider    → reactive data (PowerSync streams)

// Riverpod as DI:
final taskRepositoryProvider = Provider((ref) {
  final db = ref.watch(driftDatabaseProvider)
  final sync = ref.watch(powerSyncProvider)
  return TaskRepository(db, sync)
})
// Test override:
container.override(
  taskRepositoryProvider.overrideWith((_) => MockTaskRepository())
)
```

## 1.7 Image Handling

```
Compression   : flutter_image_compress (pubspec/lock)
Why           :
  ✅ Compress BEFORE upload (device side)
  ✅ 3-8MB camera photo → 200-400KB
  ✅ 90-95% size reduction
  ✅ Runs in Isolate (doesn't freeze UI)
Config        : quality: 78, maxWidth: 1920, keepExif: false

GPS + timestamp burn:
  image package (pubspec/lock) → approved evidence processing
  (not EXIF - survives EXIF stripping)
  "Task #4432 | 28-Aug-2026 14:23 | 12.97°N, 77.59°E"
  Dispute-proof evidence (blueprint F3)

Photo storage : camera package (pubspec/lock; camera access)
                image_picker v1.x (gallery fallback)
                path_provider v2.x (find local storage path)
                Stored in app-private directory
                Encrypted by SQLCipher at rest
                Deleted ONLY after S3 confirmed + API acked
```

## 1.8 Upload Strategy

```
Method        : Presigned URLs (direct to S3)
Package       : http (pubspec/lock; for S3 PUT, not Dio)
Why presigned :
  ✅ Photo never hits EC2 (zero EC2 bandwidth)
  ✅ EC2 CPU cost per photo: ~0.5ms (just URL generation)
  ✅ 50 techs uploading simultaneously = EC2 unaffected
  ✅ S3 handles burst uploads natively

Offline upload queue:
  1. Photo taken → compressed → UUID filename
  2. Stored in encrypted local storage
  3. Task record references UUID (status: PENDING_UPLOAD)
  4. On reconnect: batch presign API call (10 files at a time)
  5. Parallel upload to S3 (max 3 concurrent)
  6. On S3 success: confirm to API (status: UPLOADED)
  7. Local file deleted after server ack

Priority on reconnect:
  1. Task data sync (PowerSync - lightweight, first)
  2. Photo uploads (batch presigned, second)
  3. Videos (Wi-Fi only, last)
```

## 1.9 Location & Attendance

```
Package       : geolocator (pubspec/lock)
Why           :
  ✅ Android + iOS unified API
  ✅ Background location (with permission)
  ✅ Accuracy filtering (ignore GPS jitter)
  ✅ Distance calculation built-in

Anti-spoofing layers (blueprint Edge A4):
  1. geolocator + SafetyNet/Play Integrity API
     → detect mock location apps
  2. Device integrity check
     → rooted device = flag
  3. GPS accuracy check
     → accuracy > 100m = flag (not block)
  4. Velocity anomaly
     → 500m in 30s = impossible = flag
  5. Battery-save GPS mode detection
     → coarse location = flag

All flags are soft (never block work)
Flags route to supervisor back-check queue
NOT direct accusations to technician

Geofencing     : flutter_local_notifications (pubspec/lock)
                 + custom geofence logic on geolocator stream
                 Site radius configurable per tenant (50m-500m)
                 Override with reason if GPS poor (Edge A3)

Tracking hours : ONLY between attendance punch-in and punch-out
                 Visibly shows to technician (their own history)
                 Stops immediately on punch-out
                 DPDP compliance built-in (blueprint H1)
```

## 1.10 Push Notifications

```
Package       : firebase_messaging (pubspec/lock)
Why FCM       :
  ✅ Free for unlimited messages
  ✅ Background message delivery
  ✅ Works on all Android versions
  ✅ iOS APNs via FCM (one SDK)

Notification types:
  High priority (FCM data message, wakes device):
    New task assigned
    Emergency task
    SOS received (supervisor)
    SLA breach alert

  Normal priority (FCM notification):
    Schedule for tomorrow
    Leave approved/rejected
    Payment confirmed

Local notifications: flutter_local_notifications (pubspec/lock)
  (for in-app alerts when app is foreground)
```

## 1.11 Secure Storage

```
Package       : flutter_secure_storage (pubspec/lock)
Stores        :
  JWT access token
  JWT refresh token
  Encryption key (for SQLCipher)
  Device fingerprint
  User preferences (theme, language)

Backend       : iOS → Keychain (hardware-backed)
                Android → Keystore (hardware-backed TEE)
                Keys never extractable from chip
                Survives app reinstall (iOS)
                Does NOT survive factory reset (by design)
```

## 1.12 Connectivity

```
Package       : connectivity_plus (pubspec/lock)
Why           :
  ✅ Detect online/offline transitions
  ✅ Network type (WiFi vs mobile data)
  ✅ Triggers sync queue drain on reconnect
  ✅ Warns before large video upload on mobile data

Usage:
  WiFi          → allow photo + video uploads
  Mobile data   → photos only (configurable per tenant)
  Offline       → queue everything, show pending count
  Reconnect     → trigger PowerSync drain first,
                  then batch presign photos,
                  then upload photos
```

## 1.13 OEM Battery Optimization (India-specific)

```
Package       : flutter_foreground_task (pubspec/lock)
Why critical  : Xiaomi, Vivo, Oppo, Realme kill background apps
                aggressively (top Android brands in India)
                Without this: sync stops when app backgrounded
                Data appears "lost" to technician

Solution      : Foreground service (shows persistent notification
                "Fieldbrix is syncing your work")
                Prevents OEM from killing the process
                Required for reliable offline → online sync

Onboarding    : Show battery optimization guidance screens
                Manufacturer-specific instructions
                "Allow Fieldbrix to run in background"
                (Xiaomi: MIUI battery → No restrictions)
                (Realme: Power management → No restrictions)
```

## 1.14 Flutter libraries summary

The table below describes intended capabilities, not installable version requirements. Resolve versions from pub.dev when the owning sprint begins, reject discontinued/retracted/advisory-affected packages, commit `pubspec.lock`, and attach analyze/test/device evidence. Sentry uses `fieldbrixxx/flutter` and the contract in [`../../sentry/flutter.md`](../../sentry/flutter.md).

```
Package                       Version  Purpose
──────────────────────────────────────────────────────────
flutter_riverpod         pubspec/lock  State + DI
drift                    pubspec/lock  Local SQL database
sqlcipher_flutter_libs   pubspec/lock  AES-256 encryption
powersync                pubspec/lock  Offline sync engine
sqlite_async             pubspec/lock  Async SQLite layer
dio                      pubspec/lock  HTTP client
go_router                pubspec/lock  Navigation
flutter_secure_storage   pubspec/lock  Secure key storage
geolocator               pubspec/lock  Event GPS/geofence checks
camera                   pubspec/lock  Camera access
image_picker             pubspec/lock  Gallery access
flutter_image_compress   pubspec/lock  Photo compression
image                    pubspec/lock  Approved evidence processing
firebase_messaging       pubspec/lock  Push notifications
flutter_local_notifications pubspec/lock In-app notifications
connectivity_plus        pubspec/lock  Network detection
flutter_foreground_task  pubspec/lock  Approved foreground sync only
path_provider            pubspec/lock  Local file paths
intl                     pubspec/lock  i18n and formatting
flutter_localizations    SDK           Multi-language
cached_network_image     pubspec/lock  Image caching
fl_chart                 pubspec/lock  Technician KPIs
map library              Sprint 22     Consented visit tracking only
share_plus               pubspec/lock  Share reports/PDFs
url_launcher             pubspec/lock  Approved external actions
package_info_plus        pubspec/lock  App version info
──────────────────────────────────────────────────────────
All packages: $0/mo (open source)
```

---

# 2. MOBILE CODE STANDARDS

## 2.1 Widget Rules

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

## 2.2 Riverpod Providers

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

## 2.3 Offline-First Rule

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

## 2.4 Flutter API Client

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

## 2.5 Naming Conventions — Flutter

```
Files      : snake_case.dart             task_card.dart  tasks_repository.dart
Classes    : PascalCase                  TaskCard  TasksRepository  CheckInEvent
Providers  : camelCase, noun suffix      taskProvider  tasksRepositoryProvider
Methods    : camelCase, verb-first       completeTask()  findById()  handleCheckIn()
Constants  : lowerCamelCase             const maxPhotoSize = 1024 * 1024
Private    : _ prefix                   _buildHeader()  _isLoading
Booleans   : is/has/can                 isSyncing  hasGpsException  canCheckIn
```

## Quick Reference — Mobile Row

```
Layer      | Technology          | Key reason
───────────┼─────────────────────┼──────────────────────────────
Mobile     | Flutter stable      | Single codebase, ARM native
           | Drift 2             | Type-safe SQL ORM offline
           | SQLCipher           | AES-256 local encryption
           | PowerSync           | Postgres↔SQLite sync engine
           | Riverpod 2          | State + DI, compile-safe
           | Dio 5               | HTTP + auth interceptors
           | flutter_image       | Compress before upload
           | _compress           |
           | geolocator 13       | GPS, anti-spoofing
           | FCM                 | Push notifications
```
