import type * as docker from "./docker";
import { loopbackPort } from "./endpoint";

const READY_ATTEMPTS = 30;
const READY_POLL_MS = 2000;
const PULL_POLL_MS = 1000;

export type Key = "runtime" | "image" | "container";
export type State = "waiting" | "busy" | "ok" | "fail";

export interface Step {
  readonly state: State;
  readonly status: string;
  readonly body: string;
  readonly facts: readonly (readonly [string, string])[];
}

export type Update = (key: Key, patch: Partial<Step>) => void;

export type SetupDeps = Pick<
  typeof docker,
  | "findDocker"
  | "daemonIsUp"
  | "imageIsPresent"
  | "imageSize"
  | "startPull"
  | "readPullProgress"
  | "pullIsAlive"
  | "removeStoppedContainer"
  | "startContainer"
> & {
  /** Whether the detector at the configured address answers its health probe. */
  answers(): Promise<boolean>;
  sleep(ms: number): Promise<void>;
};

export interface SetupPaths {
  readonly pullLog: string;
  readonly patch: string;
}

const RUNTIMES = "Docker Desktop, OrbStack, Rancher Desktop or colima";
const AGAIN = "then run Set up Detector again";
const DEGRADED =
  "Caviarde can still mask recognised patterns, including emails, phone numbers and IBANs.";
const NEEDED_FOR_LOCAL =
  "This image is only needed when Set up Detector starts a local detector.";

const TEXT = {
  runtimeMissing: `**No supported container runtime was found.**\n\nOpen or install ${RUNTIMES}, ${AGAIN}.`,
  runtimeStopped: `**The container runtime is not responding.**\n\nOpen it, ${AGAIN}.`,
  imageUncheckable:
    "The image can be checked once the container runtime is running.",
  detectorStarting: "Waiting for the detector to respond.",
  detectorReady:
    "### Detector ready\n\n**The detector is responding.** Copy some text and run Mask and Paste to try it.\n\nMake sure you've assigned a keyboard shortcut to Mask and Paste. Use **Open Preferences** to adjust Caviarde's settings.",
  detectorNeedsRuntime: `**A running container runtime is needed to start the detector.**\n\n${DEGRADED}`,
  detectorUnmanageable: `**This address cannot be managed by Set up Detector.**\n\nFor automatic setup, set Detector URL to \`http://127.0.0.1:5002\`. Otherwise, start the detector yourself.\n\n${DEGRADED}`,
  detectorNeedsImage: `**The detector image is unavailable.**\n\nDownload the detector image before starting the detector.\n\n${DEGRADED}`,
  detectorRefused: `**The container could not start and the detector is not responding.**\n\nCheck your container runtime, ${AGAIN}.\n\n${DEGRADED}`,
  detectorSilent: `**The detector has not responded yet.**\n\nWait a moment, ${AGAIN}.\n\n${DEGRADED}`,
} as const;

/** The reason docker gives is not interpolated: it is arbitrary text, and the
 * runtime already shows it in full. */
const DOWNLOAD_FAILED = `**The image could not be downloaded.**\n\nCheck the error reported by your container runtime, ${AGAIN}.`;
const DOWNLOAD_STOPPED =
  "**The download stopped before it finished.**\n\nRun Set up Detector again to restart it.";
const CONTINUES = "The download continues if this window is closed.";

/** Downloads the image, reporting progress, and answers whether it landed. */
async function pullImage(
  dockerPath: string,
  logPath: string,
  deps: SetupDeps,
  update: Update,
): Promise<boolean> {
  const journal = deps.readPullProgress(logPath);
  // A pull left running by an earlier window is followed rather than restarted.
  // One that died unfinished is restarted here, which is the retry the
  // failure below asks for.
  if (
    journal === null ||
    journal.finished ||
    journal.error !== null ||
    !deps.pullIsAlive(logPath)
  )
    deps.startPull(dockerPath, logPath);

  for (;;) {
    // Checked before the journal is read, so a pull found dead has already
    // written its last line and a normal exit is never mistaken for a crash.
    const alive = deps.pullIsAlive(logPath);
    const progress = deps.readPullProgress(logPath);

    if (progress?.error != null) {
      update("image", {
        state: "fail",
        status: "Download failed",
        body: DOWNLOAD_FAILED,
      });
      return false;
    }

    if (progress?.finished === true || (await deps.imageIsPresent(dockerPath)))
      return true;

    // Reported rather than restarted, so a pull that keeps dying cannot loop.
    if (!alive) {
      update("image", {
        state: "fail",
        status: "Download failed",
        body: DOWNLOAD_STOPPED,
      });
      return false;
    }

    const layers = progress?.layers ?? 0;
    const done = progress?.done ?? 0;
    // One representation of progress, not three. Completed layers are not a
    // share of the bytes, so a bar and a percentage would both overstate it.
    update("image", {
      state: "busy",
      status: "Downloading",
      body: CONTINUES,
      facts: [
        ["Layers", layers === 0 ? "Checking" : `${done} of ${layers} complete`],
      ],
    });
    await deps.sleep(PULL_POLL_MS);
  }
}

