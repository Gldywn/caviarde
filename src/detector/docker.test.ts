import { execFile, spawnSync } from "node:child_process";
import {
  closeSync,
  openSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import {
  containerArgs,
  imageSize,
  pullIsAlive,
  readPullProgress,
  startPull,
} from "./docker";
import {
  CONTAINER_NAME,
  CONTAINER_PORT,
  DETECTOR_IMAGE,
  DOCKER_CANDIDATES,
  DOCKER_HOME_CANDIDATES,
  FLOORS,
  PATCH_TARGET,
} from "./image";

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  const { promisify } = await import("node:util");
  return {
    ...original,
    execFile: Object.assign(vi.fn(), { [promisify.custom]: vi.fn() }),
  };
});

describe("installed image size", () => {
  const run = vi.mocked(promisify(execFile));

  it("reads the pinned image size and displays decimal GB", async () => {
    run.mockResolvedValueOnce({ stdout: "2441234567\n", stderr: "" });
    expect(await imageSize("/usr/local/bin/docker")).toBe("2.44 GB");
    expect(run).toHaveBeenLastCalledWith(
      "/usr/local/bin/docker",
      ["image", "inspect", "--format", "{{.Size}}", DETECTOR_IMAGE],
      expect.objectContaining({ timeout: 15_000 }),
    );
  });

  it.each(["", "<no value>", "NaN", "-1", "1.5", "9007199254740992"])(
    "omits an invalid size %j",
    async (stdout) => {
      run.mockResolvedValueOnce({ stdout, stderr: "" });
      expect(await imageSize("/usr/local/bin/docker")).toBeNull();
    },
  );

  it("omits the size when inspection fails", async () => {
    run.mockRejectedValueOnce(new Error("Image unavailable"));
    expect(await imageSize("/usr/local/bin/docker")).toBeNull();
  });
});

describe("detector image", () => {
  it("is pinned by digest, never by tag", () => {
    expect(DETECTOR_IMAGE).toMatch(/@sha256:[0-9a-f]{64}$/);
    // Nothing before the "@" may carry a tag, which would make the pin mutable.
    expect(DETECTOR_IMAGE.split("@")[0]).not.toContain(":");
  });

  it("comes from the upstream registry rather than one we control", () => {
    expect(DETECTOR_IMAGE.startsWith("ghcr.io/sgasser/pasteguard@")).toBe(true);
  });

  it("matches the digest compose.yaml runs", async () => {
    const compose = await import("node:fs/promises").then((fs) =>
      fs.readFile("compose.yaml", "utf8"),
    );
    expect(compose).toContain(DETECTOR_IMAGE);
  });

  it("targets the interpreter path the pinned image actually uses", () => {
    expect(PATCH_TARGET).toBe(
      "/opt/venv/lib/python3.14/site-packages/detector/gliner_layer.py",
    );
  });

  it("sets the same thresholds as compose.yaml", async () => {
    const compose = await import("node:fs/promises").then((fs) =>
      fs.readFile("compose.yaml", "utf8"),
    );
    for (const [key, value] of Object.entries(FLOORS)) {
      expect(compose).toContain(`${key}: "${value}"`);
    }
  });

  it("publishes on the port the default preference points at", () => {
    expect(CONTAINER_PORT).toBe(5002);
  });

  it("names the container distinctly from the compose one", () => {
    expect(CONTAINER_NAME).toBe("caviarde-detector");
  });
});

