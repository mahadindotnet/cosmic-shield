"use client";

import { create } from "zustand";
import { evaluateEscalation } from "@/lib/rules/engine";
import type { CrewDashboardPayload, ModuleState } from "@/lib/rules/types";

type DashboardState = {
  crewId: string;
  payload: CrewDashboardPayload | null;
  moduleState: ModuleState | null;
  loading: boolean;
  setCrewId: (id: string) => void;
  loadCrew: (id: string) => Promise<void>;
  patchModule: (patch: Partial<ModuleState>) => void;
  recomputeEscalation: () => void;
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  crewId: "reyes",
  payload: null,
  moduleState: null,
  loading: false,

  setCrewId: (id) => {
    set({ crewId: id });
    void get().loadCrew(id);
  },

  loadCrew: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/crew/${id}`);
      if (!res.ok) throw new Error("Failed to load crew");
      const payload = (await res.json()) as CrewDashboardPayload;
      set({ payload, moduleState: payload.moduleState, crewId: id, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  patchModule: (patch) => {
    const { moduleState, payload } = get();
    if (!moduleState || !payload) return;
    const next = { ...moduleState, ...patch };
    const escalation = evaluateEscalation({
      vitals: payload.vitals,
      hrTrend: payload.hrTrend,
      moduleState: next,
    });
    set({ moduleState: next, payload: { ...payload, moduleState: next, escalation } });
  },

  recomputeEscalation: () => {
    const { moduleState, payload } = get();
    if (!moduleState || !payload) return;
    const escalation = evaluateEscalation({
      vitals: payload.vitals,
      hrTrend: payload.hrTrend,
      moduleState,
    });
    set({ payload: { ...payload, escalation } });
  },
}));
