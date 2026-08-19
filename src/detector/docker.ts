import { execFile, spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  CONTAINER_NAME,
  CONTAINER_PORT,
  DETECTOR_IMAGE,
  DOCKER_CANDIDATES,
  DOCKER_HOME_CANDIDATES,
  FLOORS,
  PATCH_TARGET,
} from "./image";

const run = promisify(execFile);

export function findDocker(): string | null {
  const candidates = [
    ...DOCKER_CANDIDATES,
    ...DOCKER_HOME_CANDIDATES.map((p) => join(homedir(), p)),
  ];
  for (const path of candidates) {
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }
  return null;
}

/** Docker shells out to credential helpers sitting beside its own binary, and
 * Raycast's Node process has almost nothing on PATH. */
function dockerEnv(docker: string): NodeJS.ProcessEnv {
  const dirs = [
    dirname(docker),
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
  ];
  const existing = process.env.PATH;
  return {
    ...process.env,
    PATH:
      [...new Set(dirs)].join(":") +
      (existing === undefined ? "" : `:${existing}`),
  };
}

export async function daemonIsUp(docker: string): Promise<boolean> {
  try {
    await run(docker, ["info", "--format", "{{.ServerVersion}}"], {
      timeout: 15_000,
      env: dockerEnv(docker),
    });
    return true;
  } catch {
    return false;
  }
}

export async function imageIsPresent(docker: string): Promise<boolean> {
  try {
    await run(docker, ["image", "inspect", DETECTOR_IMAGE], {
      timeout: 15_000,
      env: dockerEnv(docker),
    });
    return true;
  } catch {
    return false;
  }
}

/** Detached and unreferenced: the image is over a gigabyte and a Raycast command
 * must not sit waiting for it. */
export function startPull(docker: string): void {
  const child = spawn(docker, ["pull", DETECTOR_IMAGE], {
    detached: true,
    stdio: "ignore",
    env: dockerEnv(docker),
  });
  child.unref();
}

export async function startContainer(
  docker: string,
  patchPath: string,
): Promise<void> {
  const env = Object.entries(FLOORS).flatMap(([key, value]) => [
    "-e",
    `${key}=${value}`,
  ]);

  await run(
    docker,
    [
      "run",
      "-d",
      "--name",
      CONTAINER_NAME,
      "--restart",
      "unless-stopped",
      // Loopback only: /analyze is unauthenticated.
      "-p",
      `127.0.0.1:${CONTAINER_PORT}:${CONTAINER_PORT}`,
      "--read-only",
      "--tmpfs",
      "/tmp",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "-v",
      `${patchPath}:${PATCH_TARGET}:ro`,
      ...env,
      DETECTOR_IMAGE,
      "uvicorn",
      "detector.app:app",
      "--host",
      "0.0.0.0",
      "--port",
      String(CONTAINER_PORT),
    ],
    { timeout: 60_000, env: dockerEnv(docker) },
  );
}

export async function removeStoppedContainer(docker: string): Promise<void> {
  try {
    await run(docker, ["rm", "-f", CONTAINER_NAME], {
      timeout: 30_000,
      env: dockerEnv(docker),
    });
  } catch {
    // Nothing to remove is the normal case.
  }
}
