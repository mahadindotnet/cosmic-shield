import { prepareTestDb } from "../scripts/prepare-test-db";

/** Fresh schema + seed in data/cosmic-shield.test.db before every run. */
export default function globalSetup() {
  prepareTestDb();
}
