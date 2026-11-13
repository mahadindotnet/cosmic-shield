import { redirect } from "next/navigation";
import { getCurrentUser, hasStaleSession, STALE_SESSION_PATH } from "@/lib/auth/dal";
import { EnvironmentDialog } from "@/components/mission/environment-dialog";
import { EnvironmentHydrator } from "@/components/mission/environment-hydrator";
import { envPromptDismissed } from "@/lib/notifications/data";
import { AccountMenu, type AccountView } from "./account-menu";

const view = (u: {
  crewId: string;
  displayName: string;
  title: string;
  role: "crew" | "flight_surgeon";
}): AccountView => ({
  crewId: u.crewId,
  displayName: u.displayName,
  title: u.title,
  role: u.role,
});

/**
 * Server part of the top-bar account controls (reads the session; render
 * inside <Suspense>). Also hands the account's saved mission environment to
 * the client store, and shows the "Choose your mission environment" dialog to
 * crew with none chosen (unless they chose "Choose later" in this login).
 */
export async function AccountBar() {
  const current = await getCurrentUser();
  // On every dashboard page: a cookie for a user that no longer exists (e.g.
  // after a reseed) must not render a half-working page.
  if (!current) {
    if (await hasStaleSession()) redirect(STALE_SESSION_PATH);
    return null;
  }
  const { user, session } = current;
  const promptEnvironment =
    user.role === "crew" && !user.mustChangePin && user.environment === null && !envPromptDismissed(user.id, session.issuedAt);
  return (
    <>
      <EnvironmentHydrator userId={current.user.id} environmentId={current.user.environment} />
      {promptEnvironment && (
        <>
          {/* Rendered with the account menu, so tests can tell at once whether the dialog will open. */}
          <span hidden data-testid="env-prompt-pending" />
          <EnvironmentDialog />
        </>
      )}
      <AccountMenu account={view(current.user)} />
    </>
  );
}
