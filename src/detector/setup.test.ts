import { describe, expect, it, vi } from "vitest";
import type { PullProgress } from "./docker";
import { type Key, runSetup, type SetupDeps, type Step } from "./setup";

const DOCKER = "/usr/local/bin/docker";
const MANAGED = "http://127.0.0.1:6001";
const PATHS = {
  pullLog: "/support/pull.log",
  patch: "/assets/gliner_layer.py",
};

const journal = (patch: Partial<PullProgress> = {}): PullProgress => ({
  layers: 2,
  done: 1,
  finished: false,
  error: null,
  ...patch,
});

/** A machine where everything works and the detector comes up on the first
 * probe after the container starts; each test breaks one thing. */
function setup(url: string, overrides: Partial<SetupDeps> = {}) {
  const rows: Record<Key, Partial<Step>> = {
    runtime: {},
    image: {},
    container: {},
  };
  let probes = 0;
  const deps = {
    findDocker: vi.fn(() => DOCKER),
    daemonIsUp: vi.fn(async () => true),
    imageIsPresent: vi.fn(async () => true),
    imageSize: vi.fn(async () => "2.44 GB"),
    startPull: vi.fn(),
    readPullProgress: vi.fn((): PullProgress | null => null),
    pullIsAlive: vi.fn(async () => true),
    removeStoppedContainer: vi.fn(async () => {}),
    startContainer: vi.fn(async () => {}),
    answers: vi.fn(async () => probes++ > 0),
    // Yields to the event loop, so a polling loop that never ends fails on the
    // test timeout instead of starving the worker.
    sleep: vi.fn(() => new Promise<void>((resolve) => setImmediate(resolve))),
    ...overrides,
  };
  const patches: [Key, Partial<Step>][] = [];
  const run = () =>
    runSetup(url, PATHS, deps, (key, patch) => {
      patches.push([key, patch]);
      rows[key] = { ...rows[key], ...patch };
    });
  return { rows, patches, deps, run };
}

const LOOPBACK = ["Access", "Loopback only"];

describe("setup without a container runtime", () => {
  it("reports a missing runtime, with no binary to show", async () => {
    const { rows, run } = setup(MANAGED, {
      findDocker: () => null,
      answers: async () => false,
    });
    await run();
    expect(rows.runtime).toMatchObject({ state: "fail", status: "Not found" });
    expect(rows.runtime.facts).toBeUndefined();
    expect(rows.image).toMatchObject({
      state: "waiting",
      status: "Not checked",
    });
    expect(rows.container).toMatchObject({
      state: "fail",
      status: "Unavailable",
      facts: [["Address", MANAGED]],
    });
    expect(rows.container.body).toContain("container runtime is needed");
  });

  it("reports a stopped daemon with the binary it found", async () => {
    const { rows, run } = setup(MANAGED, {
      daemonIsUp: async () => false,
      answers: async () => false,
    });
    await run();
    expect(rows.runtime).toMatchObject({
      state: "fail",
      status: "Unavailable",
      facts: [["Binary", DOCKER]],
    });
    expect(rows.container.body).toContain("container runtime is needed");
  });

  it("still reports a detector that already answers, without claiming loopback", async () => {
    const { rows, run } = setup(MANAGED, {
      findDocker: () => null,
      answers: async () => true,
    });
    await run();
    expect(rows.container).toMatchObject({
      state: "ok",
      status: "Running",
      facts: [["Address", MANAGED]],
    });
  });

  it("says an unmanageable address cannot be set up", async () => {
    const { rows, run } = setup("https://detector.example", {
      daemonIsUp: async () => false,
      answers: async () => false,
    });
    await run();
    expect(rows.container.body).toContain("cannot be managed");
  });
});

