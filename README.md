# 쌤플래너

개인 과외 선생님을 위한 학생 관리, 수업 기록, 캘린더, 숙제 관리 플랫폼입니다.

**Next.js 14 App Router + TypeScript + Tailwind CSS + Zustand + Prisma + SQLite**

## Getting Started

```bash
npm install
npm run db:migrate
npm run dev
```

개발 서버가 실행되면 브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:3000
```

## Scripts

| 명령어 | 설명 |
|---|---|
| `npm run dev` | Next.js 개발 서버를 실행합니다. |
| `npm run build` | 프로덕션 빌드를 생성합니다. |
| `npm run start` | 빌드된 앱을 실행합니다. |
| `npm run lint` | Next.js lint를 실행합니다. 현재 ESLint 초기 설정이 필요할 수 있습니다. |
| `npm run db:migrate` | Prisma 마이그레이션을 실행합니다. |
| `npm run db:cleanup-orphan-sessions` | 고아 수업 데이터를 정리합니다. |

## Environment Variables

루트에 `.env` 파일을 두고 Prisma 데이터베이스 경로를 설정합니다.

```env
DATABASE_URL="file:./dev.db"
```

SQLite 파일은 Prisma 설정 기준으로 생성됩니다.

## Database

Prisma schema는 [prisma/schema.prisma](./prisma/schema.prisma)에 있습니다.

주요 모델:

| 모델 | 설명 |
|---|---|
| `Student` | 학생 프로필, 과목, 상태, 색상, 수업 집계 정보 |
| `Session` | 학생에게 연결된 수업 기록 |
| `HomeworkItem` | 특정 수업에서 나온 숙제 항목 |
| `Report` | 저장된 리포트 본문, 상태, 대상 기간 |
| `ReportSession` | 리포트에 포함된 수업 연결 정보 |
| `AppPreference` | 앱 전체 환경설정. 현재는 기본 표시 타임존을 저장 |

관계:

- `Student` 1명은 여러 `Session`을 가질 수 있습니다.
- `Session` 1개는 여러 `HomeworkItem`을 가질 수 있습니다.
- `Student` 1명은 여러 `Report`를 가질 수 있습니다.
- `Report` 1개는 여러 `Session`을 포함할 수 있고, 연결은 `ReportSession`에서 관리합니다.
- 학생이 삭제되면 연결된 수업이 함께 삭제됩니다.
- 수업이 삭제되면 연결된 숙제도 함께 삭제됩니다.
- 학생이 삭제되면 연결된 리포트도 함께 삭제됩니다.
- 리포트가 삭제되면 `ReportSession` 연결도 함께 삭제됩니다.
- 숙제는 DB상으로는 수업에 연결되지만, API에서는 `/api/homeworks`를 통해 독립 리소스로 관리합니다.
- `AppPreference`는 사용자 계정이 없는 현재 구조에서 앱 전체 설정 row 1개를 사용합니다.

## API Conventions

- Base URL: `/api`
- Request body와 response body는 JSON을 사용합니다.
- 날짜는 ISO 8601 문자열로 응답합니다.
- `id`, `studentId`, `sessionId`는 양의 정수입니다.
- 에러 응답은 기본적으로 `{ "error": string }` 형태입니다.
- `GET /api/sessions`, `GET /api/sessions/:id`는 수업과 함께 `homework` 배열을 내려줍니다.
- 숙제 생성, 수정, 삭제는 `/api/homeworks`에서 처리합니다.
- `PATCH /api/sessions/:id`는 수업 정보만 수정하고 숙제 배열은 수정하지 않습니다.
- 리포트 초안 생성은 `/api/reports/draft`, 저장된 리포트 관리는 `/api/reports`에서 처리합니다.
- 앱 전체 타임존 설정은 `/api/preferences`에서 관리합니다.

## API Reference

### Students

#### GET `/api/students`

학생 목록을 조회합니다. 목록 화면에서 필요한 최근 수업 정보와 이번 달 수업 수를 함께 반환합니다.

Response:

```json
[
  {
    "id": 1,
    "name": "김민준",
    "subject": "수학",
    "grade": "고2",
    "school": "한국고",
    "color": "s-blue",
    "avatarChar": "김",
    "status": "active",
    "startDate": "2024-09",
    "totalSessions": 12,
    "hwCompletionRate": 80,
    "lastSessionAt": "2026-05-16T10:00:00.000Z",
    "lastSessionContent": "미적분 복습",
    "thisMonthSessionCount": 4
  }
]
```

#### POST `/api/students`

학생을 생성합니다.

Request body:

```json
{
  "name": "김민준",
  "subject": "수학",
  "grade": "고2",
  "school": "한국고",
  "color": "s-blue",
  "avatarChar": "김",
  "status": "active",
  "startDate": "2024-09",
  "totalSessions": 0,
  "hwCompletionRate": 0
}
```

#### GET `/api/students/:id`

학생 단건을 조회합니다. 해당 학생의 `sessions`와 각 수업의 `homework`를 포함합니다.

#### PATCH `/api/students/:id`

학생 정보를 부분 수정합니다.

수정 가능 필드:

- `name`
- `subject`
- `grade`
- `school`
- `color`
- `avatarChar`
- `status`
- `startDate`
- `totalSessions`
- `hwCompletionRate`

#### DELETE `/api/students/:id`

학생을 삭제합니다. 연결된 수업과 숙제는 cascade로 함께 삭제됩니다.

### Sessions

#### GET `/api/sessions`

전체 수업 목록을 조회합니다. 각 수업은 `homework` 배열을 포함합니다.

Response:

```json
[
  {
    "id": 1,
    "studentId": 1,
    "start": "2026-05-16T10:00:00.000Z",
    "end": "2026-05-16T11:00:00.000Z",
    "place": "온라인",
    "notes": "미적분 복습",
    "understanding": "good",
    "focus": "high",
    "homework": [
      {
        "id": 1,
        "text": "등비수열 문제 10개",
        "done": false
      }
    ]
  }
]
```

#### POST `/api/sessions`

수업을 생성합니다. 초기 숙제를 함께 생성할 수 있습니다.

Request body:

```json
{
  "studentId": 1,
  "start": "2026-05-16T10:00:00.000Z",
  "end": "2026-05-16T11:00:00.000Z",
  "place": "온라인",
  "notes": "미적분 복습",
  "understanding": "good",
  "focus": "high",
  "homework": [
    {
      "text": "등비수열 문제 10개",
      "done": false
    }
  ]
}
```

필수 필드:

- `studentId`
- `start`
- `end`

#### GET `/api/sessions/:id`

수업 단건을 조회합니다. `homework` 배열을 포함합니다.

#### PATCH `/api/sessions/:id`

수업 정보를 부분 수정합니다.

수정 가능 필드:

- `place`
- `notes`
- `understanding`
- `focus`
- `start`
- `end`

숙제는 이 엔드포인트에서 수정하지 않습니다. 숙제 추가, 완료 처리, 삭제는 `/api/homeworks`를 사용합니다.

#### DELETE `/api/sessions/:id`

수업을 삭제합니다. 연결된 숙제는 cascade로 함께 삭제됩니다.

### Homeworks

#### GET `/api/homeworks`

숙제 목록을 조회합니다. 수업과 학생 요약 정보를 함께 반환합니다.

Query parameters:

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `done` | boolean | no | `true` 또는 `false`로 완료 여부를 필터링합니다. |
| `studentId` | number | no | 특정 학생의 숙제만 조회합니다. |
| `sessionId` | number | no | 특정 수업의 숙제만 조회합니다. |

Response:

```json
[
  {
    "id": 7,
    "sessionId": 12,
    "text": "등비수열 문제 10개",
    "done": false,
    "session": {
      "id": 12,
      "start": "2026-05-16T10:00:00.000Z",
      "end": "2026-05-16T11:00:00.000Z",
      "studentId": 3,
      "student": {
        "id": 3,
        "name": "김민준",
        "subject": "수학",
        "color": "s-blue",
        "avatarChar": "김"
      }
    }
  }
]
```

#### POST `/api/homeworks`

특정 수업에 숙제를 추가합니다.

Request body:

```json
{
  "sessionId": 12,
  "text": "등비수열 문제 10개",
  "done": false
}
```

필수 필드:

- `sessionId`
- `text`

#### GET `/api/homeworks/:id`

숙제 단건을 조회합니다. 수업과 학생 요약 정보를 함께 반환합니다.

#### PATCH `/api/homeworks/:id`

숙제 내용을 수정하거나 완료 여부를 변경합니다.

Request body:

```json
{
  "text": "등비수열 문제 15개",
  "done": true
}
```

수정 가능 필드:

- `text`
- `done`

#### DELETE `/api/homeworks/:id`

숙제를 삭제합니다.

### Reports

#### GET `/api/reports`

저장된 리포트 목록을 조회합니다. `studentId` query로 특정 학생의 리포트만 조회할 수 있습니다.

Query parameters:

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `studentId` | number | no | 특정 학생의 리포트만 조회합니다. |

Response:

```json
[
  {
    "id": 1,
    "studentId": 3,
    "title": "김나윤 4월 리포트",
    "status": "draft",
    "periodStart": "2026-04-20T11:00:00.000Z",
    "periodEnd": "2026-04-22T12:30:00.000Z",
    "summary": "4월 20일 (월) 오후 08:00 ~ 오후 09:30: 미분 복습",
    "strengths": "이해도가 좋은 수업 2개가 확인됩니다.",
    "improvements": "미완료 숙제 1개가 있습니다.",
    "nextPlan": "다음 수업에서는 대표 문제 재풀이를 진행합니다.",
    "createdAt": "2026-05-18T03:00:00.000Z",
    "updatedAt": "2026-05-18T03:00:00.000Z",
    "student": {
      "id": 3,
      "name": "김나윤",
      "subject": "수학",
      "grade": "고2",
      "color": "s-blue",
      "avatarChar": "김"
    },
    "sessionIds": [12, 13],
    "sessions": [
      {
        "id": 12,
        "start": "2026-04-20T11:00:00.000Z",
        "end": "2026-04-20T12:30:00.000Z",
        "notes": "미분 복습",
        "place": "온라인",
        "understanding": "good",
        "focus": "high"
      }
    ]
  }
]
```

#### POST `/api/reports`

리포트 초안을 저장합니다. `sessionIds`로 어떤 수업을 기반으로 작성했는지 함께 저장합니다.

Request body:

```json
{
  "studentId": 3,
  "title": "김나윤 4월 리포트",
  "status": "draft",
  "periodStart": "2026-04-20T11:00:00.000Z",
  "periodEnd": "2026-04-22T12:30:00.000Z",
  "summary": "4월 20일 (월) 오후 08:00 ~ 오후 09:30: 미분 복습",
  "strengths": "이해도가 좋은 수업 2개가 확인됩니다.",
  "improvements": "미완료 숙제 1개가 있습니다.",
  "nextPlan": "다음 수업에서는 대표 문제 재풀이를 진행합니다.",
  "sessionIds": [12, 13]
}
```

필수 필드:

- `studentId`
- `sessionIds`

선택 필드:

- `title`
- `status` (`draft`, `sent`)
- `periodStart`
- `periodEnd`
- `summary`
- `strengths`
- `improvements`
- `nextPlan`

`periodStart`, `periodEnd`를 보내지 않으면 포함된 수업의 시작/종료 시각으로 자동 계산합니다.

#### GET `/api/reports/:id`

저장된 리포트 단건을 조회합니다. 학생 요약 정보와 포함된 수업 목록을 함께 반환합니다.

#### PATCH `/api/reports/:id`

저장된 리포트를 부분 수정합니다.

수정 가능 필드:

- `title`
- `status`
- `periodStart`
- `periodEnd`
- `summary`
- `strengths`
- `improvements`
- `nextPlan`
- `sessionIds`

`sessionIds`를 보내면 기존 연결 수업 목록을 새 목록으로 교체합니다.

#### DELETE `/api/reports/:id`

저장된 리포트를 삭제합니다. 연결된 `ReportSession` 정보도 함께 삭제됩니다.

#### POST `/api/reports/draft`

선택한 수업들을 바탕으로 저장 전 리포트 초안을 생성합니다. 이 API는 DB에 리포트를 저장하지 않습니다.

Request body:

```json
{
  "studentId": 3,
  "sessionIds": [12, 13],
  "options": {
    "summary": true,
    "understanding": true,
    "homework": true,
    "nextPlan": true
  },
  "primaryOffset": 9
}
```

Response:

```json
{
  "draft": {
    "summary": "4월 20일 (월) 오후 08:00 ~ 오후 09:30: 미분 복습",
    "strengths": "선택한 수업 중 이해도가 좋은 수업 2개가 확인됩니다.",
    "improvements": "미완료 숙제 1개가 있습니다.",
    "nextPlan": "4월 22일 20:00-21:30 수업 이후 흐름을 이어서..."
  },
  "options": {
    "summary": true,
    "understanding": true,
    "homework": true,
    "nextPlan": true
  },
  "source": {
    "studentId": 3,
    "sessionIds": [12, 13]
  }
}
```

### Preferences

#### GET `/api/preferences`

앱 전체 환경설정을 조회합니다. 현재는 기본 표시 타임존만 관리합니다.

Response:

```json
{
  "primaryTimezone": "Asia/Seoul"
}
```

#### PATCH `/api/preferences`

앱 전체 기본 표시 타임존을 변경합니다.

Request body:

```json
{
  "primaryTimezone": "Asia/Shanghai"
}
```

지원하는 타임존은 `lib/constants.ts`의 `TZ_CATALOG`에 정의된 값입니다.
