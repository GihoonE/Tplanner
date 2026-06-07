/**
 * store/index.ts
 *
 * Single Zustand store — the ONE source of truth for all app state.
 * Both the Calendar page and the Records page read from / write to
 * the same sessions[] array, giving us real-time sync for free.
 */

import { create } from "zustand";
import type {
  Student,
  Session,
  Report,
  TzEntry,
  CalendarView,
  SessionModalTab,
  SessionEditorAnchor,
  ExtraTimezonePreference,
  SessionSaveState,
} from "@/types";
import { TZ_CATALOG } from "@/lib/constants";

type SessionPatch = Partial<Omit<Session, "id" | "homework">> & {
  homework?: Session["homework"];
};

// ── Initial timezone state ────────────────────────────────────────────────────
const INITIAL_TZ: TzEntry[] = [
  { ...TZ_CATALOG[0], on: true, primary: true }, // KST — primary
  { ...TZ_CATALOG[5], on: false, primary: false }, // UTC — extra (off)
  { ...TZ_CATALOG[8], on: false, primary: false }, // EST — extra (off)
];

// ── Store shape ───────────────────────────────────────────────────────────────
export interface TutorStore {
  // ── Data ──────────────────────────────────────────────────────────────────
  students: Student[];
  sessions: Session[];
  reports: Report[];
  tzData: TzEntry[];
  pendingSessionEdits: Record<number, SessionPatch>;
  pendingSessionDeletes: number[];
  pendingSessionCreates: Session[];
  sessionSaveState: SessionSaveState;
  sessionSaveError: string | null;

  // ── Calendar UI state ─────────────────────────────────────────────────────
  calView: CalendarView;
  curWeekStart: Date;
  curMonth: Date;
  calendarActiveMonth: Date;
  curDay: Date;
  /** Simulated "now" so the demo always shows a sensible current time */
  now: Date;

  // ── Session modal ─────────────────────────────────────────────────────────
  modalSessionId: number | null;
  modalTab: SessionModalTab;
  modalOpen: boolean;
  modalAnchor: SessionEditorAnchor | null;

  // ── Record page ───────────────────────────────────────────────────────────
  activeRecordId: number | null;

  // ── Actions — data ────────────────────────────────────────────────────────
  upsertSession: (s: Session) => void;
  deleteSession: (id: number) => void;
  addSession: (s: Session) => void;
  setStudents: (students: Student[]) => void;
  setSessions: (sessions: Session[]) => void;
  markSessionPendingUpdate: (id: number, patch: SessionPatch) => void;
  markSessionPendingCreate: (session: Session) => void;
  markSessionPendingDelete: (id: number) => void;
  replaceSessionTempId: (tempId: number, session: Session) => void;
  clearSessionPending: (ids: number[]) => void;
  clearSessionPendingCreate: (ids: number[]) => void;
  setSessionSaveState: (state: SessionSaveState, error?: string | null) => void;

  // ── Actions — calendar ────────────────────────────────────────────────────
  setCalView: (v: CalendarView) => void;
  navigateWeek: (dir: 1 | -1) => void;
  navigateMonth: (dir: 1 | -1) => void;
  navigateDay: (dir: 1 | -1) => void;
  goToday: () => void;
  jumpToDate: (d: Date) => void;
  setNow: (d: Date) => void;
  setCalendarActiveMonth: (d: Date) => void;

  // ── Actions — modal ───────────────────────────────────────────────────────
  openModal: (
    sessionId: number,
    tab?: SessionModalTab,
    anchor?: SessionEditorAnchor | null,
  ) => void;
  closeModal: () => void;
  setModalTab: (tab: SessionModalTab) => void;

  // ── Actions — timezone ────────────────────────────────────────────────────
  setPrimaryTz: (id: string) => void;
  setPrimaryTimezone: (timeZone: string) => void;
  setTimezonePreference: (
    primaryTimezone: string,
    extraTimezones: ExtraTimezonePreference[],
  ) => void;
  toggleExtraTz: (id: string) => void;
  addExtraTz: (id: string) => void;
  removeExtraTz: (id: string) => void;