describe("setup with the image installed", () => {
  it("starts the container on the port the preference names", async () => {
    const { rows, deps, run } = setup(MANAGED);
    await run();
    expect(rows.runtime).toMatchObject({
      state: "ok",
      facts: [["Binary", DOCKER]],
    });
    expect(rows.image).toMatchObject({
      state: "ok",
      status: "Installed",
      facts: [["Size", "2.44 GB"]],
    });
    expect(deps.removeStoppedContainer).toHaveBeenCalledWith(DOCKER);
    expect(deps.startContainer).toHaveBeenCalledWith(DOCKER, PATHS.patch, 6001);
    expect(rows.container).toMatchObject({
      state: "ok",
      status: "Running",
      facts: [["Address", MANAGED], LOOPBACK],
    });
    expect(deps.startPull).not.toHaveBeenCalled();
  });

  it("leaves a detector that already answers alone", async () => {
    const { rows, deps, run } = setup(MANAGED, { answers: async () => true });
    await run();
    expect(deps.startContainer).not.toHaveBeenCalled();
    expect(rows.container).toMatchObject({
      state: "ok",
      facts: [["Address", MANAGED]],
    });
  });

  it("starts nothing for an address it cannot manage", async () => {
    const { rows, deps, run } = setup("http://localhost:5002", {
      answers: async () => false,
    });
    await run();
    expect(deps.startContainer).not.toHaveBeenCalled();
    expect(rows.container).toMatchObject({
      state: "fail",
      status: "Unavailable",
    });
    expect(rows.container.body).toContain("cannot be managed");
  });

  it("gives a normal start thirty probes, two seconds apart", async () => {
    const { rows, deps, run } = setup(MANAGED, {
      answers: vi.fn(async () => false),
    });
    await run();
    expect(deps.answers).toHaveBeenCalledTimes(1 + 30);
    expect(vi.mocked(deps.sleep).mock.calls).toEqual(Array(30).fill([2000]));
    expect(rows.container).toMatchObject({
      state: "fail",
      status: "Not responding",
      facts: [["Address", MANAGED], LOOPBACK],
    });
    expect(rows.container.body).toContain("has not responded yet");
  });

  it("gives a refused start three probes before reporting it", async () => {
    const { rows, deps, run } = setup(MANAGED, {
      answers: vi.fn(async () => false),
      startContainer: async () => {
        throw new Error("port is already allocated");
      },
    });
    await run();
    expect(deps.answers).toHaveBeenCalledTimes(1 + 3);
    expect(rows.container.body).toContain("could not start");
  });

  it("accepts a refused start when the port answers anyway", async () => {
    const { rows, run } = setup(MANAGED, {
      startContainer: async () => {
        throw new Error("Conflict");
      },
    });
    await run();
    expect(rows.container).toMatchObject({ state: "ok", status: "Running" });
  });
});

describe("setup without the image", () => {
  it("does not download for a detector that already answers", async () => {
    const { rows, deps, run } = setup(MANAGED, {
      imageIsPresent: async () => false,
      answers: async () => true,
    });
    await run();
    expect(deps.startPull).not.toHaveBeenCalled();
    expect(rows.image).toMatchObject({
      state: "waiting",
      status: "Not installed",
    });
    expect(rows.container).toMatchObject({ state: "ok" });
  });

  it("does not download for an address it cannot manage", async () => {
    const { rows, deps, run } = setup("http://127.0.0.1:5002/v1", {
      imageIsPresent: async () => false,
      answers: async () => false,
    });
    await run();
    expect(deps.startPull).not.toHaveBeenCalled();
    expect(rows.image).toMatchObject({
      state: "waiting",
      status: "Not installed",
    });
  });
});

