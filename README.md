# TutorDesk

개인 과외 선생님을 위한 학생 관리 · 수업 기록 · 캘린더 · 리포트 플랫폼

**Next.js 14 App Router + TypeScript + Tailwind + Zustand**

---

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 열기
open http://localhost:3000
```

---

## 프로젝트 구조

```
tutordesk/
├── app/                        # Next.js App Router 페이지
│   ├── layout.tsx              # 루트 레이아웃 (폰트, CSS)
│   ├── page.tsx                # "/" → /calendar 리다이렉트
│   ├── calendar/page.tsx       # 📅 캘린더 (주간/월간/일간)
│   ├── records/page.tsx        # ✏️  수업 기록 (캘린더와 동기화)
│   ├── students/page.tsx       # 👤 학생 관리
│   ├── dashboard/page.tsx      # ⊞  대시보드
│   └── reports/page.tsx        # 📄 리포트
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # 사이드바 + 메인 영역 래퍼
│   │   └── Sidebar.tsx         # 왼쪽 네비게이션
│   ├── ui/
│   │   ├── Badge.tsx           # 상태 뱃지
│   │   ├── Button.tsx          # 버튼 (primary/ghost/soft/danger)
│   │   ├── Avatar.tsx          # 학생 아바타
│   │   └── Toast.tsx           # 토스트 알림 + useToast 훅
│   ├── calendar/
│   │   ├── CalendarTopbar.tsx  # 날짜 이동, 뷰 전환, 시간대 버튼
│   │   ├── WeekView.tsx        # 주간 그리드 (드래그 생성 포함)
│   │   ├── MonthView.tsx       # 월간 그리드
│   │   ├── SessionBlock.tsx    # 캘린더 위의 수업 블록
│   │   └── TzPanel.tsx         # 시간대 설정 패널 (우측 슬라이드)
│   ├── sessions/
│   │   └── SessionModal.tsx    # 수업 상세 + 기록 탭 모달
│   └── records/
│       ├── RecordList.tsx      # 수업 기록 목록
│       └── RecordEditor.tsx    # 수업 기록 편집기
│
├── store/
│   └── index.ts                # Zustand 전역 스토어 (단일 진실 공급원)
│
├── types/
│   └── index.ts                # 공유 TypeScript 타입
│
├── lib/
│   ├── constants.ts            # 색상 맵, TZ 카탈로그, 시드 데이터
│   └── utils.ts                # 날짜·시간대·픽셀 계산 유틸
│
└── README.md
```

---

## 핵심 설계 결정

### 단일 스토어로 캘린더 ↔ 수업기록 실시간 동기화

`store/index.ts`의 `sessions[]` 배열 하나를 캘린더와 수업기록 페이지가 함께 읽고 씁니다.
수업기록에서 메모를 수정하면 → `upsertSession()` → 캘린더 카드의 ✏ 배지가 즉시 업데이트됩니다.

### 시간대(TZ) 완전 일치

모든 픽셀 위치와 라벨 표시를 동일한 `primaryOffset` 기준으로 계산합니다.

```ts
// lib/utils.ts
function minFromMidPrimary(d: Date, primaryOffset: number): number {
  return d.getHours() * 60 + d.getMinutes() + (primaryOffset - 9) * 60;
}
```

- 세션은 KST wall-clock으로 저장 (`getHours() === KST시`)
- 화면 표시는 모두 `primaryOffset` 기준으로 변환
- 그리드 라벨 · 블록 위치 · 카드 시간이 항상 일치

### 익일 넘어가는 수업 (Cross-midnight)

`visibleSlice()` 함수가 세션을 해당 컬럼의 00:00~23:59로 클리핑합니다.
전날에서 이어지면 상단 점선 스트라이프 + "↑ XX:XX 시작",
다음 날로 이어지면 하단 스트라이프 + "↓ XX:XX 종료 (익일)" 표시.

---

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 App Router | 파일 기반 라우팅, RSC |
| 스타일 | Tailwind CSS | 유틸리티 클래스로 빠른 개발 |
| 상태관리 | Zustand | 보일러플레이트 없이 단순 |
| 폰트 | Pretendard | 토스 스타일 한국어 폰트 |
| 타입 | TypeScript strict | 안전한 도메인 모델링 |

---

## API (Route Handlers)

기본은 **동일 오리진** `fetch("/api/...")`, 요청·응답 본문은 **JSON** (`Content-Type: application/json`).  
수업 응답에서 `start` / `end`는 **ISO 8601 문자열**입니다.

### 학생 `/api/students`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| **GET** | `/api/students` | 전체 학생 목록. 각 항목에 `lastSessionAt`, `lastSessionContent`, `thisMonthSessionCount` 포함(목록용 집계). |
| **POST** | `/api/students` | 학생 생성. Body: `name`, `subject`, `grade`, `school`, `color`, `avatarChar`, `status`, `startDate`, `totalSessions`, `hwCompletionRate`. 성공 시 생성된 `Student` 객체. |

### 학생 단건 `/api/students/[id]`

`[id]`는 숫자 학생 id.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| **GET** | `/api/students/[id]` | 학생 단건 + `sessions`(내림차순 `start`) 및 각 수업의 `homework`. Prisma 직렬화(Date 등) 그대로 JSON. |
| **PATCH** | `/api/students/[id]` | 부분 수정. Body에 넣은 필드만 갱신: `name`, `subject`, `grade`, `school`, `color`, `avatarChar`, `status`, `startDate`, `totalSessions`, `hwCompletionRate`. 응답은 갱신된 학생 행 전체. |
| **DELETE** | `/api/students/[id]` | 학생 삭제. 스키마상 해당 학생의 **수업·숙제는 CASCADE**로 함께 삭제됨. 응답은 삭제 직전 스냅샷(`sessions` 포함). |

### 수업 `/api/sessions`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| **GET** | `/api/sessions` | **전체** 수업 목록(`homework` 포함), `start`/`end` ISO 문자열. 특정 학생만 보려면 클라이언트에서 필터하거나 `GET /api/sessions/[id]`로 단건 조회. |
| **POST** | `/api/sessions` | 수업 생성. 필수: `studentId`, `start`, `end`. 선택: `place`, `notes`, `understanding`, `focus`, `homework: [{ text, done? }]`. 응답은 단건과 동일 형태. |

### 수업 단건 `/api/sessions/[id]`

`[id]`는 숫자 수업 id.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| **GET** | `/api/sessions/[id]` | 수업 단건 + `homework`, 날짜 ISO. |
| **PATCH** | `/api/sessions/[id]` | `place`, `notes`, `understanding`, `focus` 및 배열 `homework` 전달 시 숙제 전체 교체(삭제 후 재생성). |
| **DELETE** | `/api/sessions/[id]` | 수업 삭제(숙제는 DB CASCADE). |

### DB · 기타 스크립트

- **Prisma + SQLite**: `DATABASE_URL` (예: `file:./prisma/dev.db`), 마이그레이션 `npm run db:migrate`, 시드 `npm run db:seed`
- **고아 수업 정리**(예전 `SetNull` 잔여 등): `npm run db:cleanup-orphan-sessions` — 자세한 옵션은 `docs/DEV_LOG_2026-04-12.md` 참고

---

## 다음 단계 (아이디어)

1. 일부 화면은 여전히 Zustand 시드 데이터와 병행 — 나머지 화면도 위 API로 통일
2. 인증·멀티 테넌시(예: Supabase + RLS) 연동 시 API에 세션/소유자 검증 추가
3. `app/reports/page.tsx`의 AI 생성 등 외부 API 연동
