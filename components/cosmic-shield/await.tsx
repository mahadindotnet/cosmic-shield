"use client";

import { Suspense, use } from "react";

/**
 * Renders `children(data)` once `promise` resolves, and `children(null)` as
 * the fallback until then. Lets a page render its frame (hero, form, body
 * map) immediately and stream only the data-dependent blocks, so nothing the
 * user is already using gets remounted when the data arrives.
 */
export function Await<T>({
  promise,
  children,
}: {
  promise: Promise<T>;
  children: (data: T | null) => React.ReactNode;
}) {
  return (
    <Suspense fallback={children(null)}>
      <Resolved promise={promise}>{children}</Resolved>
    </Suspense>
  );
}

function Resolved<T>({ promise, children }: { promise: Promise<T>; children: (data: T) => React.ReactNode }) {
  return children(use(promise));
}
