/** Shared grid scaffolding so every module tab lines up the same way. */

export function ModuleGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

/** Wide main column + narrow side column (charts/history + form/guidance). */
export function ModuleRow({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">{main}</div>
      <div className="min-w-0">{side}</div>
    </div>
  );
}
