# Optimization Audit Suggestions

This document expands the optimization audit with more concrete engineering context. Each item explains the problem, where it appears, why it matters from a CS architecture/performance perspective, and how involved the fix is.

이 문서는 최적화 감사 결과를 더 구체적인 엔지니어링 관점으로 확장한 것입니다. 각 항목은 문제, 위치, CS 아키텍처/성능 관점에서 중요한 이유, 그리고 어떤 방식으로 고칠 수 있는지를 포함합니다.

## P0 / Highest Leverage

### 1. Full-history reads on common endpoints

**What / Problem**

Several high-traffic endpoints fetch all historical rows and nested relation data, then calculate summaries in application memory. For example, `/api/sessions` returns every session with homework; `/api/students` loads every session for every student just to compute latest session and monthly count; the parent dashboard loads all sessions and homework before slicing recent items. This is an overfetching problem: the API shape is coupled to the full database object graph instead of the exact view model needed by each screen.

**무엇 / 문제**

트래픽이 자주 발생하는 여러 엔드포인트가 전체 이력 row와 중첩 관계 데이터를 모두 가져온 뒤, 애플리케이션 메모리에서 요약 값을 계산합니다. 예를 들어 `/api/sessions`는 모든 수업과 숙제를 반환하고, `/api/students`는 최근 수업과 이번 달 수업 수만 필요해도 학생별 모든 수업을 가져옵니다. 학부모 대시보드도 최근 항목만 보여주기 전에 모든 수업과 숙제를 읽습니다. 즉, API가 화면에 필요한 view model이 아니라 DB object graph 전체에 묶여 있는 overfetching 문제입니다.

**Where / 위치**

`app/api/sessions/route.ts`, `app/api/students/route.ts`, `app/api/parent/students/route.ts`, `hooks/useAppQueries.ts`

**Why it matters / CS architecture and performance**

This changes request complexity from roughly `O(visible data)` to `O(lifetime history)`. At small scale, fetching 100 sessions is fine. At 10x usage, one dashboard load may deserialize thousands of sessions and homework items, allocate many JS objects, sort/filter arrays in Node, and transfer a large JSON payload to the browser. This wastes DB I/O, server CPU, server memory, network bandwidth, browser parse time, and React render time. Architecturally, it also makes clients depend on broad data contracts, so optimizing one screen later becomes harder without breaking another.

**중요한 이유 / CS 아키텍처와 성능**

요청 복잡도가 `O(화면에 보이는 데이터)`가 아니라 `O(전체 누적 이력)`이 됩니다. 작은 규모에서는 수업 100개를 가져와도 괜찮지만, 사용량이 10배가 되면 대시보드 한 번 로딩에 수천 개의 수업/숙제 row를 역직렬화하고, Node에서 많은 JS 객체를 만들고, 배열을 정렬/필터링하고, 큰 JSON을 브라우저로 전송하게 됩니다. DB I/O, 서버 CPU, 서버 메모리, 네트워크 대역폭, 브라우저 JSON parse 시간, React 렌더 비용이 모두 낭비됩니다. 아키텍처적으로도 클라이언트가 넓은 데이터 계약에 의존하게 되어 나중에 한 화면만 최적화하기 어려워집니다.

**Effort / How**

Medium. Add narrower endpoints or query parameters by use case: dashboard summary, calendar date range, paginated records, and parent summary. Push aggregation into the database with `count`, `take`, `orderBy`, date filters, and grouped queries where possible. Keep the old broad endpoint temporarily if needed, then migrate screens one by one.

**작업량 / 고치는 방법**

중간. 사용 사례별로 더 좁은 엔드포인트나 쿼리 파라미터를 추가합니다: 대시보드 요약, 캘린더 날짜 범위, 페이지네이션된 기록, 학부모 요약 등. 가능한 계산은 DB의 `count`, `take`, `orderBy`, 날짜 필터, group query로 밀어 넣습니다. 필요하면 기존 넓은 엔드포인트를 잠시 유지하고 화면별로 점진적으로 이전합니다.

**Additional optimization: active-first loading**

Because students already have `active` and `inactive` status, the default student list can load only active students. Inactive students can be shown through a toggle, "load history" button, or separate history view. This only improves performance if the filtering happens at the API/database level, not only in the browser. Frontend-only filtering still pays the cost of DB reads, server serialization, network transfer, JSON parsing, and cache storage for inactive rows.

**추가 최적화: active 우선 로딩**

학생은 이미 `active`, `inactive` 상태로 구분되므로, 기본 학생 목록은 active 학생만 로딩하도록 만들 수 있습니다. inactive 학생은 토글, "이전 학생 불러오기" 버튼, 별도 history 화면에서 선택적으로 가져오면 됩니다. 단, 이 최적화는 브라우저에서만 filter하면 효과가 거의 없고 API/DB query 단계에서 filter해야 의미가 있습니다. 프론트엔드에서만 filter하면 inactive row에 대한 DB 조회, 서버 직렬화, 네트워크 전송, JSON parsing, cache 저장 비용을 이미 모두 지불한 뒤이기 때문입니다.

