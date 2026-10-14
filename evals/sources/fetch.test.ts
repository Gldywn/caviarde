import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { isInside } from "./fetch";

const made: string[] = [];

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "caviarde-cache-"));
  made.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true });
});

it("sees a cache inside the repository, even before it exists", () => {
  const repo = scratch();
  expect(isInside(join(repo, "not", "yet", "there"), repo)).toBe(true);
  expect(isInside(repo, repo)).toBe(true);
  expect(isInside(scratch(), repo)).toBe(false);
});

it("follows a symlink that leads back into the repository", () => {
  const repo = scratch();
  mkdirSync(join(repo, "evals"));
  const elsewhere = scratch();
  symlinkSync(join(repo, "evals"), join(elsewhere, "link"));
  expect(isInside(join(elsewhere, "link", "cache"), repo)).toBe(true);
});

it("is not fooled by another spelling of the same directory", () => {
  const repo = scratch();
  const shouted = repo.toUpperCase();
  // Only meaningful on a case-insensitive volume, the macOS default.
  if (!existsSync(shouted)) return;
  expect(isInside(join(shouted, "cache"), repo)).toBe(true);
});
