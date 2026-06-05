죄송, 바로 여기 붙여넣기용으로 줄게.

---

# Calendar Session 최적화 설계 명세서

> Batch API · Optimistic Update · Pending Buffer · State Architecture
> v1.0 | June 2025

---

## 개요

현재 Session API는 단일 Session 기준으로 설계되어 있어, 캘린더의 다중 선택·복사/붙여넣기·그룹 이동 기능이 추가되면서 하나의 사용자 액션이 수십 건의 API 요청으로 분해되는 병목이 발생하고 있다.

이 문서는 다음 네 가지 축으로 구성된 최적화 설계를 정의한다.

| 최적화 축 | 핵심 목표 |
|---|---|
| Batch API | 사용자 액션 단위로 API 요청 1회로 통합 |
| Optimistic Update | UI 즉시 반영 + 백그라운드 서버 저장 분리 |
| Pending Buffer | 미저장 변경사항의 field-level 누적 관리 |
| State Architecture | React Query(서버 상태) + Zustand(로컬 상태) 역할 분리 |

---

## 1. Batch API

단일 사용자 액션에서 발생하는 다수의 Session 변경을 하나의 HTTP 요청으로 묶어 처리한다.

### 1.1 Batch Create

여러 Session을 한 번에 생성한다.

| 사용 예시 | 기존 | 변경 |
|---|---|---|
| 다중 선택 후 복사/붙여넣기 | POST × N회 | Batch Create 1회 |
| 반복 일정 생성 | POST × N회 | Batch Create 1회 |
| 템플릿 기반 일정 생성 | POST × N회 | Batch Create 1회 |

**Idempotency Key 필수**

중복 요청(네트워크 재시도, 빠른 반복 입력 등)으로 인한 중복 생성을 방지한다.

- 각 Batch Create 요청에 client-generated `idempotencyKey`를 포함한다.
- 서버는 동일 key의 재요청을 감지하여 중복 생성 없이 기존 결과를 반환한다.
- 발급 단위: paste, 반복 생성 등 사용자 액션 1회당 key 1개.

### 1.2 Batch Update

여러 Session의 변경사항을 한 번에 저장한다.

| 사용 예시 | 기존 | 변경 |
|---|---|---|
| 다중 선택 후 이동 | PATCH × N회 | Batch PATCH 1회 |
| 다중 선택 후 학생 변경 | PATCH × N회 | Batch PATCH 1회 |
| 반복 일정 전체 수정 | PATCH × N회 | Batch PATCH 1회 |
| Pending Buffer flush | PATCH × N회 | Batch PATCH 1회 |

### 1.3 Batch Delete

여러 Session 삭제를 한 번에 처리한다.

| 사용 예시 | 기존 | 변경 |
|---|---|---|
| 다중 선택 삭제 | DELETE × N회 | Batch DELETE 1회 |
| 반복 일정 전체 삭제 | DELETE × N회 | Batch DELETE 1회 |

### 1.4 Transaction Semantics (부분 성공/실패 정책)

Batch 요청은 전체 원자성을 보장하지 않는다. 아래 정책을 따른다.

| 상황 | 처리 |
|---|---|
| 일부 Session 성공 | 성공한 Session은 서버 상태로 cache 업데이트 |
| 일부 Session 실패 | 실패한 Session만 dirty 상태 유지 + 에러 토스트 표시 |
| 응답 body 형식 | `{ sessionId, success, error? }` 배열로 session별 결과 반환 |

예시:

```
{ sessionId: "A", success: true }
{ sessionId: "B", success: false, error: "conflict" }
→ A는 반영, B는 rollback + dirty 유지
```

### 1.5 Flush 시점

아래 상황에서 Dirty Session들을 모아 Batch API로 일괄 저장한다.

| Flush 트리거 | 종류 |
|---|---|
| Calendar View 변경 | 내부 라우팅 |
| Route 변경 | 내부 라우팅 |
| 로그아웃 | 앱 이벤트 |
| 페이지 종료 / 새로고침 | 브라우저 이벤트 (beforeunload) |
| 다른 Session Modal 오픈 | 컴포넌트 이벤트 |

### 1.6 중복 요청 방지 (Lock 정책)

| Lock 적용 대상 | Lock 미적용 대상 |
|---|---|
| Create, Delete, Paste | Drag, Resize, Content Edit |
| 반복 일정 생성 | → 최신 변경만 유지, stale 응답 무시 |

---

## 2. Optimistic Update

