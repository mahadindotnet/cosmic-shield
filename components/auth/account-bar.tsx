import { getCurrentUser } from "@/lib/auth/dal";
import { EnvironmentHydrator } from "@/components/mission/environment-hydrator";
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
 * the client store.
 */
export async function AccountBar() {
  const current = await getCurrentUser();
  if (!current) return null;
  return (
    <>
      <EnvironmentHydrator userId={current.user.id} environmentId={current.user.environment} />
      <AccountMenu account={view(current.user)} />
    </>
  );
}