  // ── Actions — records ─────────────────────────────────────────────────────
  setActiveRecord: (id: number | null) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const NOW = new Date();

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isIdle(
  edits: Record<number, SessionPatch>,
  deletes: number[],
  creates: Session[],
) {
  return (
    Object.keys(edits).length === 0 && deletes.length === 0 && creates.length === 0
  );
}

function buildTzData(
  primaryTimezone: string,
  extraTimezones: ExtraTimezonePreference[],
): TzEntry[] {
  const primaryCat =
    TZ_CATALOG.find((c) => c.timeZone === primaryTimezone) ?? TZ_CATALOG[0];
  const seen = new Set<string>();
  const extras = extraTimezones
    .filter((extra) => extra.timeZone !== primaryCat.timeZone)
    .map((extra) => {
      const cat = TZ_CATALOG.find((c) => c.timeZone === extra.timeZone);
      if (!cat || seen.has(cat.timeZone)) return null;
      seen.add(cat.timeZone);
      return { ...cat, on: extra.on ?? true, primary: false };
    })
    .filter((entry): entry is TzEntry => Boolean(entry));

  return [{ ...primaryCat, on: true, primary: true }, ...extras];
}

function extrasFromTzData(tzData: TzEntry[]): ExtraTimezonePreference[] {
  return tzData
    .filter((entry) => !entry.primary)
    .map((entry) => ({ timeZone: entry.timeZone, on: entry.on }));
}

function applyPendingSessions(
  serverSessions: Session[],
  pendingSessionEdits: Record<number, SessionPatch>,
  pendingSessionDeletes: number[],
  pendingSessionCreates: Session[],
) {
  const deleted = new Set(pendingSessionDeletes);
  const byId = new Map<number, Session>();
  serverSessions.forEach((session) => {
    if (deleted.has(session.id)) return;
    byId.set(session.id, {
      ...session,
      ...(pendingSessionEdits[session.id] ?? {}),
    });
  });
  pendingSessionCreates.forEach((session) => {
    if (!deleted.has(session.id)) {
      byId.set(session.id, {
        ...session,
        ...(pendingSessionEdits[session.id] ?? {}),
      });
    }
  });
  return Array.from(byId.values());
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useTutorStore = create<TutorStore>((set, get) => ({
  students: [],
  sessions: [],
  reports: [],
  tzData: INITIAL_TZ,
  pendingSessionEdits: {},
  pendingSessionDeletes: [],
  pendingSessionCreates: [],
  sessionSaveState: "idle",
  sessionSaveError: null,

  calView: "week",
  curWeekStart: weekStart(NOW),
  // curMonth = navigation anchor (set by navigation actions).
  // calendarActiveMonth = scroll-driven display month (updated by MonthView scroll handler).
  // Both start at the same value; they may diverge temporarily during scroll.
  curMonth: monthStart(NOW),
  calendarActiveMonth: monthStart(NOW),
  curDay: new Date(NOW),
  now: NOW,

  modalSessionId: null,
  modalTab: "detail",
  modalOpen: false,
  modalAnchor: null,
  activeRecordId: null,

  // ── Data actions ───────────────────────────────────────────────────────────
  upsertSession: (updated) =>
    set((state) => ({
      sessions: state.sessions.some((s) => s.id === updated.id)
        ? state.sessions.map((s) => (s.id === updated.id ? updated : s))
        : [...state.sessions, updated],
    })),

  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      modalOpen: state.modalSessionId === id ? false : state.modalOpen,
      modalAnchor: state.modalSessionId === id ? null : state.modalAnchor,
    })),

  addSession: (s) => get().upsertSession(s),

  setStudents: (students) => set({ students }),

  setSessions: (sessions) =>
    set((state) => ({
      sessions: applyPendingSessions(
        sessions,
        state.pendingSessionEdits,
        state.pendingSessionDeletes,
        state.pendingSessionCreates,
      ),
    })),

  markSessionPendingUpdate: (id, patch) =>
    set((state) => ({
      pendingSessionEdits: {
        ...state.pendingSessionEdits,
        [id]: {
          ...(state.pendingSessionEdits[id] ?? {}),
          ...patch,
        },
      },
      sessionSaveState: "saving",
      sessionSaveError: null,
    })),

  markSessionPendingCreate: (session) =>
    set((state) => ({
      pendingSessionCreates: state.pendingSessionCreates.some(
        (item) => item.id === session.id,
      )
        ? state.pendingSessionCreates.map((item) =>
            item.id === session.id ? session : item,
          )
        : [...state.pendingSessionCreates, session],
      sessions: state.sessions.some((item) => item.id === session.id)
        ? state.sessions.map((item) => (item.id === session.id ? session : item))
        : [...state.sessions, session],
      sessionSaveState: "saving",
      sessionSaveError: null,
    })),

  markSessionPendingDelete: (id) =>
    set((state) => ({
      pendingSessionDeletes: state.pendingSessionDeletes.includes(id)
        ? state.pendingSessionDeletes
        : [...state.pendingSessionDeletes, id],
      sessions: state.sessions.filter((session) => session.id !== id),
      modalOpen: state.modalSessionId === id ? false : state.modalOpen,
      modalAnchor: state.modalSessionId === id ? null : state.modalAnchor,
      sessionSaveState: "saving",
      sessionSaveError: null,
    })),

  replaceSessionTempId: (tempId, session) =>
    set((state) => {
      const pendingSessionEdits = { ...state.pendingSessionEdits };
      const tempPatch = pendingSessionEdits[tempId];
      delete pendingSessionEdits[tempId];
      if (tempPatch) {
        pendingSessionEdits[session.id] = {
          ...(pendingSessionEdits[session.id] ?? {}),
          ...tempPatch,
        };
      }
      return {
        pendingSessionEdits,
        pendingSessionCreates: state.pendingSessionCreates.filter(
          (item) => item.id !== tempId,
        ),
        pendingSessionDeletes: state.pendingSessionDeletes.map((id) =>
          id === tempId ? session.id : id,
        ),
        sessions: state.sessions.map((item) =>
          item.id === tempId ? session : item,
        ),
      };
    }),

  clearSessionPending: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      const pendingSessionEdits = { ...state.pendingSessionEdits };
      ids.forEach((id) => delete pendingSessionEdits[id]);
      const remainingDeletes = state.pendingSessionDeletes.filter((id) => !idSet.has(id));
      return {
        pendingSessionEdits,
        pendingSessionDeletes: remainingDeletes,
        sessionSaveState: isIdle(pendingSessionEdits, remainingDeletes, state.pendingSessionCreates)
          ? "idle"
          : state.sessionSaveState,
      };
    }),

  clearSessionPendingCreate: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      const remainingCreates = state.pendingSessionCreates.filter(
        (session) => !idSet.has(session.id),
      );
      return {
        pendingSessionCreates: remainingCreates,
        sessionSaveState: isIdle(state.pendingSessionEdits, state.pendingSessionDeletes, remainingCreates)
          ? "idle"
          : state.sessionSaveState,
      };
    }),

  setSessionSaveState: (sessionSaveState, error = null) =>
    set({ sessionSaveState, sessionSaveError: error }),

  // ── Calendar actions ───────────────────────────────────────────────────────
  setCalView: (v) =>
    set((state) => {
      const m = monthStart(state.curDay);
      return {
        calView: v,
        curWeekStart: weekStart(state.curDay),
        curMonth: m,
        calendarActiveMonth: m,
      };
    }),

  navigateWeek: (dir) =>
    set((state) => {
      const curWeekStart = addDays(state.curWeekStart, dir * 7);
      const m = monthStart(curWeekStart);
      return {
        curWeekStart,
        curDay: new Date(curWeekStart),
        curMonth: m,
        calendarActiveMonth: m,
      };
    }),

  navigateMonth: (dir) =>
    set((state) => {
      const curMonth = monthStart(
        new Date(state.curMonth.getFullYear(), state.curMonth.getMonth() + dir, 1),
      );
      return {
        curMonth,
        calendarActiveMonth: curMonth,
        curDay: new Date(curMonth),
        curWeekStart: weekStart(curMonth),
      };
    }),

  navigateDay: (dir) =>
    set((state) => {
      const curDay = addDays(state.curDay, dir);
      const m = monthStart(curDay);
      return {
        curDay,
        curWeekStart: weekStart(curDay),
        curMonth: m,
        calendarActiveMonth: m,
      };
    }),

  goToday: () =>
    set((state) => {
      const m = monthStart(state.now);
      return {
        curWeekStart: weekStart(state.now),
        curMonth: m,
        calendarActiveMonth: m,
        curDay: new Date(state.now),
      };
    }),

  jumpToDate: (d) => {
    const m = monthStart(d);
    set({
      curWeekStart: weekStart(d),
      curDay: new Date(d),
      curMonth: m,
      calendarActiveMonth: m,
    });
  },

  setNow: (d) => set({ now: new Date(d) }),

  setCalendarActiveMonth: (d) =>
    set({ calendarActiveMonth: monthStart(d) }),

  // ── Modal actions ──────────────────────────────────────────────────────────
  openModal: (sessionId, tab = "detail", anchor = null) =>
    set({
      modalSessionId: sessionId,
      modalTab: tab,
      modalOpen: true,
      modalAnchor: anchor,
    }),

  closeModal: () =>
    set({ modalOpen: false, modalSessionId: null, modalAnchor: null }),

  setModalTab: (tab) => set({ modalTab: tab }),

  // ── TZ actions ─────────────────────────────────────────────────────────────
  setPrimaryTz: (id) => {
    const cat = TZ_CATALOG.find((c) => c.id === id);
    if (!cat) return;
    get().setPrimaryTimezone(cat.timeZone);
  },

  setPrimaryTimezone: (timeZone) => {
    set((state) => ({
      tzData: buildTzData(
        timeZone,
        extrasFromTzData(state.tzData).filter(
          (extra) => extra.timeZone !== timeZone,
        ),
      ),
    }));
  },

  setTimezonePreference: (primaryTimezone, extraTimezones) =>
    set({ tzData: buildTzData(primaryTimezone, extraTimezones) }),

  toggleExtraTz: (id) =>
    set((state) => ({
      tzData: state.tzData.map((t) =>
        t.id === id && !t.primary ? { ...t, on: !t.on } : t,
      ),
    })),

  addExtraTz: (id) => {
    const cat = TZ_CATALOG.find((c) => c.id === id);
    if (!cat) return;
    const { tzData } = get();
    if (tzData.find((t) => t.id === id)) return; // already present
    set((state) => ({
      tzData: [...state.tzData, { ...cat, on: true, primary: false }],
    }));
  },

  removeExtraTz: (id) =>
    set((state) => ({
      tzData: state.tzData.filter((t) => !(t.id === id && !t.primary)),
    })),

  // ── Record actions ─────────────────────────────────────────────────────────
  setActiveRecord: (id) => set({ activeRecordId: id }),
}));

// ── Selectors (convenience hooks) ─────────────────────────────────────────────
export const useStudents = () => useTutorStore((s) => s.students);
export const useSessions = () => useTutorStore((s) => s.sessions);
export const useNow = () => useTutorStore((s) => s.now);
export const useTzData = () => useTutorStore((s) => s.tzData);
export const useCalView = () => useTutorStore((s) => s.calView);
export const useModalOpen = () => useTutorStore((s) => s.modalOpen);
