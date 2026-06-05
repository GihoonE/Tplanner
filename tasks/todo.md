## FIX.md Optimization Plan Review

- [x] Read the user's implementation notes in `FIX.md`.
- [x] Identify missing or risky optimization planning points.
- [x] Append a comparison-friendly review section to the bottom of `FIX.md`.
- [x] Verify the appended section is present.

## Review

- Added `추가 검토 / 보강하면 좋은 포인트` to the bottom of `FIX.md`.
- Covered source-of-truth conflicts, broad invalidation, batch transaction semantics, optimistic temp ids, pending buffer merge rules, page-exit flush reliability, server versioning, payload splitting, DB indexes, drag render cost, dirty/save UI states, idempotency keys, and suggested implementation order.

## Calendar Performance Source Audit

- [x] Inspect calendar interaction write paths.
- [x] Inspect session API and DB route sources.
- [x] Inspect React Query invalidation and Zustand synchronization sources.
- [x] Inspect calendar render recomputation sources.
- [x] Document potential performance sources in `FIX.md` without prescribing fixes.

## Review

- Added `Calendar Interaction Performance Audit` to `FIX.md`.
- Documented 12 potential sources of calendar slowness with code locations.
- Covered per-session API writes, broad invalidations, large calendar fetch ranges, heavy API payloads, extra DB reads after writes, React Query to Zustand copying, whole-array store updates, view recomputation, mousemove state updates, and session modal refetch behavior.
- No optimization implementation was performed.

## Daily Multi Select Copy Paste Drag

- [x] Inspect current DayView click, drag, and time coordinate behavior.
- [x] Add daily multi-select state, selected styling, and shortcut status panel.
- [x] Add Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Backspace, and Esc behavior.
- [x] Implement paste and group drag with earliest-session anchor offsets.
- [x] Render dashed drop previews only for the current day visible slice.
- [x] Verify typecheck, lint, build, and document results.

## Review

- Daily view now supports Shift-click multi-select, selected styling, and the shared lower-left shortcut status panel.
- Cmd/Ctrl+C copies selected daily sessions, Cmd/Ctrl+V pastes them at the hovered 15-minute snapped time, Esc clears state, and Cmd/Ctrl+Backspace deletes selected sessions.
- Daily paste and group drag preserve each selected session's offset and duration from the earliest selected session.
- If a moved/copied session crosses midnight, the saved end time can roll into the next day while the dashed preview only renders the visible slice inside the current day.
- Shift-free click/drag on another session switches back to single-session selection or drag.
- Store and React Query session/calendar caches are updated or invalidated after create, move, and delete.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Monthly Existing Cell Stretch Fix

- [x] Confirm why cells with existing sessions can still stretch during placeholder drag.
- [x] Lock monthly section/grid height so content cannot expand the month.
- [x] Verify typecheck, lint, and build.

## Review

- The remaining stretch path was the month section using `min-h-full`, which lets content grow beyond the viewport-height month.
- Monthly sections now use fixed full height with `h-full min-h-0 flex-shrink-0`.
- The monthly grid now also has `min-h-0`, so placeholder/chip content is clipped inside the fixed cell layout instead of expanding the calendar.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Monthly Placeholder Height Stability

- [x] Identify why monthly drag placeholders changed calendar cell height.
- [x] Keep monthly grid rows fixed while placeholders push only internal session rows.
- [x] Verify typecheck, lint, and build.

## Review

- Monthly grid rows now use `minmax(0, 1fr)` instead of content-sized `1fr`, preventing placeholder content from expanding the calendar row height.
- Monthly day cells now include `min-h-0` so overflow stays inside the fixed cell.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Monthly Multi Select Group Drag

- [x] Inspect current MonthView selection, copy/paste, and drag behavior.
- [x] Allow Shift multi-select across different dates.
- [x] Change monthly copy/paste to preserve anchor-relative date/time offsets.
- [x] Add group drag for selected monthly sessions with anchor-relative date offsets.
- [x] Render dashed drag placeholders as top list items that push existing chips down.
- [x] Respect the three-visible-items limit by temporarily hiding displaced chips during drag.
- [x] Prevent browser text selection during Shift click/drag interactions.
- [x] Verify typecheck, lint, build, and document results.

## Review

- Monthly Shift-click now toggles sessions across different dates instead of resetting to the newly clicked date.
- Monthly copy/paste and group drag now use the earliest selected session as the anchor and preserve each selected session's date offset, start time, and duration.
- Dragging a selected group renders dashed placeholders in each predicted target day.
- Monthly placeholders render as real top list items, pushing existing chips down instead of overlaying them.
- Cells still show at most three list rows; placeholder rows temporarily consume those slots and displaced sessions are hidden behind the `+N개` count.
- Shift click/drag and monthly grid interactions now prevent browser text selection of date numbers.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Weekly Multi Select Copy Paste Drag

- [x] Inspect existing WeekView session click, drag, and time coordinate handling.
- [x] Add weekly multi-select state and selected-session styling.
- [x] Add Cmd/Ctrl+C, Cmd/Ctrl+V, Esc, and Cmd/Ctrl+Backspace behavior.
- [x] Paste copied sessions from the hovered weekly column/time with 15-minute snapping and relative offsets.
- [x] Add multi-session drag/drop with relative offsets and dashed previews for every moved block.
- [x] Keep non-shift click/drag on another session as single-session selection/drag.
- [x] Verify typecheck, lint, build, and document results.

## Review

- Weekly view now supports Shift-click multi-select, selected-session styling, and the same lower-left shortcut status panel as Monthly.
- Cmd/Ctrl+C copies the selected sessions as a relative schedule anchored to the earliest selected start time.
- Cmd/Ctrl+V pastes at the hovered weekly column/time, snapping to 15-minute starts and preserving relative offsets and durations, including sessions that roll into later dates.
- Cmd/Ctrl+Backspace deletes the selected weekly sessions and refreshes store/query state.
- Multi-selected session drag moves the selected group with relative offsets preserved and renders dashed drop previews for each moved block.
- Shift-free click/drag on an unselected session collapses back to single-session selection or single-session dragging.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Calendar Delete Shortcut JSON Error

- [x] Reproduce the likely error path for Cmd/Ctrl+Backspace deletion.
- [x] Make API response parsing resilient so HTML responses do not surface raw JSON parser errors.
- [x] Verify typecheck, lint, and build.
- [x] Document the result and lesson.

## Review

- The raw `Unexpected token '<'` message came from shared API JSON parsing, likely during the calendar data refetch after the delete shortcut invalidated queries.
- `apiGet` and `apiJson` now verify successful responses are JSON before parsing and replace parser failures with Korean fallback messages.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Optimization Refactor From FIX.md

- [x] Read `OPTIMIZATION_GUIDE.md` and map the work to the harness order.
- [x] Make the automated verification harness runnable (`npm test`, lint, typecheck).
- [x] Fix write-boundary correctness issues for sessions, students, and invitations.
- [x] Add targeted Prisma indexes for the hot query paths.
- [x] Reduce common endpoint overfetching with active-first student loading.
- [ ] Remove high-risk React Query server-state copies from focused pages/components.
- [x] Optimize repeated render-time scans in calendar/record views.
- [x] Run verification: tests, lint, typecheck, build, and migration checks where applicable.
- [x] Document final results and remaining follow-up items.

## Review

- Added the harness-requested verification setup: `npm test` now runs Vitest with path alias support, and `npm run lint` uses ESLint flat config instead of the incompatible interactive `next lint` path.
- Replaced the DB-backed session API test with mocked route tests so it no longer deletes real data and now covers invalid IDs, missing sessions, reversed PATCH intervals, unsupported enum values, and delete behavior.
- Added shared API validation helpers and applied them to session/student write boundaries.
- Session PATCH now validates partial dates against existing values and enforces `end > start`.
- Session create/PATCH now validates `understanding` and `focus` enum strings.
- Student create/PATCH now validates required strings, `YYYY-MM` start dates, color/status, and bounded numeric fields before Prisma writes.
- Invitation accept now uses a transaction-local conditional write so single-use invitation state is enforced atomically.
- `/api/students` now defaults to active students, supports `status=inactive`, `status=all`, and `includeInactive=true`, fetches only the latest session per student, and uses filtered `_count` for this-month session counts instead of loading all sessions.
- Student management now has a toggle for active-only vs inactive-included loading.
- Added targeted Prisma indexes and migration `20260531043000_add_query_indexes`.
- Optimized calendar and record rendering by memoizing student lookup maps and day/session maps instead of repeated render-time `find`/`filter`/`sort` loops.
- Verified `npx tsc --noEmit`, `npm test`, `npm run lint`, `npx prisma validate`, and `npm run build`.
- `npx prisma migrate status` correctly reports the new index migration as pending; it was not applied to the shared Neon database in this code-refactor pass.
- Remaining follow-up: complete the larger React Query/Zustand ownership cleanup for server rows, and decide whether to convert remaining `<img>` lint warnings to `next/image`.

