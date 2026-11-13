import { cn } from "@/lib/utils";

/**
 * Simple drawn pictograms of the seven Bristol Stool Form Scale types (after
 * Lewis & Heaton 1997). Decorative: every use sits next to the type's text
 * description, which carries the meaning.
 */
const SHAPES: Record<number, React.ReactNode> = {
  // 1: separate hard lumps, like nuts.
  1: (
    <>
      <circle cx="9" cy="13" r="4.2" />
      <circle cx="20" cy="10" r="3.6" />
      <circle cx="30" cy="14" r="4" />
      <circle cx="40" cy="10.5" r="3.4" />
      <circle cx="50" cy="13.5" r="3.8" />
    </>
  ),
  // 2: sausage-shaped but lumpy.
  2: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="20" cy="11" r="6" />
      <circle cx="29" cy="12.5" r="5.8" />
      <circle cx="38" cy="11.5" r="6" />
      <circle cx="47" cy="12" r="5.4" />
    </>
  ),
  // 3: like a sausage, with cracks on its surface.
  3: (
    <>
      <rect x="5" y="6" width="50" height="12" rx="6" />
      <path d="M16 6.5v4M24 17.5v-4M33 6.5v5M42 17.5v-4.5" className="fill-none stroke-background" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // 4: like a sausage or snake, smooth and soft.
  4: <path d="M6 15c6-8 12-8 18-3s12 5 18 0 10-5 12-2" className="fill-none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />,
  // 5: soft blobs with clear-cut edges.
  5: (
    <>
      <ellipse cx="13" cy="13" rx="7.5" ry="5" />
      <ellipse cx="30" cy="11" rx="7" ry="4.6" />
      <ellipse cx="47" cy="13.5" rx="7.5" ry="5" />
    </>
  ),
  // 6: fluffy pieces with ragged edges, mushy.
  6: <path d="M5 14l3-5 3 3 3-6 4 4 3-4 3 5 4-5 3 4 4-5 3 6 4-3 3 4 3-2 2 5-4 4-3-2-4 3-3-3-4 3-4-2-3 3-4-3-3 2-4-2-3 2-3-3z" />,
  // 7: watery, no solid pieces.
  7: <path d="M4 15c4-4 8 1 12-2s8-4 12-1 7 3 11 0 8-3 12 0 4 4 3 5-7 3-13 3-16 1-22 1-11 0-14-1-3-3-1-5z" opacity="0.8" />,
};

export function BristolPictogram({ type, className }: { type: number; className?: string }) {
  return (
    <svg viewBox="0 0 60 24" aria-hidden="true" focusable="false" className={cn("h-6 w-15 fill-current text-primary", className)}>
      {SHAPES[type]}
    </svg>
  );
}
