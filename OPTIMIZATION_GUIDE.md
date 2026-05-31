# Agent Harness: Optimization and Fix Workflow

## Mission

Improve the project through safe, minimal, verified optimization. Prioritize correctness, data invariants, performance-sensitive architecture, and maintainability. Do not make broad rewrites unless required.

## 1. Planning Mode

Enter planning mode for any non-trivial task, including:

- 3+ implementation steps
- architecture or data-flow decisions
- database/schema changes
- auth/permission behavior
- caching/state management changes
- test/lint/build infrastructure changes

Before implementation:

1. Identify the root problem.
2. Identify affected files.
3. Write the intended behavior.
4. Define verification steps.
5. Add a checklist to `tasks/todo.md`.

If something goes sideways, stop and re-plan before continuing.

## 2. Task Execution Strategy

Work in small, reviewable units.

Preferred order:

1. Make tests/lint/build runnable if broken.
2. Fix correctness and data invariant issues.
3. Fix server/client state ownership issues.
4. Optimize database queries and indexes.
5. Optimize render-time data structures.
6. Clean up components and documentation.

Avoid mixing unrelated fixes in one change.

## 3. State Ownership Rules

Use the correct state owner.

### Server state belongs to React Query

Examples:

- students
- sessions
- reports
- homework
- parent dashboard data
- calendar session rows

Do not copy React Query data into `useState` or Zustand unless there is a strong reason.

Use:

```ts
const { data: sessions = [] } = useQuery(...)
```

Avoid:

```ts
const { data } = useQuery(...)
const [sessions, setSessions] = useState([])

useEffect(() => {
  setSessions(data ?? [])
}, [data])
```

### UI state belongs to useState or Zustand

Examples:

- selected ID
- current calendar view
- current date
- modal open/closed state
- search text
- sort option
- drag state
- temporary form draft state

### Zustand rule

Zustand should manage global UI state, not duplicated server rows.

For calendar:

- Keep in Zustand: `currentView`, `currentDate`, `modalState`, `selectedSessionId`, `dragState`
- Keep in React Query: `sessions`

## 4. API Boundary Rules

APIs are trust boundaries. TypeScript types do not validate runtime JSON.

For every POST/PATCH route:

1. Parse input explicitly.
2. Validate required fields.
3. Validate dates and enums.
4. Validate numeric bounds.
5. Return 400 for client input errors.
6. Only call Prisma after validation passes.

For PATCH routes:

- Read existing values if the request is partial.
- Merge existing values with incoming values.
- Validate the final object before writing.

Example invariant:

```ts
end > start
```

This must be enforced at the write boundary, not left for calendar/report code to handle later.

## 5. Database and Concurrency Rules

Protect important invariants at the database write level.

For single-use resources such as invitations:

- Do not rely only on a pre-read check.
- Use conditional writes inside a transaction.
- Continue only if the conditional write affected exactly one row.

Example:

```ts
await tx.invitation.updateMany({
  where: {
    id,
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { gt: now },
  },
  data: {
    acceptedAt: now,
  },
})
```

If `count !== 1`, return conflict or expired response.

## 6. Performance Rules

### Avoid overfetching

Endpoints should return the view model needed by the screen, not the full database object graph.

Prefer:

- pagination
- date range filters
- `select`
- `count`
- `take`
- `orderBy`
- grouped queries
- active-first loading

Avoid fetching full historical data for common dashboard/list/calendar views.

### Add indexes for real query paths

When adding or changing common filters/sorts, check whether the database has matching indexes.

Common patterns:

- instructor + student list
- student + session start time
- calendar date ranges
- report updated time
- parent/student joins
- invitation lookup and status

### Avoid repeated render-time scans

Do not repeatedly run `filter`, `sort`, or `find` inside day/cell rendering loops.

Use `useMemo` to build lookup maps:

```ts
studentsById: Map<number, Student>
sessionsByDay: Map<string, Session[]>
```

Sort once when building the map, not once per rendered cell.

## 7. Testing and Verification

Never mark a task complete without proving it works.

Required verification, depending on the change:

- `npm test`
- `npm run lint`
- `npm run build`
- targeted API tests
- manual route checks
- Prisma migration check
- before/after behavior comparison
- logs or screenshots when useful

If the test harness is broken, fixing the harness is part of the task.

For optimization work, verify both:

1. Correctness did not regress.
2. The intended work reduction actually happened.

## 8. Subagent Strategy

Use subagents for focused, isolated work.

Good subagent tasks:

- inspect one route family
- inspect one component family
- compare old/new behavior
- search for repeated anti-patterns
- review Prisma schema/index needs
- review test failures
- review React Query/Zustand ownership

One subagent should have one clear objective.

Do not let subagents make broad unrelated changes.

## 9. Self-Improvement Loop

After any correction from the user:

1. Identify the mistake pattern.
2. Add a short lesson to `tasks/lessons.md`.
3. Add a prevention rule if needed.
4. Review relevant lessons before continuing similar work.

Lessons should be concrete.

Bad:

```md
Be more careful.
```

Good:

```md
Do not copy React Query server data into Zustand. Zustand should only hold calendar UI state such as current view, date, modal state, and drag state.
```

## 10. Documentation During Work

Maintain `tasks/todo.md`.

Each task should include:

```md
## Task: <name>

### Problem
...

### Plan
- [ ] ...
- [ ] ...
- [ ] ...

### Verification
- [ ] npm test
- [ ] npm run lint
- [ ] npm run build
- [ ] manual behavior check

### Result
...
```

At the end of each task, add a short review section:

- what changed
- why it is safe
- how it was verified
- any remaining risk

## 11. Elegance Check

For non-trivial changes, pause before finalizing and ask:

- Is this simpler than the previous structure?
- Did I reduce duplicated state or duplicated logic?
- Did I preserve existing behavior?
- Did I enforce invariants at the correct boundary?
- Would a staff engineer approve this?

If the solution feels hacky, rework it.

Do not over-engineer simple fixes.

## 12. Core Principles

- Fix root causes, not symptoms.
- Prefer small, reversible changes.
- Keep server state and UI state separate.
- Enforce data invariants at write boundaries.
- Push heavy filtering/aggregation toward the database when appropriate.
- Avoid duplicated sources of truth.
- Avoid repeated linear scans in render paths.
- Make tests, lint, and build runnable before trusting refactors.
- Change only what is necessary.
- Verify before declaring done.