## Calendar Hover Time Guide

- [x] Inspect week/day calendar grid hover and session block styling.
- [x] Add horizontal hover guide line to day view.
- [x] Add horizontal hover guide line to week view.
- [x] Add session block hover affordance.
- [x] Verify static checks.

## Review

- Added a horizontal dashed hover guide in day and week calendar grids so users can align the cursor with the left time axis before starting a drag-create action.
- The hover guide is pointer-event transparent and clamped within the 24-hour grid, so it does not block dragging, resizing, or clicking sessions.
- Added visible hover affordance to session blocks with lift, brightness, ring, and higher stacking order.
- Added the missing `session-block` marker class to session DOM nodes, matching the existing grid guard that avoids starting drag-create from an existing session.
- Verified `npx tsc --noEmit` and `npm run lint`; lint passes with the existing seven `<img>` warnings.

## User Timezone Preferences

- [x] Inspect current global preference model and API.
- [x] Add user-scoped preference model with primary and extra timezones.
- [x] Add Prisma migration and regenerate client.
- [x] Update preferences API to read/write authenticated user preferences.
- [x] Update timezone store to restore extra timezone selections.
- [x] Persist primary, toggle, add, and remove timezone actions from the panel.
- [x] Verify static checks and production build.

## Review

- Added `UserPreference` with `primaryTimezone` and JSON `extraTimezones` so each logged-in user can keep their own timezone setup.
- Changed `/api/preferences` from the old global `AppPreference` read/write path to authenticated user-scoped upserts.
- Restored primary and extra timezone selections into the shared timezone store from the preference query.
- Made timezone panel changes persist primary changes, extra timezone add/remove, and each extra timezone on/off toggle.
- Applied the new migration to the current Neon database manually via `prisma db execute`, then marked it applied with `prisma migrate resolve` because `prisma migrate deploy` returned a schema engine error without details.
- Confirmed `UserPreference` exists in the database, `npx prisma migrate status` is up to date, `npx tsc --noEmit` passes, and `npm run build` passes.

## Data Layer Migration Plan

- [x] Choose the data-fetching library and install it.
- [x] Add a global query provider in the app root.
- [x] Create shared API fetcher and query key definitions.
- [x] Migrate low-risk read queries first: preferences and students.
- [x] Migrate shared session queries used by dashboard, records, and reports.
- [x] Add initial mutation cache updates and invalidation rules for students, sessions, preferences, and reports.
- [x] Handle calendar range queries with range-specific query keys.
- [ ] Verify page navigation reduces repeated API calls in the browser network panel.

## Review

- Installed `@tanstack/react-query`.
- Added `components/query/QueryProvider.tsx` and wrapped the app in `app/layout.tsx`.
- Added `lib/api/client.ts` and `hooks/useAppQueries.ts` with shared query keys and hooks.
- Moved `AppShell` preferences loading to `usePreferenceQuery`.
- Moved `/students`, `/dashboard`, `/records`, `/reports`, and `/calendar` read queries onto TanStack Query.
- Added cache updates/invalidation for student add/edit/delete/unlink, session create/update/delete, report create/update, and timezone preference updates.
- Calendar sessions now use range-specific query keys via `["calendarSessions", from, to]`.
- `npx tsc --noEmit` passes.
- `npm run build` passes.

## Data Fetching Problem Documentation

- [x] Inspect current client-side API fetch locations.
- [x] Document the repeated API call problem in `docs/problem_shooting.md`.
- [x] Review the written note for clarity.

## Review

- Added a problem-shooting note describing repeated API calls during page navigation.
- Explained what "no data layer" means in this app: pages fetch directly and do not share cache, stale state, or invalidation rules.
- Documented likely improvement paths: SWR/TanStack Query, Zustand cache expansion, and moving AppShell/preferences loading into a shared layout/data layer.

## Primary Timezone Session Status

- [x] Find direct `Date` comparisons used for session status badges.
- [x] Add a primary-timezone session status helper.
- [x] Apply it to calendar, session modal, records, and dashboard status displays.
- [x] Verify static checks.

## Review

- Added `sessionStatusInPrimaryTimezone` and `primaryWallClockDateFromKstDate` in `lib/utils.ts`.
- Calendar week/day session highlighting, session modal status, records badges, and dashboard today-session badges now use primary timezone status.
- Remaining direct `session.end < now` usage is in `app/api/parent/students/route.ts` for choosing the last past lesson, not for a visible status badge.
- `npx tsc --noEmit` passes.
- `npm run build` passes.

## Favicon Debugging

- [x] Confirm `app/favicon.ico` exists and is a valid ICO.
- [x] Explicitly declare favicon metadata.
- [x] Verify static checks.

## Review

- `app/favicon.ico` exists and is a valid 32x32 ICO.
- Added explicit `metadata.icons` entries in `app/layout.tsx`.
- `npx tsc --noEmit` passes.

## Extra Timezone Hour Labels

- [x] Change extra timezone axis labels from `HH` to `HH:00`.
- [x] Verify static checks.

## Review

- Updated extra timezone hour labels in week and day calendar views to display `HH:00`.
- `npx tsc --noEmit` passes.

## Calendar Now Line Double Offset

- [x] Identify why the now-line only works for Seoul/Tokyo.
- [x] Add a wall-clock-only pixel helper for current-time indicators.
- [x] Use it in week/day now-line rendering.
- [x] Verify static checks.

## Review

- The now-line was wrong outside Seoul/Tokyo because a primary timezone wall-clock date was being passed through KST-to-primary conversion again.
- Week/day now-lines now use `topPxForWallClockDate`, which maps the primary timezone wall-clock hour directly onto the 0-23 grid.
- Normalized `Intl` hour `24` to `00`; this fixes midnight-adjacent zones like America/Chicago where `Intl` can return `24:xx`.
- Verified sample wall-clock positions: Seoul/Tokyo 14:15, Beijing 13:15, Bangkok 12:15, Kolkata 10:45, UTC 05:15, London 06:15, Paris 07:15, New York 01:15, Chicago 00:15, Denver 23:15, LA 22:15.
- `npx tsc --noEmit` passes.

## Timezone Offset Audit

- [x] Compare `TZ_CATALOG` offsets against runtime timezone data.
- [x] Identify fixed-offset vs DST-sensitive mismatches.
- [x] Apply `Intl` timezone formatting to the timezone panel current-time list.
- [x] Recommend or apply the safest calculation fix.

## Review

- Current runtime check showed Beijing `Asia/Shanghai` is UTC+8 and the displayed current time matches 11:46 when UTC is 03:46.
- Fixed-offset Asian zones in the catalog are correct: Seoul/Tokyo +9, Beijing +8, Bangkok +7, Kolkata +5:30.
- DST-sensitive zones are currently wrong in late May: London should be +1, Paris +2, New York -4, Chicago -5, Denver -6, LA -7.
- The safer fix is to stop trusting static `offset` for calculations and derive offsets/current wall-clock time from `timeZone` with `Intl.DateTimeFormat`.
- Updated `nowInTz` to accept an IANA timezone and calculate current wall-clock time with `Intl`.
- Updated `TzPanel` to pass `primary.timeZone` / `t.timeZone` instead of static offsets.
- Verified current runtime output: Beijing 11:49, Seoul 12:49.
- `npx tsc --noEmit` passes.

## Calendar Now Line Timezone

- [x] Confirm now-line currently uses local `Date#getHours`.
- [x] Add primary timezone wall-clock helper.
- [x] Apply primary timezone now to week/day now-line and today highlighting.
- [x] Verify static checks.

## Review

- Added `wallClockDateInTimeZone` in `lib/utils.ts`.
- Week, day, and month calendar today highlighting now use the primary timezone wall-clock date.
- Week/day now-line position now uses the primary timezone wall-clock time instead of the browser local hour.
- Calendar `now` state refreshes every minute while the calendar page is open.
- `npx tsc --noEmit` passes.
- `npm run build` passes after clearing a stale `.next` cache. Next.js still emits the existing Edge Runtime warning from `next-auth/jwt`/`jose`.

## Prisma Migration Directory Cleanup

- [x] Identify why `P3015` happened during build.
- [x] Remove empty legacy migration directories.
- [x] Verify Neon DB connectivity and migration status.
- [x] Keep app build separate from production DB migration.
- [x] Verify production build.

## Review

- `P3015` happened because legacy migration directories were still present without `migration.sql` files.
- Removed the empty legacy migration directories; only `20260526070000_init_postgres` remains.
- Verified Neon connectivity with a simple `SELECT 1`.
- Ran `npx prisma migrate deploy`; Prisma reports no pending migrations.
- Confirmed the Neon DB has `Account`, `User`, `Session`, `_prisma_migrations`, and related app tables.
- Changed `package.json` build back to `prisma generate && next build`; production migrations stay in `npm run db:deploy`.
- `npm run build` passes. Next.js emitted Edge Runtime warnings from `next-auth/jwt`/`jose`, but the build completed.

