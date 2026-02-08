"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./InitiativeTracker.module.css";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  HeartAddIcon,
  Refresh01Icon,
  Sword01Icon,
  BrokenBoneIcon,
} from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STORAGE_KEY = "initiative-tracker-session";

const PHASE_CELL_STATES = ["waiting", "active", "done", "dead", "revived"] as const;
type PhaseCellState = (typeof PHASE_CELL_STATES)[number];

function getCellKey(rowIndex: number, colIndex: number) {
  return `${rowIndex}-${colIndex}`;
}

function isPhaseCellState(v: unknown): v is PhaseCellState {
  return typeof v === "string" && PHASE_CELL_STATES.includes(v as PhaseCellState);
}

type Participant = { name: string; hp: string };

type State = {
  participants: Participant[];
  phases: string[];
  values: Record<string, PhaseCellState>;
};

function migrateValues(raw: Record<string, unknown>): Record<string, PhaseCellState> {
  const out: Record<string, PhaseCellState> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = isPhaseCellState(v) ? v : "waiting";
  }
  return out;
}

function ensureSingleActive(state: State): State {
  const activeKeys = Object.entries(state.values).filter(
    ([_, s]) => s === "active"
  );
  if (activeKeys.length === 1) return state;
  const next = { ...state, values: { ...state.values } };
  activeKeys.forEach(([key]) => {
    next.values[key] = "done";
  });
  if (
    state.participants.length > 0 &&
    state.phases.length > 0 &&
    activeKeys.length !== 1
  ) {
    next.values[getCellKey(0, 0)] = "active";
  }
  return next;
}

function migrateParticipants(
  raw: unknown
): Participant[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    if (typeof p === "string") return { name: p, hp: "" };
    if (p && typeof p === "object" && "name" in p) {
      const name = typeof (p as { name: unknown }).name === "string"
        ? (p as { name: string }).name
        : "";
      const hp = typeof (p as { hp?: unknown }).hp === "string"
        ? (p as { hp: string }).hp
        : "";
      return { name, hp };
    }
    return { name: "", hp: "" };
  });
}

function loadStateFromStorage(): State {
  if (typeof window === "undefined")
    return { participants: [], phases: ["Phase 1"], values: {} };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw)
      return { participants: [], phases: ["Phase 1"], values: {} };
    const data = JSON.parse(raw) as {
      participants?: unknown;
      phases?: string[];
      values?: Record<string, unknown>;
    };
    const phases = data.phases?.length ? data.phases : ["Phase 1"];
    const values = migrateValues(data.values ?? {});
    const participants = migrateParticipants(data.participants);
    const state: State = {
      participants,
      phases,
      values,
    };
    return ensureSingleActive(state);
  } catch {
    return { participants: [], phases: ["Phase 1"], values: {} };
  }
}

function saveStateToStorage(state: State) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      participants: state.participants,
      phases: state.phases,
      values: state.values,
    })
  );
}

function findNextActive(
  state: State,
  fromRow: number,
  fromCol: number
): { row: number; col: number; addPhase?: true } | null {
  const rows = state.participants.length;
  const cols = state.phases.length;
  if (rows === 0 || cols === 0) return null;
  let r = fromRow;
  let c = fromCol;
  for (;;) {
    r += 1;
    if (r >= rows) {
      r = 0;
      c += 1;
      if (c >= cols) {
        return { row: 0, col: cols, addPhase: true };
      }
    }
    const s = state.values[getCellKey(r, c)] ?? "waiting";
    if (s !== "dead") return { row: r, col: c };
  }
}

function isRowActive(state: State, rowIndex: number): boolean {
  return state.phases.some(
    (_, colIndex) =>
      (state.values[getCellKey(rowIndex, colIndex)] ?? "waiting") === "active"
  );
}

function isCharacterDeadInPreviousPhase(
  state: State,
  rowIndex: number,
  colIndex: number
): boolean {
  for (let c = 0; c < colIndex; c++) {
    if ((state.values[getCellKey(rowIndex, c)] ?? "waiting") === "dead")
      return true;
  }
  return false;
}

function isCharacterRevivedInAnyPhase(
  state: State,
  rowIndex: number
): boolean {
  return state.phases.some(
    (_, colIndex) =>
      (state.values[getCellKey(rowIndex, colIndex)] ?? "waiting") === "revived"
  );
}

/** First phase column where this row is "revived", or null if never revived. */
function getRevivedPhaseColumn(
  state: State,
  rowIndex: number
): number | null {
  const col = state.phases.findIndex(
    (_, colIndex) =>
      (state.values[getCellKey(rowIndex, colIndex)] ?? "waiting") === "revived"
  );
  return col === -1 ? null : col;
}