describe("container arguments", () => {
  const args = containerArgs("/tmp/gliner_layer.py", CONTAINER_PORT);
  const pair = (flag: string) => args[args.indexOf(flag) + 1];

  it("publishes on loopback only, because /analyze is unauthenticated", () => {
    expect(pair("-p")).toBe(`127.0.0.1:${CONTAINER_PORT}:${CONTAINER_PORT}`);
  });

  // The setup command polls the address in the preference, so the container has
  // to bind that port rather than a fixed one.
  it("publishes on the port it is given, not on a fixed one", () => {
    const moved = containerArgs("/tmp/gliner_layer.py", 6000);
    expect(moved[moved.indexOf("-p") + 1]).toBe(
      `127.0.0.1:6000:${CONTAINER_PORT}`,
    );
  });

  it("drops every capability and forbids regaining privileges", () => {
    expect(pair("--cap-drop")).toBe("ALL");
    expect(pair("--security-opt")).toBe("no-new-privileges");
    expect(args).toContain("--read-only");
  });

  it("mounts the patch read-only", () => {
    expect(pair("-v")).toBe(`/tmp/gliner_layer.py:${PATCH_TARGET}:ro`);
  });

  it("runs the digest-pinned image, never a tag", () => {
    expect(args).toContain(DETECTOR_IMAGE);
  });

  // The inherited one probes a proxy on :3000 that this command never starts,
  // and --health-cmd cannot replace it: the CLI wraps it in /bin/sh, which the
  // image does not ship.
  it("disables the inherited healthcheck rather than inheriting a failing one", () => {
    expect(args).toContain("--no-healthcheck");
    expect(args).not.toContain("--health-cmd");
  });

  it("serves on the port the default preference points at", () => {
    expect(pair("--port")).toBe(String(CONTAINER_PORT));
  });

  it("passes the same thresholds compose.yaml sets", () => {
    for (const [key, value] of Object.entries(FLOORS)) {
      expect(args).toContain(`${key}=${value}`);
    }
  });
});

describe("docker discovery", () => {
  it("probes absolute paths only, never trusting PATH", () => {
    for (const candidate of DOCKER_CANDIDATES) {
      expect(candidate.startsWith("/")).toBe(true);
    }
  });

  it("probes home-relative paths without a leading slash, to be joined", () => {
    for (const candidate of DOCKER_HOME_CANDIDATES) {
      expect(candidate.startsWith("/")).toBe(false);
      expect(candidate.endsWith("/docker")).toBe(true);
    }
  });

  it("covers the runtimes the README names", () => {
    const all = [...DOCKER_CANDIDATES, ...DOCKER_HOME_CANDIDATES].join(" ");
    expect(all).toContain("Docker.app");
    expect(all).toContain(".orbstack");
    expect(all).toContain(".colima");
  });
});

describe("pull progress", () => {
  const write = async (body: string) => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const file = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), "cvd-")),
      "pull.log",
    );
    await fs.writeFile(file, body);
    return file;
  };

  it("returns null when no pull has ever started", () => {
    expect(readPullProgress("/nonexistent/pull.log")).toBeNull();
  });

  it("counts layers discovered and layers completed", async () => {
    const file = await write(
      [
        "latest: Pulling from sgasser/pasteguard",
        "95459497489f: Pulling fs layer",
        "0122664876c0: Pulling fs layer",
        "95459497489f: Download complete",
        "95459497489f: Pull complete",
      ].join("\n"),
    );
    expect(readPullProgress(file)).toEqual({
      layers: 2,
      done: 1,
      finished: false,
      error: null,
    });
  });

  it("counts a layer already on disk as done", async () => {
    const file = await write("95459497489f: Already exists");
    expect(readPullProgress(file)?.done).toBe(1);
  });

  it("keeps only the latest status of a layer", async () => {
    const file = await write(
      ["abc123456789: Downloading", "abc123456789: Verifying Checksum"].join(
        "\n",
      ),
    );
    expect(readPullProgress(file)).toMatchObject({ layers: 1, done: 0 });
  });

  it("sees the terminal Status line as finished", async () => {
    const file = await write(
      [
        "95459497489f: Pull complete",
        "Status: Downloaded newer image for x",
      ].join("\n"),
    );
    expect(readPullProgress(file)?.finished).toBe(true);
  });

  it("does not mistake the Digest line for a layer", async () => {
    const file = await write(
      "Digest: sha256:6baf43584bcb78f2e5847d1de515f23499913ac9f",
    );
    expect(readPullProgress(file)?.layers).toBe(0);
  });

  it("reports a failure the daemon wrote", async () => {
    const file = await write("Error response from daemon: manifest unknown");
    expect(readPullProgress(file)?.error).toContain("manifest unknown");
  });
});

