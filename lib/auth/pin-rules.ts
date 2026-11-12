/** PIN format and strength rules. Pure (no Node APIs) so forms can share them. */
/** Exactly six digits (PIN_LENGTH in config.ts). */
export const PIN_PATTERN = /^\d{6}$/;

/**
 * Weak PINs: one digit repeated (111111) or a straight run of consecutive
 * digits up or down (123456, 654321, 345678, 987654; also wrapping, 890123).
 */
export function isWeakPin(pin: string): boolean {
  if (!PIN_PATTERN.test(pin)) return true;
  const d = [...pin].map(Number);
  if (d.every((x) => x === d[0])) return true;
  const step = (i: number) => (d[i] - d[i - 1] + 10) % 10;
  const ascending = d.slice(1).every((_, i) => step(i + 1) === 1);
  const descending = d.slice(1).every((_, i) => step(i + 1) === 9);
  return ascending || descending;
}
