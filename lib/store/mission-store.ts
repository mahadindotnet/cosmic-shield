import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";
import { saveEnvironmentAction } from "@/lib/mission/actions";

interface MissionState {
  environmentId: MissionEnvironmentId | null;
  /** users.id the current value belongs to (null before the account loads). */
  ownerId: number | null;
  /** True once the owner picked an environment in this page session. */
  touched: boolean;
  /** Picks an environment and saves it to the signed-in user's account. */
  setEnvironment: (id: MissionEnvironmentId) => void;
  /** Applies the value stored on the account (ignored after the same user picked one). */
  hydrate: (ownerId: number, id: MissionEnvironmentId | null) => void;
}

/**
 * Selected mission environment. The account (users.environment) is the source
 * of truth: EnvironmentHydrator applies it once the session has loaded, and
 * every pick is saved back with a Server Action, so it follows the user
 * across devices. A copy in localStorage is restored on mount only so the
 * page doesn't flash "Choose your environment" while the account loads; the
 * account value always wins, and a different user's copy is replaced.
 */
export const useMissionStore = create<MissionState>()(
  persist(
    (set, get) => ({
      environmentId: null,
      ownerId: null,
      touched: false,
      setEnvironment: (environmentId) => {
        set({ environmentId, touched: true });
        void saveEnvironmentAction(environmentId).catch(() => {
          // Kept locally for this session; the next pick retries the save.
        });
      },
      hydrate: (ownerId, environmentId) => {
        const s = get();
        // Picked in this tab before the account loaded: the pick is newer (and already being saved).
        if (s.touched && s.ownerId === null) return set({ ownerId });
        // Picked by this same user: keep it. Otherwise (first load, or a different
        // account signed in on this tab) take the account's value.
        if (s.touched && s.ownerId === ownerId) return;
        set({ ownerId, environmentId, touched: false });
      },
    }),
    {
      name: "cosmic-shield:mission",
      version: 2,
      skipHydration: true,
      partialize: (s) => ({ environmentId: s.environmentId, ownerId: s.ownerId }),
      // The local copy never overrides a value the account (or a pick) already set.
      merge: (persisted, current) =>
        current.ownerId !== null || current.touched ? current : { ...current, ...(persisted as Partial<MissionState>) },
    },
  ),
);

export function useMissionEnvironment() {
  return getMissionEnvironment(useMissionStore((s) => s.environmentId));
}