**Architecture / performance reasoning**

This is a working-set reduction. Active students are the hot data path: they are needed on most visits. Inactive students are colder historical data: useful, but not needed by default. Separating hot and cold data reduces DB result size, response payload size, browser parse cost, React render work, and memory retained in client caches. It also makes future pagination easier because the default list has a smaller and more predictable cardinality.

**아키텍처 / 성능 관점**

이 방식은 working set을 줄이는 최적화입니다. active 학생은 대부분의 방문에서 필요한 hot data이고, inactive 학생은 유용하지만 기본 화면에는 필요하지 않은 cold historical data입니다. hot data와 cold data를 분리하면 DB 결과 크기, 응답 payload 크기, 브라우저 parsing 비용, React render 작업량, 클라이언트 cache 메모리를 줄일 수 있습니다. 기본 목록의 cardinality가 작고 예측 가능해지므로 이후 pagination 도입도 쉬워집니다.

**Implementation detail**

Add a query option such as `GET /api/students?status=active` by default, `GET /api/students?status=inactive` for history, or `GET /api/students?includeInactive=true` when the UI explicitly asks for all students. Add a composite index like `Student(instructorId, status, id)` so the database can efficiently find active students for one instructor. For parent access patterns, consider a matching status-aware query path as well.

**구현 방식**

기본 조회는 `GET /api/students?status=active`처럼 active만 가져오고, history는 `GET /api/students?status=inactive` 또는 전체 보기가 필요한 경우 `GET /api/students?includeInactive=true` 같은 명시적 옵션으로 분리합니다. DB가 특정 강사의 active 학생을 효율적으로 찾을 수 있도록 `Student(instructorId, status, id)` 같은 복합 인덱스를 추가하는 것이 좋습니다. 학부모 접근 경로도 필요하면 status-aware query path를 같이 고려합니다.

### 2. Missing database indexes for production query paths

**What / Problem**

The schema relies mostly on primary keys and unique constraints. However, the app frequently filters and sorts by foreign keys and range columns such as `instructorId`, `parentId`, `studentId`, `start`, `end`, `updatedAt`, and invitation metadata. PostgreSQL does not automatically index foreign key columns, so many queries may require sequential scans or expensive sort operations as tables grow.

**무엇 / 문제**

현재 스키마는 대부분 primary key와 unique 제약에만 의존합니다. 하지만 앱은 `instructorId`, `parentId`, `studentId`, `start`, `end`, `updatedAt`, 초대 관련 필드 같은 외래 키와 범위 컬럼으로 자주 필터/정렬합니다. PostgreSQL은 외래 키 컬럼을 자동으로 인덱싱하지 않으므로, 테이블이 커질수록 sequential scan이나 비싼 sort가 발생할 수 있습니다.

**Where / 위치**

`prisma/schema.prisma`

**Why it matters / CS architecture and performance**

Indexes are the main data structure that let the database avoid scanning every row. Without an index, a query like "all sessions for this student's month ordered by start" can degrade toward `O(n)` table scanning plus sorting. With a useful composite index, the DB can jump to the relevant key range and read rows in order, closer to `O(log n + k)` where `k` is the result size. Missing indexes often do not show up in local development because datasets are tiny; they appear later as p95 latency spikes and higher DB CPU.

**중요한 이유 / CS 아키텍처와 성능**

인덱스는 DB가 모든 row를 스캔하지 않게 해주는 핵심 자료구조입니다. 인덱스가 없으면 "특정 학생의 이번 달 수업을 start 순으로 조회" 같은 쿼리가 `O(n)` 테이블 스캔과 정렬에 가까워질 수 있습니다. 적절한 복합 인덱스가 있으면 DB는 필요한 key range로 바로 이동하고 정렬된 순서로 읽을 수 있어 `O(log n + k)`에 가까워집니다. 로컬 개발 데이터가 작을 때는 문제가 안 보이다가, 운영에서 p95 latency와 DB CPU 상승으로 나타납니다.

**Effort / How**

Small / Medium. Add Prisma `@@index` entries and run a migration. Start with access and range patterns: `Student(instructorId, id)`, `LessonSession(studentId, start)`, `LessonSession(start)`, `LessonSession(end)`, `HomeworkItem(sessionId)`, `Report(studentId, updatedAt, id)`, `StudentParent(parentId, studentId)`, `StudentInvitation(studentId, instructorId, createdAt)`. Verify with query plans or at least benchmark before/after on realistic seed data.

