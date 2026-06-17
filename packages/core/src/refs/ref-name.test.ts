import { describe, expect, it } from "vitest";

import { branchRefName, isValidBranchName, isValidRefName } from "./ref-name.js";

describe("isValidBranchName", () => {
  it("accepts ordinary and nested names", () => {
    for (const name of ["main", "feature/login", "release-1.2", "fix_42"]) {
      expect(isValidBranchName(name)).toBe(true);
    }
  });

  it("rejects malformed names", () => {
    for (const name of [
      "", // empty
      "/leading",
      "trailing/",
      "a//b",
      "-dash",
      "a..b",
      "has space",
      "ti~lde",
      "co:lon",
      "qu?mark",
      "feature.lock",
      ".hidden",
      "weird@{ref}",
    ]) {
      expect(isValidBranchName(name)).toBe(false);
    }
  });
});

describe("isValidRefName", () => {
  it("accepts HEAD and refs/… names", () => {
    expect(isValidRefName("HEAD")).toBe(true);
    expect(isValidRefName("refs/heads/main")).toBe(true);
  });

  it("rejects names that are neither HEAD nor under refs/", () => {
    expect(isValidRefName("main")).toBe(false);
    expect(isValidRefName("heads/main")).toBe(false);
  });
});

describe("branchRefName", () => {
  it("prefixes a branch with refs/heads/", () => {
    expect(branchRefName("main")).toBe("refs/heads/main");
  });
});
