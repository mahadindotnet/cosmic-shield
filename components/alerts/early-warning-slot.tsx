import { EarlyWarningCard } from "./early-warning-card";
import { isAcknowledged, utcToday } from "@/lib/alerts/data";
import { nightlyReadingsFor } from "@/lib/sleep/data";
import { getCurrentUser } from "@/lib/auth/dal";
import type { UserRow } from "@/lib/auth/users";
import {
  evaluateHrvSleepDecline,
  HRV_SLEEP_DECLINE_ID,
} from "@/lib/rules/hrv-sleep-decline";

/**
 * Server part of the early-warning card: evaluates hrv_sleep_decline for the
 * signed-in crew member against their own sleep_entry rows (newest entry per
 * night, so nights logged by hand replace the seeded ones). Renders nothing for the
 * flight surgeon, when the rule doesn't fire, or once dismissed today.
 * Render inside <Suspense> (it reads the session cookie).
 */
export async function EarlyWarningSlot() {
  const current = await getCurrentUser();
  const result = current ? evaluateFor(current.user) : null;
  return result ? <EarlyWarningCard result={result} /> : null;
}

function evaluateFor(user: UserRow) {
  if (user.role !== "crew") return null;
  const today = utcToday();
  if (isAcknowledged(user.id, HRV_SLEEP_DECLINE_ID, today)) return null;
  const result = evaluateHrvSleepDecline(
    nightlyReadingsFor(user.id),
    today,
  );
  return result.fired ? result : null;
}
