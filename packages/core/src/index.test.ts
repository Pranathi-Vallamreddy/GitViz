import { describe, expect, it } from "vitest";

import { CORE_VERSION } from "./index.js";

// Smoke test proving the toolchain (vitest + workspace resolution) is wired up.
// Real engine tests (hashing determinism, dedup, DAG traversal, diff) arrive in
// Phase 1.
describe("@gitviz/core scaffold", () => {
  it("exposes a version string", () => {
    expect(typeof CORE_VERSION).toBe("string");
  });
});