UI 반영과 서버 저장을 분리하여 사용자가 즉시 결과를 확인하도록 한다.

### 2.1 공통 처리 흐름

```
1. UI 즉시 반영
2. Pending Buffer에 변경사항 저장
3. Commit Trigger 발생
4. 서버에 API 요청
5. 성공 → Pending 제거, server version으로 cache patch
6. 실패 → Error 처리 또는 Rollback
```

### 2.2 Optimistic Create: Temporary ID 전략

Create는 서버 응답 전까지 실제 ID가 없으므로 임시 ID를 사용한다.

| 단계 | 동작 |
|---|---|
| temp ID 생성 | `temp_${crypto.randomUUID()}` 형식으로 즉시 생성 |
| UI 표시 | temp session을 cache에 추가하여 즉시 렌더링 |
| 후속 작업 허용 | temp session에 대한 drag/delete/copy는 pending queue에 기록 |
| 서버 응답 성공 | temp ID → server ID 치환, pending queue 내 ID도 치환 후 순차 실행 |
| 서버 응답 실패 | temp session 및 관련 pending 작업 전체 제거, rollback |

흐름 예시:

```
1. 사용자가 새 세션 생성 → temp_abc 생성, UI 즉시 표시
2. 저장 중 temp_abc 드래그 → update(temp_abc, newTime) pending queue에 저장
3. create 성공 → 서버가 session_789 반환
4. temp_abc → session_789 치환
5. pending update 실행 → update(session_789, newTime)
```

### 2.3 Stale Response 처리

늦게 도착한 오래된 API 응답이 최신 UI 상태를 덮어쓰지 못하도록 방지한다.

| 처리 방법 | 설명 |
|---|---|
| Request Sequence | 요청마다 sequence 번호 부여, 낮은 번호의 응답은 무시 |
| Server version 비교 | 서버 응답의 version이 현재 cache version보다 낮으면 무시 |
| Pending 우선 원칙 | pending edit이 있는 session은 refetch 결과로 덮어쓰지 않음 |

```ts
// displaySession 계산 규칙
displaySession = {
  ...serverSession,   // 서버 상태 base
  ...pendingEdit      // pending이 항상 우선 (pending 있을 때만)
}
```

---

## 3. Pending Buffer

저장되지 않은 변경사항을 관리하는 임시 저장소다. Session 단위로 관리하며, payload는 field-level merge를 사용한다.

### 3.1 기본 구조

```ts
pendingEdits = {
  sessionA: {
    startTime: "2025-06-10T09:00:00",
    endTime:   "2025-06-10T10:00:00",
  },
  sessionB: {
    memo:     "다음 시간 복습 필요",
    homework: "수학 p.34~35",
  },
}
```

### 3.2 Field-Level Merge 규칙

같은 Session에 drag, modal edit, homework toggle 등이 동시에 pending될 수 있으므로 객체 전체를 replace하지 않는다.

| 규칙 | 설명 |
|---|---|
| 다른 field 변경 | 두 변경을 합친다 (Object.assign) |
| 같은 field 변경 | 마지막 변경값을 사용한다 (last-write-wins) |
| flush 직전 | session별 최종 patch payload를 normalize한다 |

merge 예시:

```
Drag pending:       { startTime, endTime }
Modal edit pending: { notes, homeworkDone }
→ Final payload:    { startTime, endTime, notes, homeworkDone }
```

### 3.3 Refetch와의 우선순위

| 상황 | 처리 |
|---|---|
| pending edit 존재 | pending 우선 — refetch 결과로 덮어쓰지 않음 |
| pending 저장 성공 | pending 제거 → server/refetch 결과 사용 |
| pending 저장 실패 | pending 유지 → 에러 표시 → 재시도 가능 |
| 멀티 디바이스 | conflict detection 추가 검토 예정 |

---

## 4. State Architecture

### 4.1 Source of Truth 분리

현재 React Query 서버 데이터를 Zustand sessions 배열로 복사하는 방식은 refetch 시 optimistic 상태가 덮어써질 위험이 있다. 역할을 아래와 같이 명확히 분리한다.

| 레이어 | 책임 |
|---|---|
| React Query | 서버 상태 관리 (calendarSessions, session detail) |
| Zustand | pendingEdits / drag state / modal draft / selection state |

```ts
// Calendar 렌더링 계산
displaySessions = serverSessions.map(s => ({
  ...s,
  ...(pendingEdits[s.id] ?? {})
}))
```