export async function runSetup(
  detectorUrl: string,
  paths: SetupPaths,
  deps: SetupDeps,
  update: Update,
): Promise<void> {
  const alreadyUp = await deps.answers();
  const port = loopbackPort(detectorUrl);
  const address = ["Address", detectorUrl] as const;

  // "Loopback only" is claimed only for a container this command published on
  // 127.0.0.1. For a detector that was already answering, nothing here has
  // verified where it listens.
  const managedFacts = [address, ["Access", "Loopback only"] as const];

  const running = (facts: Step["facts"]): Partial<Step> => ({
    state: "ok",
    status: "Running",
    body: TEXT.detectorReady,
    facts,
  });
  const unavailable = (body: string): Partial<Step> => ({
    state: "fail",
    status: "Unavailable",
    body,
    facts: [address],
  });

  const withoutRuntime = (runtime: Partial<Step>) => {
    update("runtime", { state: "fail", ...runtime });
    update("image", {
      state: "waiting",
      status: "Not checked",
      body: TEXT.imageUncheckable,
    });
    update(
      "container",
      alreadyUp
        ? running([address])
        : unavailable(
            port === null
              ? TEXT.detectorUnmanageable
              : TEXT.detectorNeedsRuntime,
          ),
    );
  };

  const dockerPath = deps.findDocker();
  if (dockerPath === null) {
    withoutRuntime({ status: "Not found", body: TEXT.runtimeMissing });
    return;
  }

  const binary = ["Binary", dockerPath] as const;
  if (!(await deps.daemonIsUp(dockerPath))) {
    withoutRuntime({
      status: "Unavailable",
      body: TEXT.runtimeStopped,
      facts: [binary],
    });
    return;
  }
  update("runtime", {
    state: "ok",
    status: "Running",
    body: "",
    facts: [binary],
  });

  const imageReady = async () => {
    const size = await deps.imageSize(dockerPath);
    update("image", {
      state: "ok",
      status: "Installed",
      body: "",
      facts: size === null ? [] : [["Size", size]],
    });
  };

  if (await deps.imageIsPresent(dockerPath)) {
    await imageReady();
  } else if (alreadyUp || port === null) {
    // Downloading would fix nothing: something else serves the port, or the
    // address is one this command does not manage.
    update("image", {
      state: "waiting",
      status: "Not installed",
      body: NEEDED_FOR_LOCAL,
    });
  } else {
    if (!(await pullImage(dockerPath, paths.pullLog, deps, update))) {
      update("container", unavailable(TEXT.detectorNeedsImage));
      return;
    }
    await imageReady();
  }

  if (alreadyUp) {
    update("container", running([address]));
    return;
  }

  if (port === null) {
    update("container", unavailable(TEXT.detectorUnmanageable));
    return;
  }

  update("container", {
    state: "busy",
    status: "Starting",
    body: TEXT.detectorStarting,
    facts: managedFacts,
  });
  await deps.removeStoppedContainer(dockerPath);

  let refused = false;
  try {
    await deps.startContainer(dockerPath, paths.patch, port);
  } catch {
    refused = true;
  }

  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    if (await deps.answers()) {
      update("container", running(managedFacts));
      return;
    }
    // A refused start is only reported once the port has had a chance to
    // answer: something else may already be serving a detector there.
    if (refused && attempt >= 2) break;
    await deps.sleep(READY_POLL_MS);
  }

  update("container", {
    state: "fail",
    status: "Not responding",
    body: refused ? TEXT.detectorRefused : TEXT.detectorSilent,
    facts: managedFacts,
  });
}
