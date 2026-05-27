"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { RecordList } from "@/components/records/RecordList";
import { RecordEditor } from "@/components/records/RecordEditor";
import { NewSessionRecordModal } from "@/components/records/NewSessionRecordModal";
import { queryKeys, useSessionsQuery, useStudentsQuery } from "@/hooks/useAppQueries";
import type { Session, Student } from "@/types";

export function RecordsWorkspace() {
  const { data: authSession } = useSession();
  const readOnly = authSession?.user?.role === "parent";
  const searchParams = useSearchParams();
  const initialSessionId = Number(searchParams.get("session"));
  const initialStudentSearch =
    Number.isSafeInteger(initialSessionId) ? "" : (searchParams.get("student") ?? "");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const queryClient = useQueryClient();
  const sessionsQuery = useSessionsQuery();
  const studentsQuery = useStudentsQuery();
  const loadState =
    sessionsQuery.isLoading || studentsQuery.isLoading
      ? "loading"
      : sessionsQuery.isError || studentsQuery.isError
        ? "error"
        : "ready";
  const loadError =
    sessionsQuery.error instanceof Error
      ? sessionsQuery.error.message
      : studentsQuery.error instanceof Error
        ? studentsQuery.error.message
        : null;

  useEffect(() => {
    if (sessionsQuery.data) setSessions(sessionsQuery.data);
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (studentsQuery.data) setStudents(studentsQuery.data);
  }, [studentsQuery.data]);

  useEffect(() => {
    if (loadState !== "ready") return;
    setActiveId((aid) => {
      if (sessions.length === 0) return null;
      if (
        Number.isSafeInteger(initialSessionId) &&
        sessions.some((s) => s.id === initialSessionId)
      ) {
        return initialSessionId;
      }
      if (aid !== null && sessions.some((s) => s.id === aid)) return aid;
      return sessions[0].id;
    });
  }, [initialSessionId, loadState, sessions]);

  const onSessionChange = useCallback((next: Session) => {
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
    queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) =>
      prev?.map((s) => (s.id === next.id ? next : s)),
    );
    void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
  }, [queryClient]);

  const onDeleted = useCallback((id: number) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveId((aid) => {
        if (aid !== id) return aid;
        return next[0]?.id ?? null;
      });
      return next;
    });
    queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) =>
      prev?.filter((s) => s.id !== id),
    );
    void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
  }, [queryClient]);

  const onSessionCreated = useCallback((created: Session) => {
    setSessions((prev) => {
      const next = [created, ...prev].sort(
        (a, b) => b.start.getTime() - a.start.getTime(),
      );
      return next;
    });
    queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) =>
      [created, ...(prev ?? [])].sort(
        (a, b) => b.start.getTime() - a.start.getTime(),
      ),
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.students });
    void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
    setActiveId(created.id);
  }, [queryClient]);

  const activeSession =
    activeId != null ? (sessions.find((s) => s.id === activeId) ?? null) : null;
  const activeStudent = activeSession
    ? students.find((s) => s.id === activeSession.studentId)
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-[54px] flex-shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-6">
        <span className="flex-1 text-[15px] font-extrabold tracking-tight text-slate-900">
          수업 기록
        </span>
        {!readOnly && (
          <button
            type="button"
            disabled={loadState !== "ready"}
            onClick={() => setNewSessionOpen(true)}
            className="rounded-xl bg-sky-500 px-4 py-2 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(16,67,109,.3)] transition-colors hover:bg-sky-600 disabled:pointer-events-none disabled:opacity-50"
          >
            + 새 기록
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <RecordList
          sessions={sessions}
          students={students}
          activeId={activeId}
          onSelect={setActiveId}
          loading={loadState === "loading"}
          error={loadState === "error" ? loadError : null}
          initialSearch={initialStudentSearch}
        />
        <RecordEditor
          session={activeSession}
          student={activeStudent}
          onSessionChange={onSessionChange}
          onDeleted={onDeleted}
          readOnly={readOnly}
        />
      </div>

      {!readOnly && (
        <NewSessionRecordModal
          open={newSessionOpen}
          onClose={() => setNewSessionOpen(false)}
          students={students}
          onCreated={onSessionCreated}
        />
      )}
    </div>
  );
}
