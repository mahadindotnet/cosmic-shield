"use client";

import { useEffect } from "react";
import { useCopilotStore } from "@/lib/store/copilot-store";
import { useMissionStore } from "@/lib/store/mission-store";

/** localStorage keys that can refer to a user (cleared after a stale session). */
const USER_STORAGE_KEYS = ["cosmic-shield:mission"];

/**
 * After a stale session (deleted user or reseeded data), forget client state
 * that could belong to the old account: the saved environment copy and any
 * in-memory store values. Renders nothing.
 */
export function ClearClientState() {
  useEffect(() => {
    // Reset the stores first: the mission store persists itself, so its key is removed afterwards.
    useMissionStore.setState({ environmentId: null, ownerId: null, touched: false });
    useCopilotStore.setState({ open: false, draft: "" });
    for (const key of USER_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Storage unavailable (private mode): nothing to clear.
      }
    }
  }, []);
  return null;
}
