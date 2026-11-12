import { getCurrentUser } from "@/lib/auth/dal";
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

/** Server part of the top-bar account controls (reads the session; render inside <Suspense>). */
export async function AccountBar() {
  const current = await getCurrentUser();
  if (!current) return null;
  return <AccountMenu account={view(current.user)} />;
}
