"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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

type State = {
  participants: string[];
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

function loadStateFromStorage(): State {
  if (typeof window === "undefined")
    return { participants: [], phases: ["Phase 1"], values: {} };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw)
      return { participants: [], phases: ["Phase 1"], values: {} };
    const data = JSON.parse(raw) as {
      participants?: string[];
      phases?: string[];
      values?: Record<string, unknown>;
    };
    const phases = data.phases?.length ? data.phases : ["Phase 1"];
    const values = migrateValues(data.values ?? {});
    const state: State = {
      participants: data.participants ?? [],
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
      participants: [...state.participants, ""],
    });
    save(next);
  }, [state, save]);

  const setParticipantName = useCallback(
    (rowIndex: number, name: string) => {
      const next = { ...state };
      next.participants = [...state.participants];
      next.participants[rowIndex] = name;
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
          Initiative Tracker
        </h1>
        <div className="flex flex-wrap gap-2">
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <button
              type="button"
              onClick={() => hasData && setResetDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <HugeiconsIcon icon={Refresh01Icon} size={18} />
              Reset
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
      </header>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full border-collapse">
          <thead>
            <tr className="">
              <th className="sticky left-0 z-10 min-w-[200px] bg-zinc-50 px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                Name
              </th>
              {state.phases.map((label, i) => (
                <th
                  key={i}
                  className="min-w-[6rem] bg-zinc-50 px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.participants.map((name, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-zinc-200 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50 ${
                  isRowActive(state, rowIndex)
                    ? "bg-zinc-100 dark:bg-zinc-800/80"
                    : ""
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2">
                  <input
                    type="text"
                    placeholder="Character or monster"
                    value={name}
                    onChange={(e) =>
                      setParticipantName(rowIndex, e.target.value)
                    }
                    className="w-full min-w-[200px] rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
                  />
                </td>
                {state.phases.map((_, colIndex) => {
                  const cellState = getCellState(rowIndex, colIndex);
                  return (
                    <td
                      key={colIndex}
                      className="min-w-[5rem] px-4 py-2"
                    >
                      {cellState === "waiting" && (
                        <span className="text-sm text-zinc-300 dark:text-zinc-600">
                          Waiting
                        </span>
                      )}
                      {cellState === "active" && (
                        <div className="gap-1">
                          <button
                            type="button"
                            onClick={() => markDone(rowIndex, colIndex)}
                            className="rounded p-1.5 text-emerald-500 transition-colors hover:bg-zinc-200 hover:text-emerald-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
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
                              className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                              title="Revive"
                            >
                              <HugeiconsIcon icon={HeartAddIcon} size={20} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markDead(rowIndex, colIndex)}
                              className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                              title="Dead"
                            >
                              <HugeiconsIcon icon={BrokenBoneIcon} size={20} />
                            </button>
                          )}
                        </div>
                      )}
                      {cellState === "done" && (
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Done
                        </span>
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
                                ? "text-zinc-600 dark:text-zinc-400"
                                : "text-rose-500 dark:text-rose-500"
                            }`}
                          >
                            {showAsDone ? "Done" : "Dead"}
                          </span>
                        );
                      })()}
                      {cellState === "revived" && (
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          Revived
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr
              role="button"
              tabIndex={0}
              onClick={addParticipant}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              className="cursor-pointer bg-zinc-50/70 transition-colors hover:bg-zinc-100/90 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70"
            >
              <td
                colSpan={1 + state.phases.length}
                className="sticky left-0 z-10 px-4 py-3 text-sm text-zinc-400 dark:text-zinc-500"
              >
                <span className="italic">Click to add participant</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