describe("image download", () => {
  /** The image lands once the journal says so. */
  function downloading(
    overrides: Partial<SetupDeps>,
    present: () => boolean = () => false,
  ) {
    return setup(MANAGED, {
      imageIsPresent: vi.fn(async () => present()),
      ...overrides,
    });
  }

  it("starts a pull when none was ever started, then starts the detector", async () => {
    const reads = [
      null,
      journal(),
      journal({ done: 2 }),
      journal({ finished: true }),
    ];
    const { rows, deps, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
    });
    await run();
    expect(deps.startPull).toHaveBeenCalledOnce();
    expect(deps.startPull).toHaveBeenCalledWith(DOCKER, PATHS.pullLog);
    expect(deps.sleep).toHaveBeenCalledWith(1000);
    expect(rows.image).toMatchObject({ state: "ok", status: "Installed" });
    expect(rows.container).toMatchObject({ state: "ok", status: "Running" });
  });

  it("shows completed layers while the pull runs", async () => {
    const reads = [journal(), journal(), journal({ finished: true })];
    const { patches, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
    });
    await run();
    expect(patches).toContainEqual([
      "image",
      {
        state: "busy",
        status: "Downloading",
        body: "The download continues if this window is closed.",
        facts: [["Layers", "1 of 2 complete"]],
      },
    ]);
  });

  it("follows a pull an earlier window left running instead of restarting it", async () => {
    const reads = [journal(), journal(), journal({ finished: true })];
    const { deps, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
    });
    await run();
    expect(deps.startPull).not.toHaveBeenCalled();
  });

  it("restarts a pull that died unfinished before this window opened", async () => {
    const reads = [journal(), journal({ finished: true })];
    const alive = [false, true];
    const { rows, deps, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
      pullIsAlive: async () => alive.shift() ?? true,
    });
    await run();
    expect(deps.startPull).toHaveBeenCalledOnce();
    expect(rows.image).toMatchObject({ state: "ok" });
  });

  it("reports a pull that dies while followed, without restarting it", async () => {
    const alive = [true, true, false];
    const { rows, deps, run } = downloading({
      readPullProgress: () => journal(),
      pullIsAlive: async () => alive.shift() ?? false,
    });
    await run();
    expect(deps.startPull).not.toHaveBeenCalled();
    expect(rows.image).toMatchObject({
      state: "fail",
      status: "Download failed",
      facts: [["Layers", "1 of 2 complete"]],
    });
    expect(rows.image.body).toContain("stopped before it finished");
    expect(rows.container).toMatchObject({
      state: "fail",
      status: "Unavailable",
    });
    expect(rows.container.body).toContain("image is unavailable");
    expect(deps.startContainer).not.toHaveBeenCalled();
  });

  it("reports a pull whose spawn left no live process", async () => {
    const reads = [null, journal({ layers: 0, done: 0 })];
    const { rows, deps, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
      pullIsAlive: async () => false,
    });
    await run();
    expect(deps.startPull).toHaveBeenCalledOnce();
    expect(rows.image.body).toContain("stopped before it finished");
  });

  it("checks liveness before the journal, so a pull exiting between them succeeds", async () => {
    let exited = false;
    let reads = 0;
    const { rows, run } = downloading({
      // The pull writes its Status line and exits right after the first poll
      // has read the journal.
      readPullProgress: () => {
        const progress = exited ? journal({ finished: true }) : journal();
        if (++reads === 2) exited = true;
        return progress;
      },
      pullIsAlive: async () => !exited,
    });
    await run();
    expect(rows.image).toMatchObject({ state: "ok", status: "Installed" });
  });

  it("takes a dead pull whose journal finished as a success", async () => {
    const reads = [journal(), journal({ finished: true })];
    const alive = [true, false];
    const { rows, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
      pullIsAlive: async () => alive.shift() ?? false,
    });
    await run();
    expect(rows.image).toMatchObject({ state: "ok", status: "Installed" });
  });

  it("takes a dead pull whose image is on disk as a success", async () => {
    let checks = 0;
    const alive = [true, false];
    const { rows, run } = downloading(
      {
        readPullProgress: () => journal(),
        pullIsAlive: async () => alive.shift() ?? false,
      },
      () => checks++ > 0,
    );
    await run();
    expect(rows.image).toMatchObject({ state: "ok", status: "Installed" });
  });

  it("reports the error line docker wrote, even beside a Status line", async () => {
    const reads = [
      journal(),
      journal({
        finished: true,
        error: "Error response from daemon: manifest unknown",
      }),
    ];
    const { rows, deps, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
      pullIsAlive: async () => false,
    });
    await run();
    expect(rows.image).toMatchObject({
      state: "fail",
      status: "Download failed",
    });
    expect(rows.image.body).toContain("Check the error reported");
    expect(deps.startContainer).not.toHaveBeenCalled();
  });

  it("restarts a pull whose journal ended in an error", async () => {
    const reads = [
      journal({ error: "Error: denied" }),
      journal({ finished: true }),
    ];
    const { deps, run } = downloading({
      readPullProgress: () => reads.shift() ?? null,
    });
    await run();
    expect(deps.startPull).toHaveBeenCalledOnce();
  });
});