### 4.2 React Query Cache 전략

Broad invalidation은 큰 범위를 다시 fetch하므로 저장 성공 후 직접 cache patch를 기본 전략으로 사용한다.

| 전략 | 방법 |
|---|---|
| 저장 성공 시 | `queryClient.setQueryData()`로 해당 session만 직접 patch |
| 저장 실패 시 | rollback 처리 후 필요하면 현재 range만 background refetch |
| Broad invalidation 금지 | `invalidateQueries({ queryKey: ["calendarSessions"] })` 범위 최소화 |

```ts
// queryKey: view와 range 포함
["calendarSessions", view, rangeStart, rangeEnd]

// Refetch 범위
Month view: 현재 달 ± 1달
Week view:  현재 주 ± 1주
Day view:   현재 날짜 ± 1일
```

### 4.3 Server Version 관리

초기 구현부터 session row에 `version` column을 추가하여 stale response를 방지한다.

| 규칙 | 설명 |
|---|---|
| version 증가 | update/delete마다 서버에서 `version += 1` |
| 응답 포함 | 모든 fetch/update/batch 응답은 version 포함 |
| cache 반영 전 비교 | 수신 version < 현재 cache version이면 무시 |
| pending 우선 | pending edit이 있는 session은 background refetch로 덮어쓰지 않음 |

---

## 5. Drag Edit

대상: Session 이동, 날짜 변경, 시간 변경, Resize

### 5.1 단계별 동작

| 단계 | 동작 | 서버 요청 |
|---|---|---|
| Drag Start | Session을 Dirty 상태로 표시 | 없음 |
| Drag Move | UI 즉시 반영 + Pending Buffer 업데이트 | 없음 |
| Drag End | 최종 위치 기준 Commit → 서버 저장 | 1회 |

중간 경유 상태(예: 월→화→수→목)는 서버에 전송하지 않는다. 서버에는 최종 상태(목요일)만 저장된다.

### 5.2 렌더링 최적화

`mousemove`마다 React state를 업데이트하면 대형 Calendar view에서 불필요한 rerender가 발생한다.

| 항목 | 방법 |
|---|---|
| Preview 위치 | React state 대신 `ref` + CSS `transform` + `requestAnimationFrame` 사용 |
| State 업데이트 조건 | snap target이나 drop target이 실제로 바뀔 때만 업데이트 |
| Preview component | `memo` 또는 별도 lightweight layer로 분리 |
| 실제 data 변경 시점 | drag end 시점에만 반영 |

```
drag start  → preview layer 생성
drag move   → ref/transform으로 preview 위치만 이동 (React state 업데이트 없음)
snap 변경 시 → 필요한 최소 state만 update
drag end    → optimistic update → pending buffer 기록 → batch flush
```

---

## 6. Content Edit

대상: 수업 내용, 숙제, 학생 정보, 메모, Session 상세 정보

### 6.1 Draft State

Session Modal 내부에서 Draft State를 관리한다. 사용자가 입력하는 동안에는 전역 Store 및 서버 상태를 수정하지 않는다.

```
Session Store
  ↓
Modal Draft  ← 사용자 편집 (전역 Store 미수정)
  ↓ (Save 또는 Modal Close 시)
Session Store 업데이트 + Pending Buffer + 서버 저장
```

### 6.2 저장 트리거

| 종류 | 트리거 | 설명 |
|---|---|---|
| Primary Save | Save 버튼 클릭 / Modal Close | 기본 저장 시점 |
| Fallback Flush | 다른 Modal 오픈 / View 변경 / 로그아웃 / 페이지 종료 | 예외 상황 안전장치 |

---

## 7. Error Handling

### 7.1 저장 실패

| 항목 | 처리 |
|---|---|
| 에러 알림 | 에러 Toast 표시 |
| Session 상태 | Dirty 상태 유지 (데이터 손실 방지) |
| 재시도 | 사용자가 재시도 가능 |

### 7.2 Drag 실패

초기 구현은 **Dirty 상태 유지** 방식을 권장한다.

| 옵션 | 설명 | 채택 |
|---|---|---|
| Rollback | 마지막 정상 상태로 되돌림 | — |
| Dirty 유지 | Dirty 상태 유지 후 재시도 허용 | ✓ |

### 7.3 저장 상태 UI

전역 저장 상태는 사이드바 프로필 하단에 표시한다. 정상 상태에서는 프로필만 보이고, 이벤트 발생 시 프로필이 위로 올라가며 상태 정보가 나타난다.

