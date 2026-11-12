import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";

interface MissionState {
  environmentId: MissionEnvironmentId | null;
  setEnvironment: (id: MissionEnvironmentId) => void;
}

/**
 * Selected mission environment, remembered in localStorage. Hydration is
 * skipped on the server and triggered once in DashboardFrame, so the first
 * client render matches the server HTML.
 */
export const useMissionStore = create<MissionState>()(
  persist(
    (set) => ({
      environmentId: null,
      setEnvironment: (environmentId) => set({ environmentId }),
    }),
    { name: "cosmic-shield:mission", skipHydration: true },
  ),
);

export function useMissionEnvironment() {
  return getMissionEnvironment(useMissionStore((s) => s.environmentId));
}
