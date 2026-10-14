import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { HarnessError } from "../cases";

const run = promisify(execFile);

function real(path: string): string {
  let existing = resolve(path);
  while (!existsSync(existing)) existing = dirname(existing);
  return join(realpathSync(existing), relative(existing, resolve(path)));
}

/** Outside the repository, symlinks resolved: external data is never
 * committed, and `ray publish` ships whatever sits in the working copy. */
export function cacheDir(): string {
  const dir = real(
    process.env.CAVIARDE_EVAL_CACHE ??
      join(homedir(), ".cache", "caviarde-evals"),
  );
  const fromRepo = relative(real(process.cwd()), dir);
  if (!isAbsolute(fromRepo) && fromRepo.split(sep)[0] !== "..")
    throw new HarnessError(
      "The evaluation cache must be outside the repository",
    );
  return dir;
}

export function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Checked on every read, not only on download, so a cached file edited
 * since cannot be scored under an unchanged pin. */
export async function readPinned(
  path: string,
  digest: string,
): Promise<Buffer> {
  const data = await readFile(path);
  if (sha256(data) !== digest)
    throw new HarnessError(`sha256 mismatch, run fetch again: ${path}`);
  return data;
}

/** Downloads once, and refuses a file whose digest differs from the pin. */
export async function fetchPinned(
  url: string,
  path: string,
  digest: string,
): Promise<void> {
  if (existsSync(path) && sha256(await readFile(path)) === digest) return;

  const response = await fetch(url);
  if (!response.ok) throw new HarnessError(`HTTP ${response.status}: ${url}`);
  const data = new Uint8Array(await response.arrayBuffer());
  if (sha256(data) !== digest)
    throw new HarnessError(`sha256 mismatch after download: ${url}`);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.part`, data);
  await rename(`${path}.part`, path);
}

/** Smudging is skipped at checkout even under a global LFS filter, so only
 * `lfsPaths` are pulled; git-lfs checks each object's oid. The filter is set
 * in the cached clone only, never globally. */
export async function cloneAtCommit(
  repo: string,
  commit: string,
  dir: string,
  lfsPaths: readonly string[],
): Promise<void> {
  if (!existsSync(join(dir, ".git"))) {
    await mkdir(dirname(dir), { recursive: true });
    await run("git", ["clone", "--quiet", "--no-checkout", repo, dir]);
  }
  await run("git", ["-C", dir, "checkout", "--quiet", "--detach", commit], {
    env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
  });
  await run("git", ["-C", dir, "lfs", "install", "--local", "--skip-repo"]);
  await run("git", [
    "-C",
    dir,
    "lfs",
    "pull",
    `--include=${lfsPaths.join(",")}`,
  ]);
}