## App Error Pages

- [x] Inspect existing UI tone and shared controls.
- [x] Add a styled global runtime error page.
- [x] Add a styled not-found page.
- [x] Verify static checks.

## Review

- Added `app/error.tsx` with the app logo, navy theme actions, retry, and home navigation.
- Added `app/not-found.tsx` with a styled 404 page and home/login navigation.
- `npx tsc --noEmit` passes.

## Middleware Auth Cookie Name

- [x] Identify deployed Auth.js session cookie name.
- [x] Configure middleware `getToken` to read the Auth.js v5 secure session cookie.
- [x] Verify static checks.

## Review

- Added an explicit Auth.js session cookie name in `middleware.ts`.
- Production middleware now reads `__Secure-authjs.session-token`; local dev keeps `authjs.session-token`.
- `npx tsc --noEmit` passes.

## Canonical Auth Domain

- [x] Identify why `/login` keeps a `www` callbackUrl.
- [x] Redirect `www.tplanner.co.kr` requests to `tplanner.co.kr` in middleware.
- [x] Normalize login `callbackUrl` away from `www`.
- [x] Verify static checks.

## Review

- Updated `middleware.ts` to redirect `www.tplanner.co.kr` to `tplanner.co.kr`.
- The same middleware now normalizes `callbackUrl=https://www.tplanner.co.kr/...` to `https://tplanner.co.kr/...`.
- `/login`, `/privacy`, and `/docs/*` remain public after canonical URL normalization.
- `npx tsc --noEmit` passes.

## OAuth Profile Sync Robustness

- [x] Identify the Prisma `user.update` failure during OAuth sign-in.
- [x] Make optional OAuth profile sync tolerant when the user row is not available yet.
- [x] Verify static checks.

## Review

- Replaced optional OAuth profile `prisma.user.update` with `upsert` in `auth.ts`.
- This keeps sign-in tolerant if profile sync runs before the expected user row exists.
- `npx tsc --noEmit` passes.

## Neon Postgres Prisma Migration

- [x] Identify the production auth error root cause.
- [x] Switch Prisma datasource from SQLite to Postgres.
- [x] Replace SQLite migrations with a Postgres initial migration for first deploy.
- [x] Add deployment-friendly Prisma scripts.
- [x] Verify Prisma schema and TypeScript checks.

## Review

- The production error was caused by `provider = "sqlite"` receiving a Neon `postgresql://...` `DATABASE_URL`.
- Updated `prisma/schema.prisma` to use PostgreSQL.
- Replaced SQLite-specific migration SQL with `20260526070000_init_postgres`.
- Updated `migration_lock.toml` to `postgresql`.
- Updated `package.json` so `npm run build` runs `prisma generate` first, and added `db:deploy` / `db:generate`.
- Verified with `prisma validate`, `npx tsc --noEmit`, and `npm run build` using a Postgres-formatted URL.

## Production Auth Configuration Error

- [x] Inspect Auth.js provider configuration and login buttons.
- [x] Add production host trust for custom domain OAuth redirects.
- [x] Verify static checks.

## Review

- Added `trustHost: true` to `auth.ts` so Auth.js can generate OAuth URLs correctly behind the production custom domain.
- The remaining likely causes are missing/mismatched production env vars or OAuth console callback/origin settings.
- `npx tsc --noEmit` passes.

## Login Privacy Link

- [x] Add a small privacy policy link to the login page.
- [x] Verify static checks.

## Review

- Added a small `개인정보처리방침` link below the login helper text in `app/login/page.tsx`.
- The link uses `/privacy`, so it resolves to `https://www.tplanner.co.kr/privacy` in production.
- `npx tsc --noEmit` passes.

## Public Privacy Policy Page

- [x] Confirm the uploaded privacy policy PDF location.
- [x] Add a public `/privacy` page that displays the PDF.
- [x] Exclude `/privacy` and `/docs` from auth middleware.
- [x] Verify static checks.

## Review

- Added `app/privacy/page.tsx` as a login-free PDF viewer for `public/docs/privacy-policy.pdf`.
- Updated `middleware.ts` so `/privacy` and `/docs/*` are public.
- `npx tsc --noEmit` passes.

## Report Default Selection

- [x] Confirm current report card sort and default selection behavior.
- [x] Share the status/name sort between the card list and initial selection.
- [x] Verify the page still passes static checks.

## Review

- Added a shared `compareStudentsByReportOrder` helper in `app/reports/page.tsx`.
- Initial report selection now uses the first student after the same status/name ordering used by the card grid.
- `npm run lint` could not complete because Next.js prompts to create an ESLint config.
- `npx tsc --noEmit` currently fails on pre-existing unrelated issues in `__tests__/api/sessions-[id].test.ts` and student modal components.

## Report Draft Flow

- [x] Add a preparation step after session selection.
- [x] Let the tutor choose which report sections to include.
- [x] Generate an editable local report draft from selected sessions.
- [x] Verify static checks after the UI cleanup.

## Review

- Added a report preparation step in `app/reports/page.tsx` after session selection.
- Added section toggles and an editable draft view generated from the selected sessions.
- Disabled the future save step so the current draft-only scope is clear.
- `npx tsc --noEmit` still fails on pre-existing unrelated errors in `__tests__/api/sessions-[id].test.ts` and student modal components.

## Report Draft API

- [x] Add `POST /api/reports/draft` with `NextRequest`.
- [x] Move draft generation click flow to call the API.
- [x] Add loading/error handling in the report UI.
- [x] Run static verification and record the result.

## Review

- Added `POST /api/reports/draft` in `app/api/reports/draft/route.ts`.
- The report screen now calls the draft API from `createDraft` instead of generating the draft directly in the client.
- Added draft generation loading and error states.
- `npx tsc --noEmit` still fails on the existing unrelated test helper and student modal type errors.

## Report Summary Format

- [x] Format report summary as one line per selected session.
- [x] Include month/day, weekday, AM/PM time range, and session notes.
- [x] Verify static checks after the summary format change.

## Review

- Updated `POST /api/reports/draft` summary generation to output one line per selected session.
- Summary lines now include month/day, weekday, AM/PM time range, and session notes.
- Summary lines are sorted by session date ascending.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Reports API

- [x] Add Report and ReportSession models.
- [x] Add database migration for saved reports.
- [x] Implement reports list/create API.
- [x] Implement reports detail/update/delete API.
- [x] Update README API reference.
- [x] Regenerate Prisma client and run static verification.

## Review

- Added `Report` and `ReportSession` to Prisma schema.
- Added and applied migration `20260518120000_add_reports`.
- Added `GET/POST /api/reports` and `GET/PATCH/DELETE /api/reports/:id`.
- Updated `README.md` with report DB relationships and API reference.
- Updated shared `Report` type for saved reports.
- `npx prisma validate` passes.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Reports Interface

- [x] Load saved reports with students and sessions.
- [x] Make the right panel default to report list.
- [x] Switch the right panel to the existing create flow from the list button.
- [x] Add saved report edit and save flow.
- [x] Save generated drafts through `POST /api/reports`.
- [x] Run static verification.

## Review

- Updated `/reports` to keep the two-panel layout: student list on the left, report list/create/edit on the right.
- The right panel now defaults to saved report list for the selected student.
- Added `리포트 생성` flow that switches the right panel into the existing session selection and draft generation UI.
- Added `POST /api/reports` save from generated draft.
- Added saved report edit mode backed by `PATCH /api/reports/:id`.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Report Title Editing

- [x] Keep the default report title as student name + year/month.
- [x] Show an editable title field before draft generation.
- [x] Verify static checks.

## Review

- The create flow still defaults to `학생이름 YYYY년 M월 리포트`.
- Added an editable report title field to the report preparation step before draft generation.
- The draft and edit screens already keep the title editable.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Report Header Title

- [x] Make the report header title editable.
- [x] Remove the duplicate lower title input in draft/edit screens.
- [x] Verify static checks.

## Review

- Draft and edit headers now use the editable title input directly in the top title area.
- Removed the duplicate lower title input from draft and edit screens.
- Status remains in its own compact control.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Calendar Stabilization

- [x] Load students and sessions from API on the calendar page.
- [x] Add store setters for calendar data hydration.
- [x] Add a real day view instead of reusing the week view.
- [x] Keep month/week/day navigation state consistent.
- [x] Run static verification.

## Review

- Calendar page now loads students and sessions from `/api/students` and `/api/sessions`.
- Added store hydration actions for students and sessions.
- Replaced the fake day view with a dedicated `DayView`.
- Month/week/day navigation now keeps `curDay`, `curWeekStart`, and `curMonth` in sync.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Responsive Calendar Height

