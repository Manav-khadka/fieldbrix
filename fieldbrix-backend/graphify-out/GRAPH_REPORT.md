# Graph Report - /Users/manavgenius/Desktop/ISL_FINAL/fieldbrix/fieldbrix-backend  (2026-08-14)

## Corpus Check
- 57 files · ~10,096 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 377 nodes · 567 edges · 53 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `PlatformService` - 73 edges
2. `AdministrationController` - 33 edges
3. `AdministrationService` - 32 edges
4. `AuthorizationController` - 21 edges
5. `AuthorizationService` - 19 edges
6. `AuthController` - 15 edges
7. `AuthService` - 14 edges
8. `AppController` - 8 edges
9. `DependencyHealthService` - 8 edges
10. `AppService` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (3): hashPassword(), PlatformService, verifyPassword()

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (1): AdministrationController

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (1): AdministrationService

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (1): AuthorizationService

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (2): AuthorizationController, PermissionGuard

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (2): AppService, DependencyHealthService

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (1): AuthController

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (2): DatabaseService, PlatformRepository

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (1): AuthService

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (2): QueueService, StorageService

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (1): AppController

### Community 11 - "Community 11"
Cohesion: 0.39
Nodes (1): PlatformController

### Community 12 - "Community 12"
Cohesion: 0.43
Nodes (1): IdempotencyService

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (1): TenantContextService

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (1): NotificationsService

### Community 15 - "Community 15"
Cohesion: 0.83
Nodes (3): requiredInProduction(), stringValue(), validateEnvironment()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (1): PlatformAdminGuard

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (1): AppModule

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (2): redact(), scrubSentryEvent()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): ResponseEnvelopeInterceptor

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): CorrelationIdMiddleware

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): HttpExceptionEnvelopeFilter

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): RateLimitGuard

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): DatabaseModule

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): DeviceRegistrationDto

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): PlatformModule

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (1): IdempotencyModule

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (1): StorageModule

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): TenantContextModule

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): QueueModule

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): AdministrationModule

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): InviteUserDto

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): TenantLimitsDto

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): CompanySettingsDto

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): CreateTeamDto

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): UpdateTenantDto

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): CreateTenantDto

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): CreateBranchDto

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): TenantReasonDto

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): AuthorizationModule

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): UpdateRolePermissionsDto

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): CreateRoleDto

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): NotificationsModule

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **22 isolated node(s):** `DatabaseModule`, `AuthModule`, `LoginDto`, `DeviceRegistrationDto`, `PlatformModule` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 23`** (2 nodes): `bootstrap()`, `main.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `DatabaseModule`, `database.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `AuthModule`, `auth.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `LoginDto`, `login.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `DeviceRegistrationDto`, `device-registration.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `PlatformModule`, `platform.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `IdempotencyModule`, `idempotency.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `StorageModule`, `storage.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `TenantContextModule`, `tenant-context.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `QueueModule`, `queue.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `AdministrationModule`, `administration.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `InviteUserDto`, `invite-user.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `TenantLimitsDto`, `tenant-limits.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `CompanySettingsDto`, `company-settings.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `CreateTeamDto`, `create-team.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `UpdateTenantDto`, `update-tenant.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `CreateTenantDto`, `create-tenant.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `CreateBranchDto`, `create-branch.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `TenantReasonDto`, `tenant-reason.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `AuthorizationModule`, `authorization.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `UpdateRolePermissionsDto`, `update-role-permissions.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `CreateRoleDto`, `create-role.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `Permission()`, `permission.decorator.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `NotificationsModule`, `notifications.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `app.e2e-spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `instrument.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `app.controller.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `environment.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `sentry.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PlatformService` connect `Community 0` to `Community 9`, `Community 3`, `Community 7`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `AdministrationService` connect `Community 2` to `Community 3`, `Community 12`, `Community 7`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `DatabaseModule`, `AuthModule`, `LoginDto` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._