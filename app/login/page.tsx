import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { showDemoAccounts } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/dal";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { getRememberedCrewId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title="Crew sign in" subtitle="Enter your assigned crew ID and 6-digit PIN.">
      <Suspense fallback={<div className="h-[520px]" aria-busy="true" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const current = await getCurrentUser();
  if (current) redirect(current.user.mustChangePin ? "/change-pin" : "/dashboard");

  const remembered = sp.switch === "1" ? null : await getRememberedCrewId();
  const next = typeof sp.next === "string" && sp.next.startsWith("/dashboard") ? sp.next : null;
  const demo = showDemoAccounts()
    ? DEMO_ACCOUNTS.map(({ crewId, displayName, title, pin }) => ({ crewId, displayName, title, pin }))
    : null;

  const locked = sp.locked === "1";
  // Keyed so a new pre-fill (e.g. after Lock) always starts a fresh form state.
  return (
    <LoginForm
      key={`${locked}-${remembered ?? ""}`}
      prefillCrewId={remembered}
      locked={locked}
      next={next}
      demoAccounts={demo}
    />
  );
}