- [x] Make week/day hour height fill available space on tall screens.
- [x] Keep a compact minimum hour height for smaller screens.
- [x] Pass dynamic hour height into session positioning.
- [x] Run static verification.

## Review

- Week/day views now calculate hour height from the available calendar body height.
- Hour height keeps `28px` as a compact minimum, then expands on taller screens to fill the view.
- Session block and now-line positioning now receive the dynamic hour height.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Calendar Grid Height

- [x] Give week/day grid content an explicit 24-hour height.
- [x] Keep gutter and grid body aligned when dynamic hour height changes.
- [x] Run static verification.

## Review

- Week view now gives the day-column grid an explicit `hourHeight * 24` height.
- Day view now gives its grid body the same explicit 24-hour height.
- This keeps the left time gutter and right calendar grid aligned when the layout is shorter than the full grid.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Calendar Session Display

- [x] Render month sessions as `HH:MM 학생 이름`.
- [x] Render week/day sessions as `HH:MM ~ HH:MM 학생 이름`.
- [x] Match calendar card colors to student avatar colors.
- [x] Keep sessions sorted by start time in calendar views.
- [x] Run static verification.

## Review

- Month view session chips now render `HH:MM 학생 이름`.
- Week/day session blocks now render `HH:MM ~ HH:MM 학생 이름`.
- Calendar session colors now use the same avatar gradient background.
- Month/week/day sessions are sorted by start time before rendering.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.

## Calendar Session API

- [x] Add calendar-focused session range API.
- [x] Load calendar sessions by visible month/week/day range.
- [x] Keep students loaded for color/name display.
- [x] Use real current date for calendar defaults.
- [x] Run static verification.

## Review

- Added `GET /api/calendar/sessions` with visible range filtering.
- Calendar page now fetches sessions by the current month/week/day range.
- Calendar session responses include student summary data for name/color display.
- Calendar defaults now use the real current date instead of the old seed/demo date.
- `npx tsc --noEmit` still fails only on existing unrelated test helper and student modal type errors.
- Verified the calendar API returns the expected 2026-05-18 sessions from the local dev server.
- Session modal updates now upsert the edited session back into the shared store for immediate calendar refresh.

## Continuous Calendar Scroll

- [x] Expand calendar session fetching to cover the rendered scroll window.
- [x] Implement vertical continuous month scrolling.
- [x] Implement horizontal continuous week scrolling.
- [x] Keep topbar navigation and scroll position synchronized.
- [ ] Verify static checks and document remaining issues.

## Login Page

- [x] Add `/login` route with centered TutorDesk sign-in UI.
- [x] Make the Google sign-in button preserve `callbackUrl`.
- [x] Leave a clean provider-extension area for future login methods.
- [x] Verify the route compiles and document results.

## Review

- Added `app/login/page.tsx` as a standalone centered login page.
- The Google sign-in button points to `/api/auth/signin/google` and preserves `callbackUrl`.
- Added an empty dashed provider area below the Google button for future login methods.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified `/login` compiles and returns `200 OK` on the local Next dev server.

## Google Identity Button

- [x] Replace the custom Google sign-in link with the Google Identity Services button.

## Login Static Asset 404

- [ ] Confirm whether `/login` HTML references static chunks that exist in `.next/static`.
- [ ] Check whether the dev server is serving a stale build id or wrong port.
- [ ] Apply the smallest fix for the static asset 404.
- [ ] Verify `/login` loads CSS/JS assets and document the result.
- [x] Load the Google Identity Services script on `/login`.
- [x] Verify static checks and route compilation.

## Review

- Replaced the custom `/api/auth/signin/google` link with the Google Identity Services `g_id_onload` and `g_id_signin` elements.
- Added the Google Identity Services script to `/login`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified `/login` compiles and returns `200 OK` on the local Next dev server.

## Auth Foundation

- [x] Rename the Prisma domain `Session` model to `LessonSession` while keeping the existing DB table mapped.
- [x] Add Auth.js-compatible `User`, `Account`, `Session`, and `VerificationToken` models.
- [x] Add TutorDesk role/student ownership models: `User.role`, `Student.instructorId`, `StudentParent`, `StudentInvitation`.
- [x] Update server code from `prisma.session` to `prisma.lessonSession`.
- [x] Install Auth.js Prisma adapter dependencies and create the basic Auth.js route/config.
- [x] Verify Prisma validation, client generation, and TypeScript status.

## Review

- Added `next-auth@beta` and `@auth/prisma-adapter`.
- Renamed the domain Prisma model from `Session` to `LessonSession` with `@@map("Session")`, so existing lesson data stays in the same DB table.
- Added Auth.js tables: `User`, `Account`, `Session` mapped to `AuthSession`, and `VerificationToken`.
- Added role and relationship models for TutorDesk: `User.role`, `Student.instructorId`, `StudentParent`, and `StudentInvitation`.
- Created migration `20260521151213_add_auth_foundation` and regenerated Prisma Client.
- Added `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, `types/next-auth.d.ts`, and `components/auth/GoogleSignInButton.tsx`.
- Switched `/login` back to Auth.js `signIn("google")` flow.
- Added `AUTH_SECRET` and `AUTH_GOOGLE_ID` to `.env`; `AUTH_GOOGLE_SECRET` still needs the real Google client secret.
- `npx prisma validate` passes.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified `/login` returns `200 OK` and `/dashboard` redirects to `/login` when unauthenticated.

## Auth Middleware Edge Fix

- [x] Stop importing Prisma-backed Auth.js config in middleware.
- [x] Switch Auth.js sessions to JWT so middleware can check auth without DB access.
- [x] Verify `/dashboard` redirects unauthenticated users without Prisma Edge runtime errors.

## Review

- Changed Auth.js session strategy from database sessions to JWT sessions.
- Rewrote `middleware.ts` to use `next-auth/jwt` `getToken()` directly instead of importing the Prisma-backed Auth.js config.
- This keeps Prisma out of Edge Runtime middleware while preserving unauthenticated redirects.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified `/dashboard` redirects to `/login?callbackUrl=...` without the Prisma Edge Runtime error.

## Instructor Data Ownership

- [x] Attach existing local students to Gihun Lee's instructor user.
- [x] Remove the local seed script and package seed command.
- [x] Remove seed setup references from README.
- [x] Verify ownership data and static checks.

## Review

- Updated all existing local students with `instructorId = cmpfn6usg0000wu7lkwuaz3p4` for Gihun Lee.
- Verified Gihun Lee owns 9 students and there are 0 unowned students.
- Deleted `prisma/seed.ts`.
- Removed `db:seed` and `package.json#prisma.seed` from `package.json`.
- Removed seed setup instructions from `README.md`.
- `npx prisma validate` passes.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Instructor API Filtering

- [x] Add a shared instructor auth helper for API routes.
- [x] Filter students APIs by `Student.instructorId`.
- [x] Filter sessions and calendar session APIs through owned students.
- [x] Filter homework APIs through owned session students.
- [x] Filter report and report draft APIs through owned students/sessions.
- [x] Verify TypeScript and key auth-filter behavior.

## Review

- Added `lib/auth/permissions.ts` with `requireInstructor()` for API route ownership checks.
- `GET/POST /api/students` and `GET/PATCH/DELETE /api/students/:id` now require instructor auth and use `Student.instructorId`.
- `GET/POST /api/sessions`, `GET/PATCH/DELETE /api/sessions/:id`, and `GET /api/calendar/sessions` now filter through owned students.
- `GET/POST /api/homeworks` and `GET/PATCH/DELETE /api/homeworks/:id` now filter through the homework session's owned student.
- `GET/POST /api/reports`, `GET/PATCH/DELETE /api/reports/:id`, and `POST /api/reports/draft` now validate owned students and owned sessions.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified protected API routes redirect unauthenticated requests to `/login?callbackUrl=...`.

## Parent Invitation API

- [x] Add parent auth helper and invite code utilities.
- [x] Add instructor invitation create/list/revoke APIs for owned students.
- [x] Add parent invitation accept API.
- [x] Verify Prisma validation, TypeScript status, and API behavior.

## Review

- Added `requireParent()` alongside `requireInstructor()`.
- Added invite code utilities in `lib/invitations.ts`; codes are 8-character uppercase alphanumeric strings and DB stores only SHA-256 hashes.
- Added `GET/POST /api/students/:id/invitations` for instructor-owned students. `POST` returns the raw invite code once and sets `expiresAt` to 24 hours later.
- Added `DELETE /api/students/:id/invitations/:invitationId` to revoke an instructor-owned invitation.
- Added `POST /api/invitations/accept` for parent users. It validates code format, rejects revoked/accepted/expired codes, creates `StudentParent`, and marks the invitation accepted.
- `npx prisma validate` passes.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified unauthenticated invitation routes redirect to `/login?callbackUrl=...`.