| 상태 | 내용 |
|---|---|
| 저장 중 | "저장 중..." + subtle indicator |
| 저장 성공 | 표시 없음 (프로필 원위치 복귀) |
| 저장 실패 | "저장 실패 — 다시 시도" + 실패 session 경고 + 재시도 버튼 |
| 오프라인 | "오프라인 — 연결되면 저장" |

Session 카드 단위 표시는 최소화한다. 저장 중에는 subtle indicator만, 저장 성공은 표시 없음, 저장 실패는 프로필 하단 경고로 통합 표시한다.

---

## 8. Page Exit 및 이탈 경고

페이지 종료 시 flush는 마지막 안전망으로만 사용한다. pending 변경사항이 있을 경우 사용자에게 이탈 경고를 표시한다.

### 8.1 이탈 유형별 처리

| 이탈 유형 | 처리 방법 |
|---|---|
| 앱 내부 라우팅 / 로그아웃 | 커스텀 모달 표시 가능 |
| 새로고침 / 탭 닫기 / 브라우저 종료 | `beforeunload` 기본 경고만 제공 (커스텀 버튼 불가) |

### 8.2 커스텀 이탈 모달 (앱 내부용)

```
저장되지 않은 변경사항이 있습니다.

[계속 편집하기]        → dialog 닫기, pending 유지
[저장 후 나가기]       → flush → 성공 시 이탈 / 실패 시 이탈 차단 + 에러 표시
[저장하지 않고 나가기] → pending 폐기 + rollback + 이탈 진행
```

### 8.3 View 전환 시 주의

Month / Week / Day 전환은 페이지 이탈이 아니다. 동일 페이지 내 view 변경으로 간주하며 pending buffer는 유지된다.

실제 저장 유실 위험은 아래 상황에서만 발생한다.

- 새로고침 / 탭 닫기 / 브라우저 종료
- 외부 사이트 이동
- 로그아웃

---

## 9. Session Modal 최적화

### 9.1 Cache-First 오픈

Session 클릭 시 Calendar Cache에 이미 존재하는 데이터를 즉시 사용한다. API 로딩 없이 Modal이 즉시 열린다.

```
1. Calendar Cache에서 session 데이터 즉시 로드
2. Modal 즉시 오픈 (로딩 없음)
3. 상세 정보가 필요하면 백그라운드 Refetch
   GET /api/sessions/:id
```

### 9.2 Calendar API Payload 분리

Calendar grid 렌더링용 최소 payload와 Modal 상세 데이터를 분리하여 list fetch 크기를 줄인다.

| Endpoint | 반환 필드 | 용도 |
|---|---|---|
| `GET /api/sessions/calendar` | id, studentId, studentName, startTime, endTime, status, version + display 최소 필드 | Calendar grid 렌더링 |
| `GET /api/sessions/:id` | 전체 상세 데이터 | Session Modal |

---

## 10. DB 체크포인트

현재 규모에서는 frontend state, payload 크기, broad invalidation이 더 큰 병목이지만, 배포 전 쿼리 플랜을 확인한다.

```sql
-- Calendar overlap 조회 조건
WHERE start < rangeEnd
  AND end > rangeStart
  AND student_access_condition
ORDER BY start ASC

-- 권장 Composite Index
INDEX (teacher_id, start, end)
```

---

## 11. 구현 순서

> **가장 먼저 할 일:** Batch API 자체보다 먼저, optimistic state가 refetch/Zustand sync에 의해 덮어써지지 않는 State Architecture를 먼저 확립한다.

| 순서 | 작업 항목 | 이유 |
|---|---|---|
| 1 | Calendar State Architecture 확립 (React Query + Zustand 역할 분리) | 모든 후속 작업의 기반 |
| 2 | Optimistic Update + Pending Buffer 최소 버전 | 즉각적인 UX 개선 |
| 3 | Broad invalidation 제거 / cache 직접 patch 전환 | refetch 성능 최대화 |
| 4 | Batch Update / Delete | 다중 선택 기능 지원 |
| 5 | Batch Create + Temp ID 전략 | Create 기능 지원 |
| 6 | Session Modal Cache-first open | Modal UX 개선 |
| 7 | Calendar API Payload 분리 (list vs detail) | fetch 크기 최소화 |
| 8 | DB Index / Query Plan 확인 | 배포 전 안전 체크 |
| 9 | Drag Move 렌더링 최적화 (ref/transform 기반) | 드래그 UX 완성 |