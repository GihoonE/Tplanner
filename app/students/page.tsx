"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AddStudentModal } from "@/components/students/AddStudentModal";
import { EditStudentModal } from "@/components/students/EditStudentModal";
import type { Student } from "@/types";

const STATUS_BADGE: Record<
  string,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  active: "green",
  warning: "amber",
  inactive: "gray",
};
const STATUS_LABEL: Record<string, string> = {
  active: "활성",
  warning: "주의",
  inactive: "휴식중",
};

/** startDate "2024-09" → "2024년 9월" */
function formatStartMonthLabel(startDate: string) {
  const m = /^(\d{4})-(\d{1,2})/.exec(startDate.trim());
  if (!m) return startDate;
  return `${m[1]}년 ${parseInt(m[2], 10)}월`;
}

/** 학생 열은 좁게, 학교·과목은 넓게. 전체는 min-width로 가로 스크롤 가능 */
const TABLE_GRID =
  "minmax(8rem,1fr) minmax(10rem,2fr) minmax(7rem,1.35fr) minmax(5.5rem,0.95fr) minmax(6.25rem,max-content) max-content max-content";

function cellScrollClass(extra = "") {
  return `min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain ${extra}`.trim();
}

type StudentSortKey = "name" | "lastSession" | "status";

function compareStudents(
  a: Student,
  b: Student,
  key: StudentSortKey,
  dir: "asc" | "desc",
): number {
  const d = dir === "asc" ? 1 : -1;
  if (key === "name") {
    const c = a.name.localeCompare(b.name, "ko");
    return c !== 0 ? c * d : (a.id - b.id) * d;
  }
  if (key === "lastSession") {
    const ta = a.lastSessionAt
      ? new Date(a.lastSessionAt).getTime()
      : null;
    const tb = b.lastSessionAt
      ? new Date(b.lastSessionAt).getTime()
      : null;
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    const c = ta - tb;
    return c !== 0 ? c * d : (a.id - b.id) * d;
  }
  const order: Record<string, number> = {
    active: 0,
    warning: 1,
    inactive: 2,
  };
  const va = order[a.status] ?? 99;
  const vb = order[b.status] ?? 99;
  const c = va - vb;
  return c !== 0 ? c * d : a.name.localeCompare(b.name, "ko") * d;
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  sortDir,
  onAsc,
  onDesc,
}: {
  label: string;
  sortKey: StudentSortKey;
  activeKey: StudentSortKey | null;
  sortDir: "asc" | "desc";
  onAsc: () => void;
  onDesc: () => void;
}) {
  const active = activeKey === sortKey;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-start">
      <span className="min-w-0 truncate">{label}</span>
      <span className="inline-flex flex-shrink-0 flex-col leading-none">
        <button
          type="button"
          title={`${label} 오름차순`}
          aria-label={`${label} 오름차순`}
          className={`rounded px-0.5 text-[9px] font-bold transition-colors ${
            active && sortDir === "asc"
              ? "text-sky-600"
              : "text-slate-300 hover:text-slate-500"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onAsc();
          }}
        >
          ▲
        </button>
        <button
          type="button"
          title={`${label} 내림차순`}
          aria-label={`${label} 내림차순`}
          className={`rounded px-0.5 text-[9px] font-bold transition-colors ${
            active && sortDir === "desc"
              ? "text-sky-600"
              : "text-slate-300 hover:text-slate-500"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onDesc();
          }}
        >
          ▼
        </button>
      </span>
    </div>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  // ── API에서 가져오는 데이터 ─────────────────────────────────────────────
  // state는 변수랑 달리 값이 바뀌면 React가 감지해 렌더링을 다시 해줌.
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // error -> 현재 값
  // setError -> 값 바꾸는 함수
  // state | null -> string or null
  // (null) -> 초기값
  const [error, setError] = useState<string | null>(null);

  // ── 페이지 내부 상태 (검색, 선택) ───────────────────────────────────────
  const [search, setSearch] = useState("");
  // [variable, setter function]
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [sortKey, setSortKey] = useState<StudentSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error("학생 조회 실패");
        const data = await res.json();
        setStudents(data);
        if (data.length > 0 && selectedId === null) {
          setSelectedId(data[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (students.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== null && !students.some((s) => s.id === selectedId)) {
      setSelectedId(students[0].id);
    }
  }, [students, selectedId]);

  // useEffect -> 화면 그린 다음에 실행되는 코드. 즉 렌더링 이후에 실행되는 것으로
  // UI 작업을 제외한 것을 이 함수로 실행.

  // selectedId가 변경될 때 실행되는 코드
  // useEffect(() => {
  //   ...
  // }, [selectedId]);

  const displayRows = useMemo(() => {
    const filtered = students.filter(
      (s) => s.name.includes(search) || s.subject.includes(search),
    );
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) =>
      compareStudents(a, b, sortKey, sortDir),
    );
  }, [students, search, sortKey, sortDir]);

  const selected = students.find((s) => s.id === selectedId);

  return (
    <AppShell>
      {/* Topbar */}
      <div className="h-[54px] flex items-center px-5 gap-2.5 bg-white border-b border-slate-100 flex-shrink-0">
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight flex-1">
          학생 관리
        </span>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          + 학생 추가
        </Button>
      </div>

      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        // s: AddStudentModal 내부 API가 반환하는 학생
        onAdded={(s) => {
          setStudents((prev) => [...prev, s].sort((a, b) => a.id - b.id));
          setSelectedId(s.id);
        }}
      />

      <EditStudentModal
        student={editStudent}
        onClose={() => setEditStudent(null)}
        onSaved={(s) => {
          // s: 저장된 학생 데이터
          // prev: 기존 학생 리스트
          // {...x, ...s}: 기존 x를 새로운 s로 덮어쓰기
          setStudents((prev) =>
            prev.map((x) => (x.id === s.id ? { ...x, ...s } : x)),
          );
        }}
        onDeleted={(id) => {
          // filter(x): 조건을 만족하는 x만 남김
          setStudents((prev) => prev.filter((x) => x.id !== id));
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-100">
            <div className="relative mb-3">
              {/* 검색창 */}
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">
                🔍
              </span>
              <input
                value={search}
                // e: 이벤트 객체
                // e.target.value: 입력한 값
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름, 과목으로 검색..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 outline-none focus:border-sky-400 transition-colors"
              />
            </div>
          </div>
          {/* Table: 좁은 화면에서 가로 스크롤 */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
            {loading && (
              <div className="p-8 text-center text-slate-400 text-sm">
                로딩 중...
              </div>
            )}
            {error && (
              <div className="p-8 text-center text-red-500 text-sm">
                {error}
              </div>
            )}
            {!loading && !error && (
              <div className="min-w-[52rem]">
                <div className="bg-white border-b border-slate-100">
                  <div
                    className="grid px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 items-center gap-x-5"
                    style={{ gridTemplateColumns: TABLE_GRID }}
                  >
                    <SortHeader
                      label="학생"
                      sortKey="name"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onAsc={() => {
                        setSortKey("name");
                        setSortDir("asc");
                      }}
                      onDesc={() => {
                        setSortKey("name");
                        setSortDir("desc");
                      }}
                    />
                    <span className="min-w-0 text-start">학교</span>
                    <span className="text-start whitespace-nowrap pr-1">
                      과목
                    </span>
                    <SortHeader
                      label="최근 수업"
                      sortKey="lastSession"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onAsc={() => {
                        setSortKey("lastSession");
                        setSortDir("asc");
                      }}
                      onDesc={() => {
                        setSortKey("lastSession");
                        setSortDir("desc");
                      }}
                    />
                    <span className="text-start whitespace-nowrap">
                      수업 시작 월
                    </span>
                    <SortHeader
                      label="상태"
                      sortKey="status"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onAsc={() => {
                        setSortKey("status");
                        setSortDir("asc");
                      }}
                      onDesc={() => {
                        setSortKey("status");
                        setSortDir("desc");
                      }}
                    />
                    <span className="w-[52px]" aria-hidden />
                  </div>
                </div>
                {displayRows.map((stu) => {
                  const lastAt = stu.lastSessionAt;
                  return (
                    <div
                      key={stu.id}
                      onClick={() => setSelectedId(stu.id)}
                      className={`grid px-4 py-3.5 border-b border-slate-50 cursor-pointer items-center gap-x-5 transition-colors
                    ${selectedId === stu.id ? "bg-sky-50" : "hover:bg-sky-50/50"}`}
                      style={{ gridTemplateColumns: TABLE_GRID }}
                    >
                      <div className="flex min-w-0 w-full items-center gap-2 text-start">
                        <Avatar
                          char={stu.avatarChar}
                          color={stu.color}
                          size="sm"
                        />
                        <div
                          className={cellScrollClass(
                            "max-w-[6.75rem] flex-1 text-start [scrollbar-width:thin]",
                          )}
                        >
                          <div className="whitespace-nowrap text-[14px] font-semibold text-slate-900">
                            {stu.name}
                          </div>
                          <div className="whitespace-nowrap text-[11px] text-slate-400">
                            {stu.grade}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cellScrollClass(
                          "flex min-h-[40px] items-center [scrollbar-width:thin]",
                        )}
                      >
                        <span className="whitespace-nowrap text-[13px] text-slate-600">
                          {stu.school}
                        </span>
                      </div>
                      <div
                        className={cellScrollClass(
                          "flex items-center pr-1 [scrollbar-width:thin]",
                        )}
                      >
                        <Badge
                          variant="sky"
                          className="flex-shrink-0 whitespace-nowrap"
                        >
                          {stu.subject}
                        </Badge>
                      </div>
                      <div
                        className={cellScrollClass(
                          "flex items-center [scrollbar-width:thin]",
                        )}
                      >
                        <span className="whitespace-nowrap text-[12px] text-slate-500 tabular-nums">
                          {lastAt
                            ? `${new Date(lastAt).getMonth() + 1}월 ${new Date(lastAt).getDate()}일`
                            : "—"}
                        </span>
                      </div>
                      <div
                        className={cellScrollClass(
                          "flex items-center [scrollbar-width:thin]",
                        )}
                      >
                        <span className="whitespace-nowrap text-[12px] text-slate-600 tabular-nums">
                          {formatStartMonthLabel(stu.startDate)}
                        </span>
                      </div>
                      <Badge
                        variant={STATUS_BADGE[stu.status]}
                        className="justify-self-start whitespace-nowrap"
                      >
                        {STATUS_LABEL[stu.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-[52px] justify-self-end text-[11px] px-2 py-1 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditStudent(stu);
                        }}
                      >
                        변경
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 학생 상세 정보 패널 */}
        {selected && (
          <div className="w-[272px] flex-shrink-0 bg-slate-50 border-l border-slate-100 overflow-y-auto p-6">
            {/* 학생 아바타 (프로필) */}
            <Avatar
              char={selected.avatarChar}
              color={selected.color}
              size="lg"
              className="mb-3 shadow-md"
            />
            <div className="text-[16px] font-extrabold text-slate-900 tracking-tight">
              {selected.name}
            </div>
            <div className="text-[12px] text-slate-400 mt-1 mb-4">
              {selected.grade} · {selected.school} · {selected.subject}
            </div>

            <div className="border-t border-slate-100 pt-3 mb-4">
              {[
                ["수업 시작", selected.startDate],
                ["총 수업", `${selected.totalSessions}회`],
                ["숙제 완료율", `${selected.hwCompletionRate}%`],
                ["이번 달 수업", `${selected.thisMonthSessionCount ?? 0}회`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-[13px]"
                >
                  <span className="text-slate-400 font-medium">{k}</span>
                  <span className="text-slate-900 font-semibold">{v}</span>
                </div>
              ))}
            </div>

            {/* Progress bars */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                최근 수업 내용
              </div>
              <div className="mb-2.5">
                <div className="flex justify-between text-[12px] mb-1">
                  {selected.lastSessionContent}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => router.push("/records")}
              >
                수업 기록
              </Button>
              <Button
                variant="soft"
                size="sm"
                className="flex-1"
                onClick={() => router.push("/reports")}
              >
                리포트
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