## Role Onboarding

- [x] Make `User.role` nullable for first-login role selection.
- [x] Add role assignment API for authenticated users with no role.
- [x] Add centered instructor/parent role selection page.
- [x] Redirect logged-in users with no role to role onboarding.
- [x] Verify Prisma migration, TypeScript status, and routing behavior.

## Review

- Changed `User.role` to nullable and added migration `20260521155014_make_user_role_nullable`.
- Existing users keep their current role; new users can start with `role = null`.
- Added `PATCH /api/me/role` to assign `instructor` or `parent` only when the current user has no role yet.
- Added `/onboarding/role` with two large centered cards for `선생님` and `학부모`.
- Updated Google sign-in default callback to `/onboarding/role`.
- Updated middleware so authenticated users with no role are redirected to `/onboarding/role`, while users with a role are redirected away from onboarding to `/dashboard`.
- `npx prisma validate` passes.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified `/onboarding/role` redirects unauthenticated users to `/login?callbackUrl=...` and `/login` returns `200 OK`.

## Parent Main Page

- [x] Add `GET /api/parent/students` for parent-owned student dashboard data.
- [x] Add `/parent` main page with invite-code empty state and child switching.
- [x] Show sessions, homework status, and reports for the selected child.
- [x] Route parent `/dashboard` traffic to `/parent`.
- [x] Verify TypeScript status and route/API behavior.

## Review

- Added `GET /api/parent/students`, scoped to `StudentParent.parentId`, returning child dashboard data: stats, next session, recent sessions, pending homework by session, and reports.
- Added `/parent` as the first parent main page using the existing dashboard frame.
- Parent page supports invite-code entry, empty state, child switching tabs, session history, homework status, homework completion rate, and report cards.
- Middleware now redirects parent users from `/dashboard` to `/parent`, and redirects instructors away from `/parent` to `/dashboard`.
- `npx prisma validate` passes.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified unauthenticated `/parent` and `/api/parent/students` redirect to `/login?callbackUrl=...`.

## Role Session Refresh

- [x] Refresh the Auth.js JWT after role assignment.
- [x] Handle client session update in the Auth.js JWT callback.
- [x] Verify TypeScript status.

## Review

- Confirmed the DB user `leegihun2099@gmail.com` is already `role = parent`.
- Updated `RoleSelection` to call `useSession().update({ role })` after `PATCH /api/me/role`.
- Updated the Auth.js `jwt` callback to apply `trigger === "update"` role changes into the JWT.
- This prevents middleware from continuing to see a stale `token.role = null` immediately after role assignment.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Session Provider Fix

- [x] Add an Auth.js client session provider wrapper.
- [x] Wrap the root app layout with the provider.
- [x] Verify `/onboarding/role` no longer throws the `SessionProvider` error.
- [x] Document the result.

## Review

- Added `components/auth/AuthSessionProvider.tsx` with Auth.js `SessionProvider`.
- Wrapped the root app layout children with `AuthSessionProvider`.
- Verified `/onboarding/role` no longer returns 500 in the dev server; unauthenticated requests redirect to `/login?callbackUrl=...`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Role Redirect Fix

- [x] Stop middleware from forcing stale `token.role = null` users back to onboarding on role-specific pages.
- [x] Make `/onboarding/role` check the database role and redirect users who already have a role.
- [x] Make role-specific API authorization enforce role from the database.
- [x] Verify redirects and document remaining static-check status.

## Review

- Added `lib/auth/roles.ts` for shared role validation, DB role lookup, and role home routing.
- Updated `/onboarding/role` to read the DB role and redirect existing parent users to `/parent`, instructor users to `/dashboard`.
- Updated middleware so stale JWTs with `role = null` do not force every protected route back to `/onboarding/role`.
- Updated Auth.js `jwt` callback to refresh `token.role` from the database when the session is evaluated.
- Updated API permission helpers to authorize instructor/parent access from the database role instead of trusting a stale session role.
- Verified unauthenticated `/onboarding/role`, `/parent`, and `/dashboard` still redirect to `/login?callbackUrl=...`.
- Verified local DB users include `leegihun2099@gmail.com` as `parent` and `leegihun8752@gmail.com` as `instructor`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Student Parent Link Panel

- [x] Include linked parent summaries in the instructor student list API.
- [x] Extend the shared student type for linked parents.
- [x] Show linked parent names between latest lesson content and action buttons.
- [x] Show an invite-code generation action when no parent is linked.
- [x] Verify TypeScript status and affected route behavior.

## Review

- Updated `GET /api/students` to include each student's linked parent names/emails via `StudentParent`.
- Extended the shared `Student` type with optional `parents`.
- Added a `학부모 연결` block in the instructor student detail panel between latest lesson content and the `수업 기록`/`리포트` buttons.
- If a parent is linked, the panel shows linked parent name and email instead of an invite action.
- If no parent is linked, the panel shows `초대코드 생성`; clicking it calls `POST /api/students/:id/invitations` and displays the 24-hour code inline.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Invitation Regeneration Policy

- [x] Revoke existing active invitations before creating a new code for the same student.
- [x] Keep accepted, expired, and already revoked invitations unchanged.
- [x] Verify TypeScript status.
- [x] Document the result.

## Review

- Updated `POST /api/students/:id/invitations` to run in a transaction.
- Before creating a new invitation, the API now sets `revokedAt = now` on existing invitations for the same student/instructor where `acceptedAt` and `revokedAt` are null and `expiresAt` is still in the future.
- Accepted, expired, and already revoked invitations are left unchanged.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Student Row Selection

- [x] Change student row clicks to select the student instead of navigating to records.
- [x] Keep records navigation on the detail panel action button.
- [x] Verify TypeScript status.
- [x] Document the result.

## Review

- Updated the `/students` table row click handler to call `setSelectedId(stu.id)`.
- The right detail panel now changes to the clicked student instead of navigating away.
- The `수업 기록` detail-panel button still navigates to `/records?student=...`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Student Initial Selection

- [x] Select the first active student by name on initial load.
- [x] Keep fallback behavior for no active students.
- [x] Verify TypeScript status.
- [x] Document the result.

## Review

- Added a shared default-selection helper in `/students`.
- Initial selected student now follows `active -> inactive`, then student name ascending.
- If the selected student disappears, fallback selection uses the same ordering.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Parent Read-Only Shared Pages

- [x] Add shared role-aware read permissions for instructor and parent.
- [x] Allow parent read-only `GET` access to linked students, sessions, calendar sessions, reports, and homework data.
- [x] Keep create/update/delete APIs instructor-only.
- [x] Hide or disable mutation UI on `/students`, `/records`, `/reports`, and `/calendar` for parent users.
- [x] Verify TypeScript status and key read-only behavior.

## Review

- Added `requireViewer()` plus shared student/session access filters in `lib/auth/permissions.ts`.
- Updated read APIs so parent users can load only students linked through `StudentParent`: `GET /api/students`, `GET /api/sessions`, `GET /api/sessions/:id`, `GET /api/calendar/sessions`, `GET /api/homeworks`, `GET /api/homeworks/:id`, `GET /api/reports`, and `GET /api/reports/:id`.
- Left create/update/delete APIs protected by `requireInstructor()`.
- `/students` now hides add/edit/invite actions for parent users while keeping student detail, records, and reports navigation.
- `/records` now hides new-record creation and makes the editor read-only for parent users.
- `/reports` now hides report generation/save actions and shows saved reports in read-only mode for parent users.
- `/calendar` now hides the add-session button and makes session modals read-only for parent users.
- Sidebar profile now reflects the signed-in user's name and parent/instructor role.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Parent Student Unlink

- [x] Add parent-only API to disconnect a student link.
- [x] Replace the parent-side `학부모 연결` block with a disconnect option.
- [x] Remove disconnected students from the local `/students` list and update selection.
- [x] Verify TypeScript status.

## Review

- Added `DELETE /api/parent/students/:id` to remove only the `StudentParent` link for the signed-in parent.
- The API does not delete the student, sessions, reports, or instructor-owned data.
- On `/students`, parent users now see `학생 연결` with a `연결 해제` button in the right detail panel.
- After unlinking, the student is removed from the local list and the existing default-selection fallback picks the next available student.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Parent Instructor Info

- [x] Include instructor summary in the shared student list API.
- [x] Extend the shared student type with instructor info.
- [x] Show instructor info above the parent unlink button.
- [x] Verify TypeScript status.

## Review

- Updated `GET /api/students` to include `instructor` summary data: id, name, and email.
- Extended the shared `Student` type with optional `instructor`.
- Replaced the parent-side unlink helper text with 담당 선생님 name/email.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Parent Readability Polish