**작업량 / 고치는 방법**

작음 / 중간. Prisma에 `@@index`를 추가하고 migration을 실행합니다. 먼저 실제 접근/범위 패턴부터 처리합니다: `Student(instructorId, id)`, `LessonSession(studentId, start)`, `LessonSession(start)`, `LessonSession(end)`, `HomeworkItem(sessionId)`, `Report(studentId, updatedAt, id)`, `StudentParent(parentId, studentId)`, `StudentInvitation(studentId, instructorId, createdAt)`. 가능하면 query plan으로 확인하고, 최소한 현실적인 seed data로 전후 벤치마크를 합니다.

### 3. Tests are not runnable as a reliable safety net

**What / Problem**

The project has Vitest tests, but no `npm test` script or Vitest config. `npx vitest run` fails before collecting tests because the `@/*` alias is not configured for Vitest. The existing API tests also call auth-protected routes, so after alias resolution they likely need auth/permission mocks to reflect current route behavior.

**무엇 / 문제**

프로젝트에 Vitest 테스트 파일은 있지만 `npm test` 스크립트와 Vitest 설정이 없습니다. `@/*` alias가 Vitest에 설정되어 있지 않아 `npx vitest run`은 테스트 수집 전에 실패합니다. 기존 API 테스트는 auth로 보호된 라우트를 직접 호출하므로, alias 문제가 해결된 뒤에도 현재 라우트 동작에 맞게 auth/permission mock이 필요할 가능성이 높습니다.

**Where / 위치**

`package.json`, `__tests__/api/sessions-[id].test.ts`

**Why it matters / CS architecture and performance**

Optimization work often changes data contracts, caching, validation, and query boundaries. These changes are easy to get subtly wrong: a faster endpoint can accidentally omit authorization, break date conversion, or return a shape the UI does not expect. Automated tests are not just correctness checks; they are an architectural feedback loop that lets you refactor performance-sensitive code without freezing development.

**중요한 이유 / CS 아키텍처와 성능**

최적화 작업은 데이터 계약, 캐싱, 검증, 쿼리 경계를 바꾸는 경우가 많습니다. 이런 변경은 미묘하게 틀리기 쉽습니다. 더 빠른 엔드포인트가 실수로 권한 검사를 빠뜨리거나, 날짜 변환을 깨거나, UI가 기대하지 않는 응답 형태를 반환할 수 있습니다. 자동화 테스트는 단순한 정답 확인이 아니라, 성능에 민감한 코드를 안전하게 리팩터링하게 해주는 아키텍처 피드백 루프입니다.

**Effort / How**

Small / Medium. Add `vitest.config.ts` with `vite-tsconfig-paths` or explicit alias config. Add `npm test`. Decide whether route tests should mock `auth()`/permission helpers or test lower-level service functions. Then update the current session tests so they verify the auth-aware behavior instead of stale assumptions.

**작업량 / 고치는 방법**

작음 / 중간. `vite-tsconfig-paths`나 명시적 alias 설정을 포함한 `vitest.config.ts`를 추가합니다. `npm test` 스크립트를 추가합니다. 라우트 테스트에서 `auth()`/permission helper를 mock할지, 아니면 더 낮은 service 함수 단위를 테스트할지 결정합니다. 이후 현재 session 테스트가 오래된 가정이 아니라 auth-aware 동작을 검증하도록 수정합니다.

### 4. Invitation acceptance race condition

**What / Problem**

The invitation accept route reads the invitation, checks whether it is accepted/revoked/expired, then starts a transaction and updates the invitation by `id`. The write does not repeat the validity conditions. This creates a time-of-check-to-time-of-use race: two requests can both observe a valid invitation before either writes `acceptedAt`.

**무엇 / 문제**

초대 수락 라우트는 초대를 읽고 accepted/revoked/expired 상태를 확인한 뒤 트랜잭션을 시작해서 `id` 기준으로 초대를 업데이트합니다. 하지만 실제 write에는 유효성 조건이 다시 포함되지 않습니다. 즉, 두 요청이 모두 `acceptedAt`이 쓰이기 전에 유효한 초대라고 관찰할 수 있는 time-of-check-to-time-of-use race가 있습니다.

**Where / 위치**

`app/api/invitations/accept/route.ts`

**Why it matters / CS architecture and performance**

This is a concurrency correctness issue. In distributed systems and web servers, multiple requests can execute interleaved even if each individual function looks sequential. Pre-checks outside the final write are not sufficient for single-use resources. The invariant "an invitation is accepted once" should be enforced atomically by the database write, not only by application control flow.

**중요한 이유 / CS 아키텍처와 성능**

