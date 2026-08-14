# Sprint 3 — Password Authentication and Tenant Isolation

**Goal:** Allow secure staff access while proving users cannot cross tenant boundaries.

**Prerequisite:** Sprint 2 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Write authentication, session, and isolation test cases | QA/Security | 3 | Sprint 2 sign-off |
| Implement passwords, login, refresh, email reset, lockout, and revocation | Backend | 13 | Sprint 2 sign-off |
| Implement web/mobile login, secure token storage, logout, and account states | Web/Mobile | 13 | Authentication API |
| Implement tenant context, device installation, and deactivation | Backend | 8 | Authentication API |
| Test login, logout, reset, expiry, and disabled users | QA | 5 | Implementations complete |
| Integration-test tenant context through API, RLS, web, and mobile | QA | 5 | Implementations complete |
| Regression-test middleware and migrations | QA | 3 | Functional tests complete |
| Test brute force, token revocation, password hashing, and tenant leakage | Security/QA | 3 | Authentication complete |
| Correct authentication defects and re-test | Dev+QA | 8 | Test findings |
| Authentication QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Introduce only the approved TanStack Router/Query, React Hook Form/Zod and date-input capabilities needed by authentication; backend validation and session state remain authoritative.
- Verify React/Nest/Flutter auth events suppress invalid-credential noise and never expose passwords, tokens, cookies, emails, tenant IDs or reset links.

## Acceptance criteria

### Functional

- Active users authenticate with ID/email and password and can securely reset passwords by email.
- Phone-number login, company PIN, customer OTP, SMS and WhatsApp authentication/confirmation are not active interfaces in this roadmap.
- Disabled users and revoked devices cannot start or continue sessions.
- Tenant identity comes only from the authenticated session and is applied to every tenant query.

### Test coverage required for sign-off

- Modified tokens, direct cross-tenant IDs, expiry, refresh rotation, repeated failures, device replacement, account deactivation, and RLS isolation pass.
- Password hashing and response/log redaction meet the engineering security rules.
