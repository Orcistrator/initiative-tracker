"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Calendar03Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";

const STORAGE_KEY = "initiative-tracker-session";

function getCellKey(rowIndex: number, colIndex: number) {
  return `${rowIndex}-${colIndex}`;
}

type State = {
  participants: string[];
  phases: string[];
  values: Record<string, string>;
};

function loadStateFromStorage(): State {
  if (typeof window === "undefined")
    return { participants: [], phases: [], values: {} };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { participants: [], phases: [], values: {} };
    const data = JSON.parse(raw) as Partial<State>;
    return {
      participants: data.participants ?? [],
      phases: data.phases ?? [],
      values: data.values ?? {},
    };
  } catch {
    return { participants: [], phases: [], values: {} };
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

export function InitiativeTracker() {
  const [state, setState] = useState<State>({
    participants: [],
    phases: [],
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
    const next: State = {
      ...state,
      participants: [...state.participants, ""],
    };
    save(next);
  }, [state, save]);

  const addPhase = useCallback(() => {
    const n = state.phases.length + 1;
    const next: State = {
      ...state,
      phases: [...state.phases, `Phase ${n}`],
    };
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

  const setCellValue = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      const key = getCellKey(rowIndex, colIndex);
      const next = { ...state, values: { ...state.values } };
      if (value === "") delete next.values[key];
      else next.values[key] = value;
      save(next);
    },
    [state, save]
  );

  const getCellValue = useCallback(
    (rowIndex: number, colIndex: number) => {
      return state.values[getCellKey(rowIndex, colIndex)] ?? "";
    },
    [state.values]
  );

  const reset = useCallback(() => {
    if (
      state.participants.length > 0 ||
      state.phases.length > 0
    ) {
      if (!confirm("Clear all participants and phases?")) return;
    }
    const next: State = { participants: [], phases: [], values: {} };
    save(next);
  }, [state.participants.length, state.phases.length, save]);

  const isEmpty =
    state.participants.length === 0 && state.phases.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-blue-400">
          Initiative Tracker
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addParticipant}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-blue-400"
          >
            <HugeiconsIcon icon={Add01Icon} size={18} />
            Add participant
          </button>
          <button
            type="button"
            onClick={addPhase}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-500"
          >
            <HugeiconsIcon icon={Calendar03Icon} size={18} />
            Add phase
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <HugeiconsIcon icon={Refresh01Icon} size={18} />
            Reset
          </button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-600 bg-slate-800">
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[160px] border-b border-slate-600 bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-blue-400">
                Name
              </th>
              {state.phases.map((label, i) => (
                <th
                  key={i}
                  className="min-w-[5rem] border-b border-slate-600 bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-blue-400"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty && (
              <tr>
                <td
                  colSpan={1 + state.phases.length}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  Add participants and phases to start tracking initiative.
                </td>
              </tr>
            )}
            {state.participants.map((name, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-slate-700/50"
              >
                <td className="sticky left-0 z-10 border-b border-slate-600 bg-slate-800 px-4 py-2 hover:bg-slate-700/50">
                  <input
                    type="text"
                    placeholder="Character or monster"
                    value={name}
                    onChange={(e) =>
                      setParticipantName(rowIndex, e.target.value)
                    }
                    className="w-full min-w-[120px] rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </td>
                {state.phases.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="border-b border-slate-600 px-4 py-2"
                  >
                    <input
                      type="text"
                      placeholder="—"
                      value={getCellValue(rowIndex, colIndex)}
                      onChange={(e) =>
                        setCellValue(rowIndex, colIndex, e.target.value)
                      }
                      className="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-2 text-center text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