이 문제는 동시성 정확성 문제입니다. 분산 시스템과 웹 서버에서는 각 함수가 순차적으로 보이더라도 여러 요청이 interleaving되어 실행될 수 있습니다. 최종 write 밖에서 수행한 사전 검사는 1회용 리소스를 보장하기에 충분하지 않습니다. "초대는 한 번만 수락된다"는 invariant는 애플리케이션 제어 흐름만이 아니라 DB write에서 원자적으로 보장되어야 합니다.

**Effort / How**

Medium. Inside the transaction, do a conditional `updateMany` with `id`, `acceptedAt: null`, `revokedAt: null`, and `expiresAt > now`. Continue only if `count === 1`; otherwise return conflict/expired. Then create or upsert the parent link. Add a test for two concurrent accepts if the test harness is updated.

**작업량 / 고치는 방법**

중간. 트랜잭션 내부에서 `id`, `acceptedAt: null`, `revokedAt: null`, `expiresAt > now` 조건을 포함한 `updateMany`를 수행합니다. `count === 1`일 때만 계속 진행하고, 아니면 conflict/expired 응답을 반환합니다. 그 다음 parent link를 생성하거나 upsert합니다. 테스트 환경이 정리되면 동시 수락 테스트도 추가합니다.

## P1 / Important

### 5. React Query data is copied into local state

**What / Problem**

Several pages fetch data with React Query, then copy the result into component `useState`. Later, mutations update both the local state and the React Query cache manually. This creates two sources of truth for the same server data.

**무엇 / 문제**

여러 페이지가 React Query로 데이터를 가져온 뒤 그 결과를 component `useState`에 복사합니다. 이후 mutation은 local state와 React Query cache를 둘 다 수동으로 갱신합니다. 같은 서버 데이터에 대해 진실 공급원이 두 개 생기는 구조입니다.

**Where / 위치**

`components/records/RecordsWorkspace.tsx`, `app/dashboard/page.tsx`, `app/students/page.tsx`, `app/reports/page.tsx`

**Why it matters / CS architecture and performance**

Duplicated state breaks the single-source-of-truth principle. It increases render work because data changes pass through query state, effect synchronization, local state updates, and cache updates. It also increases the chance of cache incoherence: one screen may show local state while another screen reads query cache. Architecturally, this makes data flow harder to reason about and makes future pagination or optimistic updates more complex.

**중요한 이유 / CS 아키텍처와 성능**

중복 state는 single source of truth 원칙을 깨뜨립니다. 데이터 변경이 query state, effect 동기화, local state update, cache update를 거치기 때문에 렌더 작업이 늘어납니다. 또한 cache incoherence 위험이 커집니다. 한 화면은 local state를 보고, 다른 화면은 query cache를 볼 수 있습니다. 아키텍처적으로 데이터 흐름을 이해하기 어려워지고, 나중에 pagination이나 optimistic update를 도입하기도 복잡해집니다.

**Effort / How**

Medium. Use `query.data ?? []` directly for read-only lists and derived values. Keep local state only for UI concerns like selected ID, search, modal open state, and draft form state. After mutations, update or invalidate the relevant React Query keys. Migrate page by page to reduce risk.

**작업량 / 고치는 방법**

중간. read-only 목록과 파생 값은 `query.data ?? []`를 직접 사용합니다. local state에는 selected ID, search, modal open state, draft form state 같은 UI 상태만 둡니다. mutation 후에는 관련 React Query key를 update하거나 invalidate합니다. 위험을 줄이기 위해 페이지별로 점진적으로 이전합니다.

### 6. Calendar data is split between React Query and Zustand

**What / Problem**

Calendar sessions are fetched with React Query and then copied into a global Zustand store. Calendar views consume the Zustand sessions, while fetching/caching responsibility lives in React Query. This mixes server-state management and UI-state management in one flow.

**무엇 / 문제**

캘린더 수업 데이터는 React Query로 가져온 뒤 전역 Zustand store에 복사됩니다. Calendar view는 Zustand의 sessions를 사용하지만, fetch/cache 책임은 React Query에 있습니다. 서버 상태 관리와 UI 상태 관리가 한 흐름에 섞여 있는 구조입니다.

**Where / 위치**

`app/calendar/page.tsx`, `store/index.ts`

**Why it matters / CS architecture and performance**

Server state and client UI state have different lifecycles. Server state needs caching, invalidation, stale time, retries, and background refresh. UI state needs local consistency and quick synchronous updates. Mixing them means every range fetch becomes a global store write, which can trigger all subscribers and bypass some of React Query's cache advantages. It also makes ownership unclear: should a session update happen in the store, the query cache, or both?

**중요한 이유 / CS 아키텍처와 성능**