- [x] Replace parent read-only session fields with non-focusable text panels.
- [x] Replace parent read-only report fields with non-focusable text panels.
- [x] Remove editable hover/focus affordances from parent calendar session modal.
- [x] Verify TypeScript status.

## Review

- Replaced parent read-only record fields for date, time, place, and notes with plain text panels instead of focusable inputs.
- Replaced parent read-only report title and report sections with non-focusable text blocks.
- Replaced parent calendar session modal place/notes controls with plain text blocks.
- Removed read-only hover styling from understanding/focus option buttons.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Dashboard Greeting Name

- [x] Read the signed-in instructor name on dashboard.
- [x] Show first name/token in the greeting.
- [x] Verify TypeScript status.
- [x] Document the result.

## Review

- Updated the instructor dashboard greeting to use `useSession()` user name.
- The greeting now uses the first whitespace-separated name token and renders `안녕하세요, {first} 선생님`.
- Falls back to `안녕하세요, 선생님` if Auth.js has no user name.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Calendar Drag Create Session

- [x] Reuse the session creation modal with calendar-selected start/end times.
- [x] Replace week-view temporary session creation with real create-modal flow.
- [x] Add drag-to-create selection to day view.
- [x] Keep parent/read-only calendar creation disabled.
- [x] Verify TypeScript status.

## Review

- Extended `NewSessionRecordModal` to accept optional `initialStart` and `initialEnd`.
- Calendar page now owns a selected create range and opens the existing session creation modal with that range.
- Week view drag selection no longer creates a temporary store session; it opens the real creation modal and saves through `POST /api/sessions`.
- Day view now supports the same drag-to-create behavior with a preview block.
- Only instructor users receive drag-create handlers and the add-session button; parent/loading sessions do not.
- Created sessions are added to the calendar store after successful API save.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.
- Verified unauthenticated `/calendar` still redirects to `/login?callbackUrl=...` on the dev server.

## Weekly Drag Ghost Alignment

- [x] Align the week-view drag ghost to the same coordinate space as day columns.
- [x] Ensure ghost width matches the day column content area.
- [x] Verify TypeScript status.
- [x] Document the result.

## Review

- Updated `WeekView` drag ghost positioning to include the day-column container's `offsetLeft`.
- The ghost now uses the same coordinate space as the weekly day columns instead of starting at the outer grid container.
- Width still tracks the dragged day column minus the existing inner padding.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Google Sign-In Button Design

- [x] Keep Auth.js Google sign-in flow.
- [x] Replace the custom fake `G` button with Google-branded button styling.
- [x] Verify TypeScript status.
- [x] Document why the raw GIS `data-login_uri` markup is not used directly.

## Review

- Updated `components/auth/GoogleSignInButton.tsx` to use Google-colored logo SVG and official-style white button treatment.
- Kept `signIn("google")` so the app still uses the existing Auth.js OAuth flow.
- Did not paste the raw `g_id_onload` / `data-login_uri` markup because Google Identity Services posts an ID token to `login_uri`, while the current app is wired through Auth.js Google OAuth callbacks.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Kakao Login Button

- [x] Add Kakao provider to Auth.js.
- [x] Add a Kakao login button that calls `signIn("kakao")`.
- [x] Place Kakao button on the login page.
- [x] Verify TypeScript status.

## Review

- Added `Kakao` provider to `auth.ts`; it will use Auth.js's Kakao OAuth flow.
- Added `components/auth/KakaoSignInButton.tsx`, which calls `signIn("kakao")` with the same callback behavior as Google.
- Added the Kakao login button under the Google button on `/login`.
- The raw Kakao authorize URL is not embedded in the button; Auth.js builds it and handles token exchange through `/api/auth/callback/kakao`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Kakao Provider Env Fix

- [x] Wire Kakao provider to the existing `.env` key name.
- [x] Keep support for Auth.js-style `AUTH_KAKAO_ID`.
- [x] Verify TypeScript status.
- [x] Document the result.

## Review

- Updated Kakao provider config to read `AUTH_KAKAO_ID` or the existing `KAKAO_API_KEY`.
- Confirmed `/api/auth/providers` now exposes `kakao`.
- Confirmed Auth.js POST sign-in creates a Kakao authorize URL.
- Updated `KakaoSignInButton` to request the sign-in URL with `redirect: false`, then manually assign `window.location.href`, with loading/error UI.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Auth Session Lifetime

- [x] Set TutorDesk app session lifetime to 3 days, independent of Google/Kakao token expiry.
- [x] Add active-session refresh behavior so continued app use keeps the session alive.
- [x] Verify Auth.js config and static type status.
- [x] Document the resulting behavior and remaining caveats.

## Review

- Updated `auth.ts` so Auth.js JWT app sessions expire after 3 days.
- Kept Google/Kakao OAuth tokens separate from TutorDesk's app session policy.
- Updated `AuthSessionProvider` to refetch the Auth.js session every 30 minutes, on window focus, and only while online so active browser use refreshes the session cookie.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Sidebar Logout

- [x] Review sidebar profile structure and Auth.js client logout API.
- [x] Add a profile popover that rises above the sidebar footer.
- [x] Add a best-effort OAuth token revocation API for connected Google/Kakao accounts.
- [x] Add logout action that clears the TutorDesk Auth.js session and returns to `/login`.
- [x] Verify TypeScript status and document OAuth provider-session caveat.

## Review

- Added a profile popover in the sidebar footer that animates upward when the profile button is clicked.
- Added a logout button with loading state.
- Added `POST /api/auth/revoke-oauth` to best-effort revoke Google/Kakao app tokens before signing out.
- The logout flow always clears the Auth.js session and returns to `/login`, even if provider token revocation fails.
- Provider website cookies are not fully controllable from TutorDesk; Google/Kakao may still keep their own browser login session.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Brand Logo Rename

- [x] Replace visible TutorDesk logo marks with `public/images/logo/app_logo.jpg`.
- [x] Rename visible TutorDesk brand text to `쌤플래너`.
- [x] Verify changed files and TypeScript status.
- [x] Document the result.

## Review

- Updated app metadata title to `쌤플래너`.
- Replaced the login page letter mark with `/images/logo/app_logo.jpg` and changed the heading to `쌤플래너`.
- Replaced the sidebar brand icon with `/images/logo/app_logo.jpg` and changed the brand text to `쌤플래너`.
- Updated onboarding metadata and README title so visible `TutorDesk` references no longer remain in `app`, `components`, or `README.md`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Public Logo Middleware Fix

- [x] Confirm why `/images/logo/app_logo.jpg` does not render on `/login`.
- [x] Exclude public static asset paths from auth middleware redirects.
- [x] Verify the logo URL returns image content instead of a login redirect.
- [x] Document the result.

## Review

- The logo file existed, but auth middleware redirected `/images/logo/app_logo.jpg` to `/login`, so the browser could not load it as an image.
- Updated `middleware.ts` matcher to exclude `/images`.
- Verified `GET /images/logo/app_logo.jpg` now returns `200 OK` with `Content-Type: image/jpeg`.
- Added a lesson to check middleware exclusions when public assets are used on auth screens.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## User Profile Image

- [x] Keep student avatars unchanged.
- [x] Render signed-in instructor/parent profile image when `session.user.image` exists.
- [x] Fall back to the current text avatar when no profile image exists.
- [x] Verify TypeScript status and document the result.

## Review

- Added a `UserAvatar` helper inside `Sidebar.tsx`.
- Sidebar now renders `session.user.image` for instructor/parent profiles when OAuth provides an image.
- If no user image exists, the sidebar falls back to the existing text avatar.
- Student avatar components and student pages were not changed.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Kakao Profile Image Sync

- [x] Confirm why the Kakao instructor user has `image: null`.
- [x] Request Kakao profile image scope during OAuth sign-in.
- [x] Sync provider profile name/email/image into existing `User` rows on sign-in.
- [x] Verify TypeScript status and document the re-login requirement.

## Review

- The existing Kakao account row only had `scope: profile_nickname`, so Kakao did not provide a profile image for that login.
- Updated Kakao Auth.js provider config to request `profile_nickname profile_image`.
- Added a `signIn` callback that syncs optional provider `name`, `email`, and `image` into the existing `User` row when the provider returns them.
- The current Kakao user must log out and log in again after Kakao profile image consent is enabled to populate `User.image`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Kakao Authorization URL Fix

- [x] Reproduce the Auth.js `Invalid URL` cause from the Kakao provider config.
- [x] Add an explicit Kakao authorization URL while keeping the profile image scope.
- [x] Verify Kakao sign-in URL generation.
- [x] Document the result.

## Review

- The previous Kakao config overrode the provider's default authorization string with only `params`, leaving Auth.js without an authorization URL.
- Added `authorization.url: "https://kauth.kakao.com/oauth/authorize"` while preserving `scope: "profile_nickname profile_image"`.
- Verified `POST /api/auth/signin/kakao` now returns a Kakao authorize URL with the requested profile image scope.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Settings Account Page

