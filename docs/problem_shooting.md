# Problem Shooting

## 2026-05-27: 페이지 이동 시 API 호출이 반복되는 문제

### 증상

한 번 방문했던 화면으로 다시 이동해도 동일한 API 요청이 반복된다. 예를 들어 대시보드, 수업 기록, 리포트, 캘린더, 학생 관리 화면이 각각 `/api/students`, `/api/sessions`, `/api/preferences` 등을 다시 호출한다.

개발 중에는 React/Next.js dev 환경 특성까지 겹쳐 요청이 더 많이 보일 수 있다. 특히 React Strict Mode에서는 `useEffect`가 개발 모드에서 한 번 더 실행되어 같은 요청이 중복되어 보일 수 있다. 하지만 현재 문제는 단순히 dev mode 중복 호출만이 아니라, 앱 구조상 페이지마다 데이터를 독립적으로 다시 가져오는 데 있다.

### 현재 구조

현재 앱은 대부분의 화면이 client component에서 `useEffect`로 직접 API를 호출한다.

- `app/dashboard/page.tsx`: `/api/sessions`, `/api/students`
- `components/records/RecordsWorkspace.tsx`: `/api/sessions`, `/api/students`
- `app/reports/page.tsx`: `/api/students`, `/api/sessions`, `/api/reports`
- `app/calendar/page.tsx`: `/api/students`, `/api/calendar/sessions`
- `app/students/page.tsx`: `/api/students`
- `components/layout/AppShell.tsx`: `/api/preferences`

각 페이지는 필요한 데이터를 스스로 불러오고, 다른 페이지가 이미 가져온 데이터가 있는지 알지 못한다. 따라서 화면을 떠났다가 다시 돌아오면 컴포넌트가 다시 mount되고, `useEffect`가 다시 실행되며, 같은 API 요청이 반복된다.

### "데이터 계층이 없다"는 뜻

여기서 데이터 계층이 없다는 말은, UI 컴포넌트와 API 사이에 데이터를 관리하는 공통 레이어가 없다는 뜻이다.

현재 구조:

```txt
Page A -> fetch("/api/students")
Page B -> fetch("/api/students")
Page C -> fetch("/api/students")
```

각 페이지가 API를 직접 호출한다. 그래서 다음 기능이 없다.

- 같은 요청을 하나로 합치는 deduplication
- 이미 받아온 데이터를 잠시 보관하는 cache
- 페이지 이동 후에도 이전 데이터를 재사용하는 shared state
- 데이터가 오래되었는지 판단하는 stale time
- 변경 후 필요한 쿼리만 다시 불러오는 invalidation
- 로딩/에러/재시도 상태를 일관되게 다루는 규칙

데이터 계층이 있는 구조:

```txt
Page A ┐
Page B ├-> Data Layer -> /api/students
Page C ┘
```

이 경우 여러 화면이 같은 데이터를 필요로 해도 공통 레이어가 먼저 cache를 확인한다. 이미 유효한 데이터가 있으면 즉시 재사용하고, 필요할 때만 API를 다시 호출한다.

### 왜 문제가 되는가

1. 같은 데이터 요청이 화면마다 반복된다.

   `/api/students`, `/api/sessions`처럼 여러 화면에서 공유하는 데이터가 페이지마다 다시 호출된다.

2. 페이지 이동 경험이 불안정해진다.

   이미 본 화면인데도 다시 로딩 상태가 보일 수 있다. 사용자는 앱이 매번 새로 시작하는 것처럼 느낀다.

3. API 로그가 과하게 많아진다.

   실제 필요한 요청과 구조상 반복되는 요청을 구분하기 어려워진다. 디버깅할 때 어떤 요청이 문제인지 파악하기 힘들어진다.

4. 변경 후 동기화 규칙이 흩어진다.

   예를 들어 수업을 수정했을 때 캘린더, 기록, 대시보드 중 어디를 다시 불러와야 하는지 각 화면이 따로 관리해야 한다.

5. 서버와 DB 부하가 불필요하게 증가한다.

   사용자가 많아지면 같은 데이터 조회가 반복되며 DB 요청도 늘어난다.

### REST API 자체의 문제가 아님

REST API로 구현했기 때문에 생긴 문제가 아니다. REST API를 쓰더라도 클라이언트에 데이터 계층을 두면 중복 요청을 줄일 수 있다.

문제는 REST API가 아니라, 현재 UI가 API를 직접 호출하고 그 결과를 화면 단위 local state에만 저장한다는 점이다.

### 개선 방향

#### 1. SWR 또는 TanStack Query 도입

추천 방향은 SWR 또는 TanStack Query 같은 client-side data fetching library를 도입하는 것이다.

예시:

```txt
useStudents() -> key: "/api/students"
useSessions() -> key: "/api/sessions"
useReports()  -> key: "/api/reports"
```

이렇게 하면 같은 key를 쓰는 화면끼리 cache를 공유할 수 있다.

기대 효과:

- 같은 API 요청 dedupe
- 페이지 재방문 시 cached data 즉시 표시
- background revalidation
- mutation 이후 `mutate()` 또는 query invalidation으로 필요한 데이터만 갱신
- loading/error 상태 표준화

#### 2. Zustand store를 데이터 cache처럼 확장

이미 Zustand를 쓰고 있으므로, 간단하게는 store에 `students`, `sessions`, `preferences`와 `lastFetchedAt`을 두고 재사용할 수 있다.

예시:

```txt
students: Student[]
studentsFetchedAt: number | null
loadStudents(): 이미 최근에 불러왔으면 skip
```

장점:

- 새 라이브러리 없이 시작 가능
- 현재 코드와 연결이 쉽다

단점:

- stale time, dedupe, retry, invalidation을 직접 구현해야 한다
- 데이터 종류가 늘면 관리 복잡도가 커진다

#### 3. AppShell 공통 fetch 정리

현재 `AppShell`은 각 페이지가 직접 감싸고 있어 페이지 이동 때마다 다시 mount될 수 있다. 이 때문에 `/api/preferences`가 여러 번 호출될 수 있다.

개선 방향:

- route group layout으로 `AppShell`을 올린다.
- 앱 내부 페이지들이 같은 shell instance를 공유하게 한다.
- preferences는 한 번 로드한 뒤 store/cache에서 재사용한다.

### 우선순위 제안

1. `/api/preferences` 중복 호출 제거
2. `/api/students`, `/api/sessions` 공통 query hook 만들기
3. records/dashboard/calendar/reports가 같은 hook/cache를 보게 만들기
4. 수업 생성/수정/삭제 후 관련 query invalidation 규칙 정하기
5. calendar range query는 range key 기준으로 cache 관리하기

### 결론

현재 반복 API 호출 문제의 핵심은 API 설계가 아니라 클라이언트 데이터 관리 구조다. 화면이 API를 직접 호출하는 방식에서, 공통 데이터 계층을 통해 cache, dedupe, invalidation을 관리하는 방식으로 이동해야 한다.