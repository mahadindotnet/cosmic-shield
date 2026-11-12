/**
 * PIN hashing. PINs are stored as
 *   bcrypt( HMAC-SHA256(PIN_PEPPER, pin) )
 * so a leaked database alone is not enough to brute-force the 10^6 PIN space:
 * the pepper lives only in the server environment. Changing PIN_PEPPER
 * invalidates every stored hash (run `npm run db:seed` afterwards).
 * Server-only in practice (Node crypto); never log the PIN or the hash.
 */
import { createHmac, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { BCRYPT_COST, getPinPepper, PIN_LENGTH } from "./config";
import { isWeakPin } from "./pin-rules";

export { isWeakPin, PIN_PATTERN } from "./pin-rules";

function pepper(pin: string) {
  return createHmac("sha256", getPinPepper()).update(pin, "utf8").digest("base64");
}

export function hashPin(pin: string, cost = BCRYPT_COST): Promise<string> {
  return bcrypt.hash(pepper(pin), cost);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pepper(pin), hash);
}

/** Random temporary PIN for a flight-surgeon reset; never weak. */
export function generateTemporaryPin(): string {
  for (;;) {
    const pin = String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, "0");
    if (!isWeakPin(pin)) return pin;
  }
}