서버 상태와 클라이언트 UI 상태는 lifecycle이 다릅니다. 서버 상태에는 caching, invalidation, stale time, retry, background refresh가 필요하고, UI 상태에는 로컬 일관성과 빠른 동기 update가 필요합니다. 둘을 섞으면 날짜 범위 조회마다 전역 store write가 발생하고, 모든 subscriber가 리렌더될 수 있으며, React Query cache의 장점 일부를 우회하게 됩니다. 또한 session update를 store에 해야 하는지, query cache에 해야 하는지, 둘 다 해야 하는지 소유권이 불명확해집니다.

**Effort / How**

Medium / Large. Keep Zustand for calendar UI state: current view, current date, modal state, drag state. Keep session rows in React Query. Pass session data to `WeekView`, `MonthView`, and `DayView` as props, or create a calendar data context scoped to the calendar page. Remove duplicated store writes once views no longer depend on global session data.

**작업량 / 고치는 방법**

중간 / 큼. Zustand는 calendar UI 상태인 current view, current date, modal state, drag state에 집중시킵니다. session row는 React Query에 둡니다. `WeekView`, `MonthView`, `DayView`에 props로 session data를 넘기거나 calendar page 범위의 data context를 만듭니다. view가 더 이상 전역 session data에 의존하지 않으면 중복 store write를 제거합니다.

### 7. Calendar views repeat expensive render-time work

**What / Problem**

Week and month views repeatedly scan the full `sessions` array for each day or cell, then sort the filtered result and look up students with `students.find`. This repeats the same work many times during a render.

**무엇 / 문제**

주간/월간 view가 각 날짜나 셀마다 전체 `sessions` 배열을 다시 scan하고, 필터 결과를 sort한 뒤 `students.find`로 학생을 찾습니다. 한 번의 렌더 중 같은 종류의 작업이 여러 번 반복됩니다.

**Where / 위치**

`components/calendar/WeekView.tsx`, `components/calendar/MonthView.tsx`, `components/records/RecordList.tsx`

**Why it matters / CS architecture and performance**

This is an algorithmic complexity issue. If a week view renders many day columns and each column scans all sessions, complexity approaches `O(d * s)`. If each session also does a linear student lookup, it adds another factor. Pre-indexing data changes repeated linear scans into map lookups. This is the same idea as building an index in a database, but at the UI data-structure level.

**중요한 이유 / CS 아키텍처와 성능**

이 문제는 알고리즘 복잡도 문제입니다. 주간 view가 많은 day column을 렌더하고 각 column이 모든 session을 scan하면 복잡도는 `O(d * s)`에 가까워집니다. 각 session마다 linear student lookup을 하면 추가 비용도 생깁니다. 데이터를 미리 indexing하면 반복적인 linear scan을 map lookup으로 바꿀 수 있습니다. DB 인덱스와 같은 아이디어를 UI 자료구조 수준에 적용하는 것입니다.

**Effort / How**

Medium. Use `useMemo` to build `studentsById: Map<number, Student>` and `sessionsByDay: Map<string, Session[]>`. Sort once when building the map, not per rendered cell. Then each day render does a direct map lookup.

**작업량 / 고치는 방법**

중간. `useMemo`로 `studentsById: Map<number, Student>`와 `sessionsByDay: Map<string, Session[]>`를 만듭니다. 정렬은 각 셀에서 하지 말고 map을 만들 때 한 번만 합니다. 이후 각 날짜 렌더는 map lookup만 수행합니다.

### 8. Session PATCH can accept invalid dates

**What / Problem**

`POST /api/sessions` validates date strings and checks that `end > start`, but `PATCH /api/sessions/[id]` directly forwards `start` and `end` into Prisma. It does not validate whether the values are valid dates or whether the final interval is logically valid.

**무엇 / 문제**

`POST /api/sessions`는 날짜 문자열을 검증하고 `end > start`를 확인하지만, `PATCH /api/sessions/[id]`는 `start`, `end`를 바로 Prisma에 전달합니다. 값이 유효한 날짜인지, 최종 시간 구간이 논리적으로 올바른지 검증하지 않습니다.

**Where / 위치**

`app/api/sessions/[id]/route.ts`

**Why it matters / CS architecture and performance**

This is a data invariant problem. Calendar and report logic assume sessions have valid time intervals. If invalid intervals enter the database, downstream code must either defend everywhere or risk incorrect sorting, overlap detection, duration calculation, and display. In architecture terms, invariants should be enforced at write boundaries so read paths can stay simpler and faster.

**중요한 이유 / CS 아키텍처와 성능**

이 문제는 데이터 invariant 문제입니다. 캘린더와 리포트 로직은 수업 시간이 유효한 interval이라고 가정합니다. 잘못된 interval이 DB에 들어가면 이후 코드 전체가 방어 로직을 가져야 하거나, 정렬/겹침 감지/시간 계산/표시가 틀릴 수 있습니다. 아키텍처적으로 invariant는 write boundary에서 보장해야 read path가 단순하고 빠르게 유지됩니다.

