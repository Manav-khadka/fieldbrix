# FieldBrix frontend dependency catalog

Verified 14 August 2026. This is the canonical candidate catalog for the React applications. It records approved packages and ownership; it is not an instruction to install everything at once.

## Binding dependency policy

1. Add a package only in its owning sprint and only when accepted behavior uses it.
2. Prefer the newest mutually compatible stable release available when implementation begins. Check registry dist-tags, deprecation metadata, peer ranges, security advisories, maintenance activity and license before changing a manifest.
3. Commit the resolved `pnpm-lock.yaml` and use frozen-lockfile CI. Never put a floating `latest` tag in a production manifest.
4. Use only open-source frontend runtime dependencies approved by Engineering and Security. Paid, proprietary, trial and premium-only UI packages are prohibited.
5. MIT, Apache-2.0, BSD and ISC dependencies may proceed after automated license review. Any other license requires recorded legal/engineering approval.
6. Dependabot checks each nested application repository weekly. Security fixes are reviewed immediately; major upgrades require migration notes and the full affected test matrix.
7. A deprecated, abandoned, retracted or vulnerable direct dependency blocks merge and release unless Security records a time-bounded exception.
8. Pre-releases are prohibited except for the exact `react-data-grid` exception below.

Registry references: [npm dist-tags](https://docs.npmjs.com/cli/dist-tag/), [npm deprecation](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/).

## Status vocabulary

| Status | Meaning |
|---|---|
| Approved | Add at the owning sprint after the latest-compatible-stable check passes. |
| Approved exception | Exact version and special gates below are binding; do not float or auto-upgrade. |
| Deferred | Valid candidate, but its behavior is outside the current roadmap. Do not install. |
| Rejected | Do not install or use. |

## Ownership matrix

| Capability | Package or package family | Status | Owning sprint | FieldBrix use and boundary |
|---|---|---|---:|---|
| React runtime | `react`, `react-dom` | Approved | 01 | Web and portal rendering baseline. |
| Routing | `@tanstack/react-router`; dev-only `@tanstack/router-devtools` | Approved | 01 | Typed routes, search params and capability guards; devtools never ship enabled in production. |
| Server state | `@tanstack/react-query`; dev-only `@tanstack/react-query-devtools` | Approved | 01 | API cache, invalidation and mutations; it does not replace domain state or offline mobile storage. |
| Client and URL state | `zustand`, `nuqs` | Approved | 01 | Ephemeral UI preferences and shareable filters only; authorization and server facts remain server-owned. |
| Accessible UI | shadcn-owned components, approved `@radix-ui/*`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react` | Approved | 01 | Owned components and WAI-ARIA primitives; add only primitives actually used. |
| Styling | `tailwindcss`, `@tailwindcss/typography`, PostCSS toolchain | Approved | 01 | Shared tokens, responsive UI and rich-text prose styling. |
| Feedback and motion | `sonner`, `motion` | Approved | 01 | Toasts and restrained transitions; respect reduced-motion preferences and never animate hidden authorization state. |
| Command navigation | `cmdk` | Approved | 05 | Capability-filtered command palette; do not expose unavailable routes or records. |
| Resizable workspaces | `react-resizable-panels` | Approved | 10 | Dispatch split views with keyboard-accessible non-drag fallback and persisted presentation preference. |
| Forms and validation | `react-hook-form`, `zod`, `@hookform/resolvers` | Approved | 03 | Accessible forms and shared contract schemas; backend validation remains authoritative. |
| Tables | `@tanstack/react-table`, `@tanstack/react-virtual` | Approved | 04 | Headless tables and measured virtualization for administration, task and report surfaces. |
| Spreadsheet preview | `react-data-grid@7.0.0-beta.61` | Approved exception | 06 | Import mapping/preview only; exact pin, isolated adapter and additional gates below. |
| File selection | `react-dropzone` | Approved | 06 | Accessible import and portal upload selection; server MIME, size and checksum checks remain authoritative. |
| Spreadsheet parsing | official `xlsx@0.20.3` tarball | Approved exception | 06 | Header and bounded preview parsing only; full processing remains server-side. |
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@dnd-kit/modifiers` | Approved | 06 | Import mapping, workflow ordering and dispatch interactions; every action has a keyboard/non-drag equivalent. |
| Runtime assertions | `tiny-invariant` | Approved | 06 | Developer-facing invariant failures; never use it as user-input validation. |
| Workflow graph | `@xyflow/react` | Approved | 07 | Workflow sections/rules visualisation behind an owned editor adapter and accessible list alternative. |
| Rich text | `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` and approved extensions | Approved | 07 | Sanitized task instructions, help text and email templates; links/images follow allowlists. |
| Scheduling | [`react-big-calendar`](https://github.com/jquense/react-big-calendar) | Approved | 11 | MIT resource/calendar view behind a FieldBrix scheduler adapter; no premium plugins or license keys. |
| Date input and arithmetic | `react-day-picker`, `date-fns`, `date-fns-tz`, `@internationalized/date` | Approved | 03 | Locale-aware input, UTC/tenant-timezone boundaries and scheduler/report calculations. `date-fns` is the single date utility. |
| PDF preview | `react-pdf` | Approved | 16 | Lazy-loaded service-report and invoice preview; PDFs remain generated and authorized server-side. |
| Standard charts | `recharts` | Approved | 16 | Admin dashboards with accessible summaries and tabular alternatives. |
| Specialist charts | `@nivo/core`, `@nivo/bar`, `@nivo/line`, `@nivo/pie`, `@nivo/heatmap` | Approved | 16 | Report visualizations only where Recharts is insufficient; no duplicate chart for the same use case. |
| Phone input | `react-phone-number-input`, `libphonenumber-js` | Approved | 05 | International contact capture; phone authentication remains out of scope. |
| QR generation/scanning | `qrcode.react`, `@zxing/browser`, `@zxing/library` | Approved | 06 | Asset labels and authorized browser scan fallback; mobile scanning remains native Flutter scope. |
| Web signature | `signature_pad` | Approved | 15 | Authorized supervisor-device fallback only; signed summary/hash rules remain authoritative. |
| Branding tools | `react-colorful`, `react-image-crop` | Approved | 05 | Tenant color/logo configuration with contrast, MIME and crop validation. |
| Product guidance | `driver.js` | Approved | 05 | Capability-aware first-login guidance; never bypass or simulate permissions. |
| Utilities | `lodash-es`, `uuid` | Approved | 02 | Tree-shakeable transforms and client-created UUID-v4 mutation keys; do not add redundant type packages. |
| Tracking map | `maplibre-gl`, `react-map-gl` | Approved | 22 | Consented visit tracking only. No route optimization, nearest-technician recommendation or off-duty tracking. |
| Sentry web SDK | `@sentry/react` | Approved | 01 | `fieldbrixxx/vite-react`; env-only DSN, release/environment tags, scrubber and controlled traces. |
| Test stack | `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`, `@playwright/test` | Approved | 01 | Unit, component, mock-boundary and browser E2E evidence. |
| Static tooling | TypeScript, Vite React plugin, ESLint/Oxlint, Prettier Tailwind plugin, TanStack lint/router plugins | Approved | 01 | Use the newest compatible stable toolchain proven by lint, typecheck, build and tests. |

## Approved exception gates

### `react-data-grid@7.0.0-beta.61`

- Pin exactly; exclude it from automatic version updates.
- Wrap it in the import-preview feature so replacement does not affect domain code.
- Test React 19, Vite 8 CSS minification, keyboard-only editing, screen readers, copy/paste, 200% zoom and large previews.
- Do not reuse it for ordinary application tables; use TanStack Table/Virtual.
- Any replacement or beta upgrade needs an ADR and the same compatibility suite.

### SheetJS Community Edition `0.20.3`

The public npm `xlsx` package is stale. Install the official tarball described by [SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/) and pin its checksum or vendor the reviewed tarball. Parse only a bounded browser preview; upload the original file for server-side validation. Spreadsheet formula injection and decompression/memory limits are security gates.

## Current registry audit snapshot

These values document the 14 August 2026 review; they are not floating manifest requirements. Re-resolve the full compatible set when each owning sprint begins.

| Family | Verified current release(s) |
|---|---|
| React/build | React `19.2.8`; Vite `8.2.1`; Vite React plugin `6.0.5`; Tailwind CSS `4.3.3` |
| TanStack | Router `1.170.27`; Query `5.101.4`; Table `9.1.2`; Virtual `3.14.9` |
| Forms/state | React Hook Form `7.85.0`; Zod `4.4.3`; resolvers `5.8.0`; Zustand `5.0.15`; nuqs `2.9.5` |
| Builder/import | XYFlow `12.11.3`; dnd-kit core `6.3.1`; React Data Grid `7.0.0-beta.61` exact; SheetJS CE `0.20.3` official tarball |
| Calendar/date | React Big Calendar `1.20.0`; React Day Picker `10.0.1`; date-fns `4.4.0`; date-fns-tz `3.2.0` |
| Content/visuals | React PDF `10.4.1`; Tiptap `3.30.1`; Recharts `3.10.1`; Nivo `0.99.0`; Motion `13.1.0` |
| Maps/scanning | MapLibre GL `6.3.0`; react-map-gl `8.1.2`; qrcode.react `4.2.0`; ZXing browser `0.2.1` |
| Sentry | `@sentry/react` and `@sentry/nestjs` `10.70.0`; pub.dev `sentry_flutter` `9.27.0` and not discontinued |

Toolchain majors are adopted only after the actual frontend manifest, Node runtime and complete test suite prove compatibility; “newest published” is not permission to break the build.

The live registry pass returned no deprecation metadata for the approved packages sampled above and across the ownership families. Their published licenses were within the approved MIT, Apache-2.0, BSD or ISC set. The deliberate negative control, `@types/uuid`, returned npm's deprecated-stub notice; the public npm `xlsx` release remained `0.18.5`, while the reviewed SheetJS artifact URL returned the pinned `0.20.3` tarball. Peer ranges explicitly covered React 19 for the selected Router, Query, Table, Virtual, React Big Calendar, React PDF, Tiptap, Recharts, Nivo, Motion, Sentry and exact grid-beta candidates. These registry results still require build, accessibility, security and license-file verification in the owning sprint.

## Rejected and deferred choices

| Package or behavior | Status | Binding decision |
|---|---|---|
| `react-beautiful-dnd` | Rejected | Deprecated; use dnd-kit. |
| `react-pdf-viewer` | Rejected | Archived/abandoned; use `react-pdf`. |
| `framer-motion` | Rejected | Old package name; use `motion`. |
| `moment`, `dayjs` | Rejected | Duplicate date stacks; use `date-fns` and `date-fns-tz`. |
| `react-query`, `react-table` | Rejected | Legacy package names; use TanStack-scoped packages. |
| `react-router-dom` | Rejected | FieldBrix standardizes on TanStack Router. |
| `html5-qrcode` | Rejected | Use ZXing packages. |
| `react-signature-canvas` | Rejected | Use `signature_pad` directly. |
| `@types/uuid` | Rejected | Deprecated stub; `uuid` supplies its own types. |
| FullCalendar/Scheduler resource packages | Rejected | Technician resource scheduling is premium/license-key gated; use React Big Calendar. |
| Schedule-X premium resource scheduler and any paid calendar plugin | Rejected | Paid/premium runtime UI dependencies are prohibited. |
| Google Maps React adapter | Rejected | Use MapLibre only for the approved Sprint 22 tracking surface. |
| Route optimization, traffic ETA and nearest-technician recommendation | Deferred | Not part of the approved MVP or Growth roadmap. |

## Review evidence

Every dependency change records registry version/dist-tag, deprecation result, peer compatibility, license, advisory/audit result, bundle impact, owning sprint, tests run and rollback. The PR must update this catalog when a package is added, removed, replaced, promoted from deferred, or granted an exception.

This file is intentionally at the repository root. Other FieldBrix documents link here instead of copying a volatile version matrix.
