"use client";

import { useEffect } from "react";
import type { MissionEnvironmentId } from "@/lib/mission/environments";
import { useMissionStore } from "@/lib/store/mission-store";

/** Loads the account's saved mission environment into the client store. */
export function EnvironmentHydrator({ userId, environmentId }: { userId: number; environmentId: MissionEnvironmentId | null }) {
  useEffect(() => {
    useMissionStore.getState().hydrate(userId, environmentId);
  }, [userId, environmentId]);
  return null;
}
