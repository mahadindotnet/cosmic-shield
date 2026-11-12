/**
 * Demo accounts for judges. Used by the seed (hashed there), the "Demo
 * accounts" box on /login and the README. PINs are deliberately public demo
 * values; none is weak. `npm run db:seed` restores them.
 */
import type { Role } from "./session-token";

export interface DemoAccount {
  crewId: string;
  displayName: string;
  title: string;
  role: Role;
  /** Demo crew profile the account's health data comes from. */
  profileId: string | null;
  pin: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { crewId: "CS-001", displayName: "Cmdr. Elena Reyes", title: "Commander", role: "crew", profileId: "reyes", pin: "472915" },
  {
    crewId: "CS-002",
    displayName: "Dr. Amara Okafor",
    title: "Crew Medical Officer (CMO)",
    role: "crew",
    profileId: "okafor",
    pin: "538204",
  },
  { crewId: "CS-003", displayName: "Lt. Sven Lindqvist", title: "Systems", role: "crew", profileId: "lindqvist", pin: "619473" },
  { crewId: "CS-004", displayName: "Spec. Kenji Tanaka", title: "Payload", role: "crew", profileId: "tanaka", pin: "705318" },
  {
    crewId: "FS-001",
    displayName: "Dr. Maya Chen",
    title: "Flight Surgeon (ground, fictional)",
    role: "flight_surgeon",
    profileId: null,
    pin: "846251",
  },
];
