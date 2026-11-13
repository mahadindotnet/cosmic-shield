import { getCurrentUser } from "@/lib/auth/dal";
import { notificationsFor } from "@/lib/notifications/data";
import { NotificationMenu } from "./notification-menu";

/** Server part of the top-bar bell (reads the session; render inside <Suspense>). */
export async function NotificationBell() {
  const current = await getCurrentUser();
  if (!current || current.user.mustChangePin) return null;
  const { items, unread } = await notificationsFor(current.user);
  return <NotificationMenu items={items} unread={unread} />;
}
