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
} from "@/types";
import {
  SEED_STUDENTS,
  SEED_SESSIONS,
  TZ_CATALOG,
} from "@/lib/constants";

// ── Initial timezone state ────────────────────────────────────────────────────
const INITIAL_TZ: TzEntry[] = [
  { ...TZ_CATALOG[0], on: true,  primary: true  }, // KST — primary
  { ...TZ_CATALOG[5], on: false, primary: false }, // UTC — extra (off)
  { ...TZ_CATALOG[8], on: false, primary: false }, // EST — extra (off)
];

// ── Store shape ───────────────────────────────────────────────────────────────
interface TutorStore {
  // ── Data ──────────────────────────────────────────────────────────────────
  students:  Student[];
  sessions:  Session[];
  reports:   Report[];
  tzData:    TzEntry[];

  // ── Calendar UI state ─────────────────────────────────────────────────────
  calView:       CalendarView;
  curWeekStart:  Date;
  curMonth:      Date;
  curDay:        Date;
  /** Simulated "now" so the demo always shows a sensible current time */
  now:           Date;

  // ── Session modal ─────────────────────────────────────────────────────────
  modalSessionId: number | null;
  modalTab:       SessionModalTab;
  modalOpen:      boolean;

  // ── Record page ───────────────────────────────────────────────────────────
  activeRecordId: number | null;

  // ── Actions — data ────────────────────────────────────────────────────────
  upsertSession:  (s: Session) => void;
  deleteSession:  (id: number) => void;
  addSession:     (s: Session) => void;

  // ── Actions — calendar ────────────────────────────────────────────────────
  setCalView:      (v: CalendarView) => void;
  navigateWeek:    (dir: 1 | -1) => void;
  navigateMonth:   (dir: 1 | -1) => void;
  navigateDay:     (dir: 1 | -1) => void;
  goToday:         () => void;
  jumpToDate:      (d: Date) => void;

  // ── Actions — modal ───────────────────────────────────────────────────────
  openModal:       (sessionId: number, tab?: SessionModalTab) => void;
  closeModal:      () => void;
  setModalTab:     (tab: SessionModalTab) => void;

  // ── Actions — timezone ────────────────────────────────────────────────────
  setPrimaryTz:    (id: string) => void;
  toggleExtraTz:   (id: string) => void;
  addExtraTz:      (id: string) => void;
  removeExtraTz:   (id: string) => void;

  // ── Actions — records ─────────────────────────────────────────────────────
  setActiveRecord: (id: number | null) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const NOW = new Date(2025, 2, 20, 14, 22, 0, 0); // March 20 2025 14:22

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

// ── Store ─────────────────────────────────────────────────────────────────────
export const useTutorStore = create<TutorStore>((set, get) => ({
  students:  SEED_STUDENTS,
  sessions:  SEED_SESSIONS,
  reports:   [],
  tzData:    INITIAL_TZ,

  calView:      "week",
  curWeekStart: weekStart(NOW),
  curMonth:     new Date(NOW.getFullYear(), NOW.getMonth(), 1),
  curDay:       new Date(NOW),
  now:          NOW,

  modalSessionId: null,
  modalTab:       "detail",
  modalOpen:      false,
  activeRecordId: SEED_SESSIONS[0]?.id ?? null,

  // ── Data actions ───────────────────────────────────────────────────────────
  upsertSession: (updated) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    })),

  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      modalOpen: state.modalSessionId === id ? false : state.modalOpen,
    })),

  addSession: (s) =>
    set((state) => ({ sessions: [...state.sessions, s] })),

  // ── Calendar actions ───────────────────────────────────────────────────────
  setCalView: (v) => set({ calView: v }),

  navigateWeek: (dir) =>
    set((state) => ({ curWeekStart: addDays(state.curWeekStart, dir * 7) })),

  navigateMonth: (dir) =>
    set((state) => ({
      curMonth: new Date(
        state.curMonth.getFullYear(),
        state.curMonth.getMonth() + dir,
        1
      ),
    })),

  navigateDay: (dir) =>
    set((state) => ({ curDay: addDays(state.curDay, dir) })),

  goToday: () =>
    set((state) => ({
      curWeekStart: weekStart(state.now),
      curMonth:     new Date(state.now.getFullYear(), state.now.getMonth(), 1),
      curDay:       new Date(state.now),
    })),

  jumpToDate: (d) =>
    set({
      curWeekStart: weekStart(d),
      curDay:       new Date(d),
      curMonth:     new Date(d.getFullYear(), d.getMonth(), 1),
    }),

  // ── Modal actions ──────────────────────────────────────────────────────────
  openModal: (sessionId, tab = "detail") =>
    set({ modalSessionId: sessionId, modalTab: tab, modalOpen: true }),

  closeModal: () =>
    set({ modalOpen: false, modalSessionId: null }),

  setModalTab: (tab) => set({ modalTab: tab }),

  // ── TZ actions ─────────────────────────────────────────────────────────────
  setPrimaryTz: (id) => {
    const cat = TZ_CATALOG.find((c) => c.id === id);
    if (!cat) return;
    set((state) => ({
      tzData: [
        { ...cat, on: true, primary: true },
        ...state.tzData.slice(1),
      ],
    }));
  },

  toggleExtraTz: (id) =>
    set((state) => ({
      tzData: state.tzData.map((t) =>
        t.id === id && !t.primary ? { ...t, on: !t.on } : t
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
export const useStudents  = () => useTutorStore((s) => s.students);
export const useSessions  = () => useTutorStore((s) => s.sessions);
export const useNow       = () => useTutorStore((s) => s.now);
export const useTzData    = () => useTutorStore((s) => s.tzData);
export const useCalView   = () => useTutorStore((s) => s.calView);
export const useModalOpen = () => useTutorStore((s) => s.modalOpen);