export function InitiativeTracker() {
  const [state, setState] = useState<State>({
    participants: [],
    phases: ["Phase 1"],
    values: {},
  });

  useEffect(() => {
    setState(loadStateFromStorage());
  }, []);

  const save = useCallback((next: State) => {
    setState(next);
    saveStateToStorage(next);
  }, []);

  const addParticipant = useCallback(() => {
    const next: State = ensureSingleActive({
      ...state,
      participants: [...state.participants, { name: "", hp: "" }],
    });
    save(next);
  }, [state, save]);

  const setParticipantName = useCallback(
    (rowIndex: number, name: string) => {
      const next = { ...state };
      next.participants = [...state.participants];
      next.participants[rowIndex] = {
        ...state.participants[rowIndex],
        name,
      };
      save(next);
    },
    [state, save]
  );

  const setParticipantHp = useCallback(
    (rowIndex: number, hp: string) => {
      const next = { ...state };
      next.participants = [...state.participants];
      next.participants[rowIndex] = {
        ...state.participants[rowIndex],
        hp,
      };
      save(next);
    },
    [state, save]
  );

  const getCellState = useCallback(
    (rowIndex: number, colIndex: number): PhaseCellState => {
      return (
        (state.values[getCellKey(rowIndex, colIndex)] as PhaseCellState) ??
        "waiting"
      );
    },
    [state.values]
  );

  const markDone = useCallback(
    (rowIndex: number, colIndex: number) => {
      const next = { ...state, values: { ...state.values } };
      const key = getCellKey(rowIndex, colIndex);
      if ((next.values[key] ?? "waiting") !== "active") return;
      next.values[key] = isCharacterDeadInPreviousPhase(state, rowIndex, colIndex)
        ? "dead"
        : "done";
      const nextCell = findNextActive(state, rowIndex, colIndex);
      if (nextCell) {
        if (nextCell.addPhase) {
          next.phases = [
            ...state.phases,
            `Phase ${state.phases.length + 1}`,
          ];
        }
        next.values[getCellKey(nextCell.row, nextCell.col)] = "active";
      }
      save(next);
    },
    [state, save]
  );

  const markDead = useCallback(
    (rowIndex: number, colIndex: number) => {
      const next = { ...state, values: { ...state.values } };
      const key = getCellKey(rowIndex, colIndex);
      if ((next.values[key] ?? "waiting") !== "active") return;
      next.values[key] = "dead";
      const nextCell = findNextActive(state, rowIndex, colIndex);
      if (nextCell) {
        if (nextCell.addPhase) {
          next.phases = [
            ...state.phases,
            `Phase ${state.phases.length + 1}`,
          ];
        }
        next.values[getCellKey(nextCell.row, nextCell.col)] = "active";
      }
      save(next);
    },
    [state, save]
  );

  const revive = useCallback(
    (rowIndex: number, colIndex: number) => {
      const next = { ...state, values: { ...state.values } };
      const key = getCellKey(rowIndex, colIndex);
      if ((next.values[key] ?? "waiting") !== "active") return;
      next.values[key] = "revived";
      const nextCell = findNextActive(state, rowIndex, colIndex);
      if (nextCell) {
        if (nextCell.addPhase) {
          next.phases = [
            ...state.phases,
            `Phase ${state.phases.length + 1}`,
          ];
        }
        next.values[getCellKey(nextCell.row, nextCell.col)] = "active";
      }
      save(next);
    },
    [state, save]
  );

  const hasData =
    state.participants.length > 0 || state.phases.length > 1;

  const doReset = useCallback(() => {
    save({
      participants: [],
      phases: ["Phase 1"],
      values: {},
    });
  }, [save]);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const actionButtonClass =
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md px-3 py-2 text-sm italic text-amber-900/50 transition-colors hover:bg-amber-100/60 sm:min-w-0 sm:justify-start sm:py-1.5";

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className={`${styles.trackerPage} overflow-hidden rounded-lg border border-stone-300 bg-amber-50 p-4 sm:p-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
          <button
            type="button"
            onClick={addParticipant}
            className={actionButtonClass}
          >
            <HugeiconsIcon icon={Add01Icon} size={18} />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add participant</span>
          </button>
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <button
              type="button"
              onClick={() => hasData && setResetDialogOpen(true)}
              className={actionButtonClass}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={18} />
              <span className="sm:hidden">Reset</span>
              <span className="hidden sm:inline">Reset board</span>
            </button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear tracker?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all participants and reset the board.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={doReset}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className={`${styles.scrollContainer} -mx-4 sm:-mx-6`}>
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr>
              <th className={`${styles.stickyNameHp} ${styles.stickyNameHpDefault} sticky left-0 z-10 min-w-[200px] px-3 py-2.5 text-left text-xs font-semibold text-amber-900/20 sm:min-w-[240px] sm:px-4 sm:py-3 md:min-w-[260px]`}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">Name</span>
                  <span className="w-[3rem] shrink-0 sm:w-[4rem]">HP</span>
                </div>
              </th>
              {state.phases.map((label, i) => (
                <th
                  key={i}
                  className="min-w-[4.5rem] bg-amber-50 px-3 py-2.5 text-left text-xs font-semibold text-amber-900/20 sm:min-w-[5rem] sm:px-4 sm:py-3 md:min-w-[6rem]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.participants.map((p, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${styles.ruledRow} transition-colors hover:bg-amber-100/25${
                  isRowActive(state, rowIndex) ? "bg-amber-100/25" : ""
                }`}
              >
                <td className={`${styles.stickyNameHp} ${isRowActive(state, rowIndex) ? styles.stickyNameHpActive : styles.stickyNameHpDefault} sticky left-0 z-10 px-3 py-2.5 sm:px-4 sm:py-3`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add name..."
                      value={p.name}
                      onChange={(e) =>
                        setParticipantName(rowIndex, e.target.value)
                      }
                      className="min-w-0 flex-1 border-0 bg-transparent px-0 py-1.5 text-sm font-semibold text-stone-500 placeholder:italic placeholder:text-stone-400/60 focus:outline-none focus:ring-0 sm:min-w-[8rem]"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="—"
                      value={p.hp}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v))
                          setParticipantHp(rowIndex, v);
                      }}
                      className="w-[3rem] shrink-0 border-0 bg-transparent px-0 py-1.5 text-sm text-stone-500 placeholder:italic placeholder:text-stone-400/60 focus:outline-none focus:ring-0 sm:w-[4rem]"
                    />
                  </div>
                </td>
                {state.phases.map((_, colIndex) => {
                  const cellState = getCellState(rowIndex, colIndex);
                  return (
                    <td
                      key={colIndex}
                      className="min-w-[4.5rem] px-3 py-2.5 sm:min-w-[5rem] sm:px-4 sm:py-3"
                    >
                      {cellState === "waiting" && (
                        <span className="text-sm text-stone-300">
                          Waiting
                        </span>
                      )}
                      {cellState === "active" && (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => markDone(rowIndex, colIndex)}
                            className="min-h-[44px] min-w-[44px] rounded p-2 text-emerald-500 transition-colors hover:bg-stone-200 hover:text-emerald-900 touch-manipulation"
                            title="Done"
                          >
                            <HugeiconsIcon icon={Sword01Icon} size={20} />
                          </button>
                          {isCharacterDeadInPreviousPhase(
                            state,
                            rowIndex,
                            colIndex
                          ) &&
                          !isCharacterRevivedInAnyPhase(state, rowIndex) ? (
                            <button
                              type="button"
                              onClick={() => revive(rowIndex, colIndex)}
                              className="min-h-[44px] min-w-[44px] rounded p-2 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 touch-manipulation"
                              title="Revive"
                            >
                              <HugeiconsIcon icon={HeartAddIcon} size={20} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markDead(rowIndex, colIndex)}
                              className="min-h-[44px] min-w-[44px] rounded p-2 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 touch-manipulation"
                              title="Dead"
                            >
                              <HugeiconsIcon icon={BrokenBoneIcon} size={20} />
                            </button>
                          )}
                        </div>
                      )}
                      {cellState === "done" && (
                        <span className="text-sm text-stone-500">Done</span>
                      )}
                      {cellState === "dead" && (() => {
                        const revivedCol = getRevivedPhaseColumn(
                          state,
                          rowIndex
                        );
                        const showAsDone =
                          revivedCol !== null && colIndex > revivedCol;
                        return (
                          <span
                            className={`text-sm ${
                              showAsDone
                                ? "text-stone-500"
                                : "text-rose-500 tracking-[0.08em]"
                            }`}
                          >
                            {showAsDone ? "Done" : "Dead"}
                          </span>
                        );
                      })()}
                      {cellState === "revived" && (
                        <span className="text-sm text-blue-600 underline decoration-blue-400/50 decoration-1 underline-offset-1">
                          Revived
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