describe("credential helper failure", () => {
  it("is reported, because it is how the first real pull actually failed", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const file = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), "cvd-")),
      "pull.log",
    );
    await fs.writeFile(
      file,
      'error getting credentials - err: exec: "docker-credential-osxkeychain": executable file not found in $PATH, out: ``',
    );
    expect(readPullProgress(file)?.error).toContain(
      "docker-credential-osxkeychain",
    );
  });
});

describe("pull liveness", () => {
  const journal = async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    return path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), "cvd-")),
      "pull.log",
    );
  };

  it("records the PID of the pull it starts", async () => {
    const log = await journal();
    // echo stands in for docker: it accepts the arguments and exits.
    startPull("/bin/echo", log);
    expect(readFileSync(`${log}.pid`, "utf8")).toMatch(/^[1-9]\d*$/);
  });

  it("keeps an older pull still writing the journal out of the new one", async () => {
    const log = await journal();
    const older = openSync(log, "w");
    startPull("/bin/echo", log);
    writeSync(older, "Error response from daemon: unexpected EOF\n");
    closeSync(older);
    expect(readPullProgress(log)?.error).toBeNull();
  });

  const ps = vi.mocked(promisify(execFile));
  const noSuchProcess = Object.assign(new Error("Command failed"), {
    code: 1,
  });
  const cannotRun = Object.assign(new Error("spawn /bin/ps EPERM"), {
    code: "EPERM",
  });

  it("asks ps for the state of the recorded PID", async () => {
    const log = await journal();
    writeFileSync(`${log}.pid`, "4242");
    ps.mockResolvedValueOnce({ stdout: "S\n", stderr: "" });
    expect(await pullIsAlive(log)).toBe(true);
    expect(ps).toHaveBeenLastCalledWith(
      "/bin/ps",
      ["-o", "stat=", "-p", "4242"],
      expect.objectContaining({ timeout: 5_000 }),
    );
  });

  it("reads an exited pull nobody reaped as dead, though signal 0 finds it", async () => {
    const log = await journal();
    writeFileSync(`${log}.pid`, String(process.pid));
    ps.mockResolvedValueOnce({ stdout: "  Z+ \n", stderr: "" });
    expect(await pullIsAlive(log)).toBe(false);
  });

  it("reads a pull whose process has exited as dead", async () => {
    const log = await journal();
    const exited = spawnSync("/usr/bin/true");
    expect(exited.error).toBeUndefined();
    expect(exited.status).toBe(0);
    expect(exited.pid).toBeGreaterThan(0);
    writeFileSync(`${log}.pid`, String(exited.pid));
    ps.mockRejectedValueOnce(noSuchProcess);
    expect(await pullIsAlive(log)).toBe(false);
  });

  it("falls back to signal 0 when ps cannot run, rather than calling the pull dead", async () => {
    const log = await journal();
    writeFileSync(`${log}.pid`, String(process.pid));
    ps.mockRejectedValueOnce(cannotRun);
    expect(await pullIsAlive(log)).toBe(true);
  });

  it("reads a process it may not signal as alive when ps cannot run", async () => {
    const log = await journal();
    writeFileSync(`${log}.pid`, String(process.pid));
    ps.mockRejectedValueOnce(cannotRun);
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("not permitted"), { code: "EPERM" });
    });
    try {
      expect(await pullIsAlive(log)).toBe(true);
    } finally {
      kill.mockRestore();
    }
  });

  it("reads a journal without a PID file as dead", async () => {
    expect(await pullIsAlive(await journal())).toBe(false);
  });

  it.each(["", "abc", "0", "-1", "1.5", "9007199254740993"])(
    "reads an invalid PID %j as dead",
    async (raw) => {
      const log = await journal();
      writeFileSync(`${log}.pid`, raw);
      expect(await pullIsAlive(log)).toBe(false);
    },
  );

  it("replaces an earlier PID when the spawn fails, rather than keeping it", async () => {
    const log = await journal();
    writeFileSync(`${log}.pid`, String(process.pid));
    startPull("/nonexistent/docker", log);
    expect(await pullIsAlive(log)).toBe(false);
  });
});