**Effort / How**

Small. Reuse the POST parsing logic. For PATCH, read the existing `start` and `end`, merge any incoming partial values, then validate the final pair. Return 400 for invalid dates or reversed intervals.

**작업량 / 고치는 방법**

작음. POST의 parsing 로직을 재사용합니다. PATCH에서는 기존 `start`, `end`를 읽고 들어온 일부 값과 병합한 뒤 최종 pair를 검증합니다. 유효하지 않은 날짜나 역전된 interval에는 400을 반환합니다.

### 9. Student create/update accepts loose JSON

**What / Problem**

Student create and update handlers destructure arbitrary JSON and pass values into Prisma with limited validation. Required strings may be missing or empty. Numeric fields can become `NaN`. `startDate` can have an unexpected format. Some invalid inputs can become generic 500 errors instead of client-facing 400 errors.

**무엇 / 문제**

학생 생성/수정 handler가 임의의 JSON을 destructure한 뒤 제한적인 검증만 수행하고 Prisma에 전달합니다. 필수 문자열이 없거나 비어 있을 수 있고, 숫자 필드는 `NaN`이 될 수 있으며, `startDate` 형식도 예상과 다를 수 있습니다. 일부 잘못된 입력은 클라이언트에 400으로 알려지지 않고 일반적인 500 에러가 될 수 있습니다.

**Where / 위치**

`app/api/students/route.ts`, `app/api/students/[id]/route.ts`

**Why it matters / CS architecture and performance**

APIs are trust boundaries. TypeScript types do not validate runtime JSON. If invalid data enters persistent storage, every downstream component must handle impossible states. That increases code complexity and makes performance optimizations harder because code cannot assume clean data. Good validation at the boundary narrows the state space of the entire application.

**중요한 이유 / CS 아키텍처와 성능**

API는 trust boundary입니다. TypeScript 타입은 runtime JSON을 검증하지 않습니다. 잘못된 데이터가 영구 저장소에 들어가면 이후 모든 component가 불가능한 상태를 처리해야 합니다. 이는 코드 복잡도를 높이고, 깨끗한 데이터를 가정할 수 없게 만들어 성능 최적화도 어렵게 합니다. boundary에서의 좋은 검증은 애플리케이션 전체의 상태 공간을 줄여줍니다.

**Effort / How**

Medium. Create shared student payload parsing helpers. Validate required strings, normalize status/color, parse bounded integers for `totalSessions` and `hwCompletionRate`, and validate `startDate` as `YYYY-MM`. Return structured 400 errors before Prisma calls.

**작업량 / 고치는 방법**

중간. 공용 student payload parser를 만듭니다. 필수 문자열, status/color 정규화, `totalSessions`와 `hwCompletionRate`의 bounded integer parsing, `startDate`의 `YYYY-MM` 형식을 검증합니다. Prisma 호출 전에 구조화된 400 에러를 반환합니다.

### 10. Protected API routes do redundant role lookups

**What / Problem**

Protected routes call `auth()`, which can refresh the JWT role from the database, and then permission helpers query the user role again. The DB-backed permission check is good for correctness, but the same role data is being loaded more than once per request.

**무엇 / 문제**

보호된 라우트는 `auth()`를 호출하고, 이 과정에서 JWT role을 DB에서 갱신할 수 있습니다. 이후 permission helper가 user role을 다시 조회합니다. DB 기반 권한 검증 자체는 정확성 측면에서 좋지만, 같은 role 데이터를 요청당 두 번 이상 읽는 구조입니다.

**Where / 위치**

`auth.ts`, `lib/auth/permissions.ts`, `lib/auth/roles.ts`

**Why it matters / CS architecture and performance**

This is fixed overhead on nearly every protected request. Even if each query is fast, fixed per-request overhead directly affects throughput and tail latency. Architecturally, authentication and authorization should have a clear data flow: identify the user, load current authorization state once, then reuse it for the request.

**중요한 이유 / CS 아키텍처와 성능**

이 비용은 거의 모든 보호된 요청에 붙는 고정 overhead입니다. 각 쿼리가 빠르더라도 요청당 고정 overhead는 처리량과 tail latency에 직접 영향을 줍니다. 아키텍처적으로 인증/인가 흐름은 명확해야 합니다: 사용자를 식별하고, 현재 권한 상태를 한 번 로드한 뒤, 요청 내에서 재사용하는 구조가 좋습니다.

**Effort / How**

Small. Choose one authoritative role load for server authorization. For example, keep `requireUser()` as the DB-backed source of truth and remove the per-request JWT callback DB refresh, or pass the loaded role through a shared request helper so it is not fetched twice.

**작업량 / 고치는 방법**