- [x] Create a separated account settings component.
- [x] Add `/settings` page using the existing app shell.
- [x] Show profile image or fallback avatar, name, email, role, and logout.
- [x] Reuse the existing logout/revoke flow.
- [x] Verify TypeScript status and document the result.

## Review

- Added `components/settings/AccountSettings.tsx` as a dedicated account settings component.
- Added `app/settings/page.tsx` using the existing `AppShell`.
- The settings page shows profile image fallback, name, email, role, and a logout action.
- Logout reuses the existing `/api/auth/revoke-oauth` then Auth.js `signOut` flow.
- Verified unauthenticated `/settings` redirects to `/login?callbackUrl=...`.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Navy Theme

- [x] Use the app logo navy as the primary theme color.
- [x] Update Tailwind `sky` palette so existing theme classes become navy.
- [x] Update hard-coded primary shadows, focus rings, and drag-create accents.
- [x] Keep student color palettes differentiated.
- [x] Verify TypeScript status and document the result.

## Review

- Updated Tailwind's extended `sky` palette to a logo-navy scale centered on `#164b7a`.
- Updated shared primary button shadows and global focus/drag-create accents to navy rgba values.
- Replaced auth/settings page backgrounds with a calmer neutral blue-gray.
- Updated sidebar/login/settings/onboarding hard-coded blue shadows and user fallback avatars to the navy theme.
- Left `lib/constants.ts` student color `s-blue` unchanged because it is a student avatar/session color, not the product theme.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Parent Student Avatar Color

- [x] Find parent dashboard student profile card avatar rendering.
- [x] Replace fixed theme color with each student's configured avatar color.
- [x] Verify TypeScript status and document the result.

## Review

- Found the parent dashboard student selector avatar was using fixed `bg-sky-500`, so it followed the product theme instead of the student's configured color.
- Updated `app/parent/page.tsx` to use `resolveAvatarBg(student.color)` for the student avatar background.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## Parent Reports Student Grid

- [x] Find the report page student card grid.
- [x] Use 2 columns for parent users while keeping instructor density unchanged.
- [x] Verify TypeScript status and document the result.

## Review

- Updated the `/reports` student card grid to render `grid-cols-2` for parent/read-only users.
- Instructor users still get the existing `grid-cols-4` layout.
- `npx tsc --noEmit` still fails only on the existing unrelated test helper and student modal type errors.

## TypeScript Build Fix

- [x] Re-run `npx tsc --noEmit` and capture the current failures.
- [x] Restore missing API test helpers.
- [x] Replace string spread in student modals with a target-safe first-character helper.
- [x] Narrow nullable student references in the edit modal async handlers and delete dialog.
- [x] Verify `npx tsc --noEmit` passes.

## Review

- Added `__tests__/helpers.ts` with request/response helpers used by the session route tests.
- Updated `AddStudentModal` and `EditStudentModal` to use `Array.from(t).at(0)` instead of string spread.
- Added `currentStudent` in `EditStudentModal` so async handlers and JSX no longer reference a nullable `student`.
- `npx tsc --noEmit` now passes.

## Git Ignore And Staging Check

- [x] Check currently staged files.
- [x] Verify secrets and local DB files are not tracked.
- [x] Expand `.gitignore` for SQLite sidecar/nested DB files.
- [x] Re-run ignore checks and document the result.

## Review

- There were no staged files at the start of the check.
- `.env`, `prisma/dev.db`, and common SQLite sidecar names are ignored.
- Found `prisma/prisma/test.db` was already tracked by Git, which is unsafe for deployment commits.
- Removed `prisma/prisma/test.db` from Git tracking with `git rm --cached`; the local file remains ignored.
- Expanded `.gitignore` to cover nested Prisma DB files, `*.db-journal`, `*.sqlite`, and `*.sqlite3`.
- Current staged change is only the deletion of tracked `prisma/prisma/test.db` from the repository index.

## Production Build Fix

- [x] Run `npm run build` locally.
- [x] Fix `/records` production prerender error from `useSearchParams`.
- [x] Mark auth-backed API routes as dynamic where build tries static rendering.
- [x] Re-run `npm run build` and document the result.

## Review

- Initial `npm run build` compiled but failed while prerendering `/records` because `RecordsWorkspace` uses `useSearchParams`.
- Wrapped `RecordsWorkspace` with `Suspense` in `app/records/page.tsx`.
- Added `dynamic = "force-dynamic"` to `app/api/parent/students/route.ts` and `app/api/calendar/sessions/route.ts` to avoid static rendering attempts for auth-backed API routes.
- Re-ran `npm run build`; it now passes.

## Calendar Session Editor Popover

- [x] Trace calendar session click flow and current session modal state.
- [x] Store the clicked session element bounds when opening a session.
- [x] Render the session editor beside the clicked session, choosing the side with more space.
- [x] Preserve mobile/small-screen fallback behavior.
- [x] Verify TypeScript/build status and document the result.

## Review

- Added `SessionEditorAnchor` state to the shared store so calendar session clicks can carry the clicked element bounds.
- Updated day, week, and month calendar session clicks to open the session editor anchored to the clicked block/chip.
- Changed `SessionModal` to render as a side popover when an anchor exists, picking the side with more available space and falling back to a bottom sheet on small screens.
- Kept the existing centered modal/backdrop behavior for any future unanchored `openModal` calls.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Draggable Calendar Session Editor

- [x] Add a local drag offset for the anchored session editor.
- [x] Make the editor header draggable without blocking buttons/tabs/body editing.
- [x] Reset drag offset whenever a session editor is opened from a fresh anchor.
- [x] Clamp dragged position inside the viewport.
- [x] Verify TypeScript/build status and document the result.

## Review

- Added local-only drag offset state to `SessionModal`, so the user can move the open editor without persisting the last position.
- Made the session editor header the drag handle and kept the close button from starting a drag.
- Reset the drag offset whenever a new session/anchor opens, so reopening starts from the fixed calendar-derived position.
- Clamped dragged editor coordinates inside the viewport.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Drag To Reschedule Sessions

- [x] Confirm session update API supports `start`/`end` changes.
- [x] Add shared reschedule helper that patches the session and refreshes calendar/session caches.
- [x] Add monthly session drag/drop that changes only the date and preserves the displayed time.
- [x] Add weekly and daily session drag/drop that preserves duration and changes the start time by drop position.
- [x] Prevent normal click/editor opening after an actual drag.
- [x] Verify TypeScript/lint/build status and document the result.

## Review

- Confirmed `PATCH /api/sessions/[id]` already accepts validated `start`/`end` updates.
- Added `components/calendar/sessionReschedule.ts` for the shared PATCH/cache-refresh path.
- Monthly view now lets instructors drag a session chip onto another date, preserving the original start time and duration.
- Weekly and daily views now let instructors drag session blocks onto a new time slot, preserving duration and recalculating `end`.
- Drag gestures over the threshold suppress the normal click-to-open editor behavior.
- Parent/read-only users do not get reschedule drag behavior.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Interactive Session Drag Preview

- [x] Keep the existing dotted drop-position tracking UI.
- [x] Add a floating session preview that follows the cursor during reschedule drag.
- [x] Dim the original in-place session while dragging so it no longer looks static.
- [x] Apply the preview to monthly chips and weekly/daily blocks.
- [x] Verify TypeScript/lint/build status and document the result.

## Review

- Added `SessionDragPreview` to render a fixed-position copy of the dragged session under the cursor.
- Kept the existing dotted ghost as the snapped drop-position indicator.
- Weekly and daily session blocks now dim in their original slot while the floating block follows the cursor.
- Monthly session chips now dim in their original date while the floating chip follows the cursor.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Monthly Drag Drop Alignment Fix

- [x] Replace UTC-derived month cell keys with local date keys.
- [x] Add monthly dotted drop-position preview.
- [x] Use the same local date key for preview and final drop update.
- [x] Verify TypeScript/lint/build status and document the result.

## Review

- Replaced monthly `toISOString().slice(0, 10)` date keys with local `YYYY-MM-DD` keys to avoid timezone-driven one-day drift.
- Added a dashed monthly drop preview inside the hovered date cell during session drag.
- Reused that same local date key for the final drop calculation, so visual preview and saved date now match.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Monthly Multi Select Copy Paste

- [x] Add monthly session selection state with shift-click multi-select on the same date.
- [x] Show selected session UI affordance and a copy toolbar.
- [x] Copy selected sessions into a paste buffer.
- [x] Paste copied sessions onto another date preserving time, place, student, notes, focus, understanding, and homework.
- [x] Refresh local store and React Query caches after paste.
- [x] Verify TypeScript/lint/build status and document the result.

