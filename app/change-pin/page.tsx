import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ChangePinForm } from "@/components/auth/change-pin-form";
import { BackButton } from "@/components/cosmic-shield/back-button";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Change PIN" };

export default function ChangePinPage() {
  return (
    <Suspense fallback={<AuthShell title="Change PIN" subtitle="Loading…">{null}</AuthShell>}>
      <ChangePinContent />
    </Suspense>
  );
}

async function ChangePinContent() {
  const { user } = await requireUser({ allowPendingPinChange: true });
  const forced = user.mustChangePin;
  return (
    <>
      {/* A forced PIN change can't be skipped, so no Back there. */}
      {!forced && <BackButton className="fixed top-4 left-4 z-10" />}
      <AuthShell
      title={forced ? "Choose your new PIN" : "Change PIN"}
      subtitle={
        forced
          ? `Signed in as ${user.crewId}. Your PIN was reset by the flight surgeon; choose a new one to continue.`
          : `Signed in as ${user.crewId} · ${user.displayName}`
      }
    >
      <ChangePinForm forced={forced} />
      </AuthShell>
    </>
  );
}