작음. 서버 권한 검증에서 authoritative role load를 하나로 정합니다. 예를 들어 `requireUser()`를 DB 기반 source of truth로 유지하고 JWT callback의 요청당 DB refresh를 제거하거나, 공용 request helper를 통해 이미 로드한 role을 재사용하게 합니다.

### 11. Large client components bundle too much logic and UI

**What / Problem**

Several client components are large route-level files that combine data loading, mutation logic, derived data structures, selection state, form state, and dense markup. This creates "god components" where many responsibilities change together.

**무엇 / 문제**

여러 client component가 route-level의 큰 파일로 존재하며, 데이터 로딩, mutation 로직, 파생 자료구조, 선택 상태, form 상태, 복잡한 markup을 모두 포함합니다. 여러 책임이 한꺼번에 바뀌는 "god component" 구조입니다.

**Where / 위치**

`app/reports/page.tsx`, `app/students/page.tsx`, `components/sessions/SessionModal.tsx`

**Why it matters / CS architecture and performance**

Large client islands reduce modularity and make React's render boundaries coarse. A state change in one part of the component can force reconciliation of much more UI than necessary. From a software architecture perspective, high coupling lowers maintainability: tests are harder to write, feature changes are harder to isolate, and bundle splitting is less effective because many imports become part of one client graph.

**중요한 이유 / CS 아키텍처와 성능**

큰 client island는 모듈성을 낮추고 React 렌더 경계를 거칠게 만듭니다. component 일부의 state 변경이 필요 이상으로 많은 UI reconciliation을 유발할 수 있습니다. 소프트웨어 아키텍처 관점에서는 coupling이 높아져 유지보수성이 낮아집니다. 테스트 작성이 어려워지고, 기능 변경을 격리하기 어려우며, 많은 import가 하나의 client graph에 묶여 bundle splitting 효과도 줄어듭니다.

**Effort / How**

Medium. Extract feature-level components and hooks: report student list, report editor, report session picker, student table, student detail panel, session detail tab, session record tab. Move pure derived-data helpers outside components. Do this incrementally without changing behavior.

**작업량 / 고치는 방법**

중간. feature 단위 component와 hook으로 분리합니다: report student list, report editor, report session picker, student table, student detail panel, session detail tab, session record tab 등. 순수 파생 데이터 helper는 component 밖으로 이동합니다. 동작을 바꾸지 않는 방식으로 점진적으로 진행합니다.

## P2 / Cleanup And Developer Experience

### 12. Lint script is not CI-safe

**What / Problem**

`npm run lint` invokes `next lint`, which opens an interactive ESLint setup prompt and exits non-zero in the current project. This means linting is not an automated check right now.

**무엇 / 문제**

`npm run lint`가 `next lint`를 실행하면서 현재 프로젝트에서는 ESLint 설정 prompt를 띄우고 non-zero로 종료됩니다. 즉 현재 lint는 자동화된 검사로 동작하지 않습니다.

**Where / 위치**

`package.json`

**Why it matters / CS architecture and performance**

Static analysis catches complexity, invalid hooks usage, dependency mistakes, dead imports, and unsafe patterns before runtime. When lint is not automated, code quality depends on manual attention. That is fragile as the codebase grows and multiple optimization/refactor branches happen.

**중요한 이유 / CS 아키텍처와 성능**

정적 분석은 복잡도, 잘못된 hook 사용, dependency 실수, dead import, unsafe pattern을 runtime 전에 잡아줍니다. lint가 자동화되어 있지 않으면 코드 품질이 사람의 수동 확인에 의존하게 됩니다. 코드베이스가 커지고 최적화/리팩터링 branch가 늘어나면 이 방식은 취약합니다.

**Effort / How**

Small. Add explicit ESLint configuration compatible with the installed Next/ESLint versions. Update the script to a non-interactive command. Then run it in CI or pre-merge checks.

**작업량 / 고치는 방법**

작음. 설치된 Next/ESLint 버전과 호환되는 명시적 ESLint 설정을 추가합니다. script를 non-interactive 명령으로 바꿉니다. 이후 CI나 merge 전 검사에 포함합니다.

### 13. Session enum fields are not enforced at the API boundary

**What / Problem**

The API accepts any string for `understanding` and `focus`, while the client casts those fields into narrower TypeScript union types. `MoodRow` also uses `any`, weakening compile-time protection in the UI.

**무엇 / 문제**

API는 `understanding`, `focus`에 임의의 문자열을 허용하지만, 클라이언트는 이 값을 더 좁은 TypeScript union type으로 cast합니다. `MoodRow`도 `any`를 사용해 UI의 compile-time 보호가 약합니다.

**Where / 위치**

