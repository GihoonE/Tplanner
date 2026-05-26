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