## Review

- Monthly session click now selects the clicked session while still opening the session editor.
- Shift-click toggles additional selected sessions when they are on the same date; shift-clicking a different date starts a new selection.
- Selected sessions get a visible ring/brightness treatment.
- A monthly toolbar appears for selection/copy/paste status, with a copy button once 2+ sessions are selected.
- Pasting onto a date creates new sessions with copied student, time, duration, place, notes, understanding, focus, and homework.
- Store and React Query session/calendar caches are refreshed after paste.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Keyboard Copy Paste For Monthly Sessions

- [x] Replace the monthly copy button with Cmd/Ctrl+C shortcut handling.
- [x] Add Cmd/Ctrl+V paste handling using the hovered date cell.
- [x] Keep selection/paste status visible without requiring toolbar copy interaction.
- [x] Prevent accidental click paste while copy buffer is active.
- [x] Verify TypeScript/lint/build status and document the result.

## Review

- Removed the monthly copy toolbar button.
- Added Cmd/Ctrl+C to copy the current 2+ same-date monthly selection.
- Added Cmd/Ctrl+V to paste copied sessions onto the currently hovered monthly date cell.
- Preserved status/cancel UI so users can see selection and paste mode.
- Disabled click-to-paste while the copy buffer is active to avoid accidental paste.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## Monthly Keyboard Buffer Delete Status

- [x] Keep the copy buffer after paste until Esc clears it.
- [x] Add Cmd/Ctrl+Backspace to delete selected monthly sessions.
- [x] Move selection/copy status from the calendar top to the sidebar bottom area.
- [x] Keep Esc as the single clear action for selection/copy state.
- [x] Verify TypeScript/lint/build status and document the result.

## Review

- Copy buffer now persists after paste so the same copied sessions can be pasted repeatedly.
- Esc clears the selection, copy buffer, and hovered paste date.
- Cmd/Ctrl+Backspace deletes all currently selected monthly sessions, updates the store, and refreshes session/calendar caches.
- Selection/copy status moved from the calendar top to a fixed panel in the lower-left sidebar area, so calendar height no longer changes.
- The status panel shows copy/paste/delete shortcuts and a cancel button.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with only existing `<img>` warnings.
- `npm run build` passes.

## FIX.md Calendar Session Optimization 1-9

- [x] 1. Establish calendar state architecture so React Query remains server source and Zustand carries pending/local session overlays.
- [x] 2. Add minimal optimistic update and pending buffer support for session create/update/delete.
- [x] 3. Replace broad calendar invalidation in core calendar actions with direct cache patching.
- [x] 4. Add batch update/delete API support and wire multi-select move/delete actions to one request.
- [x] 5. Add batch create support with client temp ids/idempotency handling and wire paste/create paths where practical.
- [x] 6. Make session modal open cache-first from calendar data, then refresh detail in the background.
- [x] 7. Split calendar list payload from session detail payload and preserve modal detail fetches.
- [x] 8. Add/check DB version/index support for session stale-response safety and calendar overlap queries.
- [x] 9. Optimize drag preview movement to avoid React state updates on every mousemove.
- [x] Verify typecheck, lint, tests/build where feasible, and document review results.

## Review

- Added `LessonSession.version`, `SessionBatchCreateRequest`, and migration `20260605090000_session_batch_optimizations`; applied it to the current Neon database with `prisma migrate deploy`.
- Added `/api/sessions/batch` with batch create/update/delete, per-session result rows, update version increments, and idempotent batch create responses.
- Added pending session overlays in Zustand so server refetches merge with pending updates/creates/deletes instead of overwriting them.
- Added shared session cache patch helpers for `queryKeys.sessions` and all `calendarSessions` range queries, then replaced core calendar paste/delete/move broad invalidations with direct cache patching.
- Week, day, and month paste now create temp negative-id sessions immediately, then replace them with server ids from batch create.
- Week, day, and month group drag now save through one batch PATCH request; multi-delete now saves through one batch DELETE request.
- Session modal now opens immediately from cached calendar/store data and refreshes detail in the background.
- Calendar session list payload no longer includes homework rows, while `/api/sessions/:id` remains the detail source for modal data.
- Added sidebar save-state messaging and a `beforeunload` warning when pending session changes exist.
- Drag preview movement now uses a mounted preview layer plus `requestAnimationFrame` DOM transforms; React state no longer changes for every cursor coordinate, and drop preview state updates only when the snapped target changes.
- Verified `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`, `npx prisma validate`, and `npx prisma migrate status`.
- `npm run lint` still reports only the existing seven `<img>` warnings.

## Deferred Calendar Session Flush

- [x] Change calendar copy/drag/delete mutations to update UI/cache/pending only, without immediate server requests.
- [x] Add one shared flush function that sends pending creates, updates, and deletes through the batch API.
- [x] Flush pending session changes before sidebar navigation to records/dashboard/students/reports/settings.
- [x] Keep beforeunload warning for pending changes that have not been flushed.
- [x] Verify typecheck/tests/lint and document the result.

## Review

- Calendar paste, group drag, and multi-delete now update only local UI, React Query cache, and Zustand pending state at action time.
- Added `flushPendingSessionChanges(queryClient)` to send pending creates, updates, and deletes through `/api/sessions/batch` only when requested.
- Sidebar navigation now intercepts normal left-click route changes, flushes pending session changes first, and only navigates after a successful save.
- Logout also flushes pending session changes before signing out.
- Pending sidebar copy now says "저장되지 않은 변경사항" instead of implying an active server save.
- Browser refresh/tab close still shows the existing `beforeunload` warning while pending changes remain.
- Verified `npx tsc --noEmit`, `npm test`, `npm run lint`, and `npm run build`.
- `npm run lint` still reports only the existing seven `<img>` warnings.

## Unified Month Picker UI

- [x] Extract the custom student month picker pattern into a shared month picker component.
- [x] Replace records month range native inputs with the shared picker.
- [x] Replace reports month range native inputs with the shared picker.
- [x] Keep range min/max behavior for start/end month selection.
- [x] Verify typecheck/lint/build and document the result.

## Review

- Added shared `components/ui/MonthPicker.tsx` with the same button/popover/month-grid interaction style as the existing session/student date controls.
- Replaced `type="month"` native controls in records and reports with `MonthPicker`.
- Reworked `StartMonthPicker` to wrap the shared `MonthPicker`, so student start-month selection uses the same implementation too.
- Preserved start/end min/max constraints for records and reports month ranges.
- Confirmed there are no remaining app `type="month"` inputs.
- Verified `npx tsc --noEmit`, `npm test`, `npm run lint`, and `npm run build`.
- The first `npm run build` hit a transient Next page-data collection `PageNotFoundError`; rerunning `npm run build` passed.
- `npm run lint` still reports only the existing seven `<img>` warnings.

## Records Month Range Filter

- [x] Inspect report month filter pattern and current record list rendering.
- [x] Add default current-month range filters below the record search input.
- [x] Filter records by month range before text search and sorting.
- [x] Change record time badge to `MM/DD hh:mm ~ hh:mm`.
- [x] Verify typecheck/lint/build and document the result.

## Review

- Record list now defaults its range filter to the current month.
- Added `시작` and `종료` month inputs directly below the record search input, matching the report page's month-range behavior.
- Record filtering now applies month range first, then sorts, then applies text search, reducing the rendered list from all sessions to the selected period.
- Record time badges now display `MM/DD hh:mm ~ hh:mm`.
- Added an empty-state message when no sessions match the selected period/search.
- Verified `npx tsc --noEmit`, `npm test`, `npm run lint`, and `npm run build`.
- `npm run lint` still reports only the existing seven `<img>` warnings.

## Pending Flush Timing Expansion

- [x] Add 2 second debounce flush after drag end.
- [x] Add 2 second debounce flush after copy/paste/create/delete style calendar mutations.
- [x] Flush immediately from modal save.
- [x] Keep immediate flush before sidebar navigation and logout.
- [x] Keep `beforeunload` as warning-only.
- [x] Verify typecheck/tests/lint/build and document the result.

## Review

- Added `schedulePendingSessionFlush(queryClient, 2000)` and timer cancellation around explicit flushes.
- Calendar paste/create, group drag update, and multi-delete now keep optimistic UI but schedule a debounced batch flush 2 seconds after the last change.
- Explicit `flushPendingSessionChanges` cancels any scheduled debounce first, so sidebar navigation/logout/modal save do not race with a pending timer.
- Session modal field edits now update local/cache/pending state only; the "저장 완료" button flushes immediately and closes only on success.
- Sidebar navigation and logout still flush immediately before leaving.
- `beforeunload` remains warning-only.
- Verified `npx tsc --noEmit`, `npm test`, `npm run lint`, and `npm run build`.
- `npm run lint` still reports only the existing seven `<img>` warnings.