`app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `hooks/useAppQueries.ts`, `components/sessions/SessionModal.tsx`

**Why it matters / CS architecture and performance**

This is a type soundness problem. TypeScript only proves properties about values if runtime boundaries enforce the same constraints. If the DB stores unsupported strings, the UI may enter states that the type system says are impossible. That causes defensive code to spread and makes future refactors less safe.

**중요한 이유 / CS 아키텍처와 성능**

이 문제는 type soundness 문제입니다. TypeScript는 runtime boundary가 같은 제약을 보장할 때만 값에 대한 성질을 증명할 수 있습니다. DB에 지원하지 않는 문자열이 저장되면, 타입 시스템은 불가능하다고 말하는 상태에 UI가 들어갈 수 있습니다. 그러면 방어 코드가 퍼지고 이후 리팩터링 안전성이 낮아집니다.

**Effort / How**

Small. Add literal validators for `understanding`: `good | normal | hard | ""`, and `focus`: `high | normal | low | ""`. Reject unsupported values with 400. Replace `MoodRow` `any` with typed option objects and typed `onChange`.

**작업량 / 고치는 방법**

작음. `understanding`에는 `good | normal | hard | ""`, `focus`에는 `high | normal | low | ""` literal validator를 추가합니다. 지원하지 않는 값은 400으로 거부합니다. `MoodRow`의 `any`를 typed option object와 typed `onChange`로 교체합니다.

### 14. Session modal always refetches on open

**What / Problem**

Opening the session modal always performs a network request to `/api/sessions/:id`, even when the session data already exists in the current calendar/list data. The modal does not use cached data as an initial value.

**무엇 / 문제**

Session modal을 열 때 현재 calendar/list 데이터에 해당 수업이 이미 있어도 항상 `/api/sessions/:id` 네트워크 요청을 수행합니다. modal은 cached data를 초기값으로 사용하지 않습니다.

**Where / 위치**

`components/sessions/SessionModal.tsx`

**Why it matters / CS architecture and performance**

This adds avoidable latency to a user interaction. From a caching perspective, the app already paid to fetch the session list, so ignoring that data reduces temporal locality benefits. A better pattern is cache-first rendering: show known data immediately, then optionally revalidate in the background.

**중요한 이유 / CS 아키텍처와 성능**

사용자 상호작용에 피할 수 있는 지연이 추가됩니다. 캐싱 관점에서 앱은 이미 session list를 가져오는 비용을 지불했는데, 그 데이터를 무시하면 temporal locality의 이점을 잃습니다. 더 좋은 패턴은 cache-first rendering입니다. 알려진 데이터를 즉시 보여주고, 필요하면 background에서 revalidate합니다.

**Effort / How**

Small / Medium. Look up the session in React Query cache or the current calendar data when opening the modal. Use it to render immediately. Then perform an optional background fetch to refresh details and update the cache.

**작업량 / 고치는 방법**

작음 / 중간. modal을 열 때 React Query cache나 현재 calendar data에서 session을 먼저 찾습니다. 그 값으로 즉시 렌더링합니다. 이후 필요하면 background fetch로 상세 정보를 갱신하고 cache를 업데이트합니다.

### 15. README and operational docs are stale

**What / Problem**

Documentation still references SQLite and older orphan-session cleanup assumptions, while the actual Prisma schema uses PostgreSQL and cascading deletes.

**무엇 / 문제**

문서에는 아직 SQLite와 예전 orphan session cleanup 전제가 남아 있지만, 실제 Prisma schema는 PostgreSQL과 cascade delete를 사용합니다.

**Where / 위치**

`README.md`, `.gitignore`, `prisma/cleanup-orphan-sessions.ts`

**Why it matters / CS architecture and performance**

Developer documentation is part of system architecture. If setup docs disagree with runtime configuration, onboarding slows down and local environments diverge from production. Divergent environments hide performance and reliability bugs because developers test against the wrong assumptions.

**중요한 이유 / CS 아키텍처와 성능**

개발 문서도 시스템 아키텍처의 일부입니다. 설정 문서가 runtime 설정과 다르면 온보딩이 느려지고 로컬 환경이 운영 환경과 달라집니다. 환경이 갈라지면 개발자가 잘못된 가정 위에서 테스트하게 되어 성능/신뢰성 버그를 놓치기 쉽습니다.

**Effort / How**

Small. Update README and environment examples for PostgreSQL/Neon. Update `.gitignore` comments. Either remove the cleanup script, rename it as legacy, or update comments to explain why it may still be needed despite cascade behavior.

**작업량 / 고치는 방법**

작음. README와 환경 변수 예시를 PostgreSQL/Neon 기준으로 갱신합니다. `.gitignore` 주석도 수정합니다. cleanup script는 제거하거나 legacy 이름으로 바꾸거나, cascade 동작에도 불구하고 왜 필요한지 주석을 최신화합니다.
