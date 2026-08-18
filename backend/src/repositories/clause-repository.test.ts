import { describe, expect, it } from "vitest";
import { decideClauseVersion } from "./clause-repository.js";

describe("decideClauseVersion", () => {
  it("creates version one for a new clause", () => {
    expect(decideClauseVersion(null, "sha256:new")).toEqual({ action: "create", version: 1 });
  });

  it("does not create a duplicate for unchanged content", () => {
    expect(decideClauseVersion({ contentHash: "sha256:same", version: 3 }, "sha256:same"))
      .toEqual({ action: "unchanged", version: 3 });
  });

  it("increments the version for changed content", () => {
    expect(decideClauseVersion({ contentHash: "sha256:old", version: 3 }, "sha256:new"))
      .toEqual({ action: "create", version: 4 });
  });
});
