import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import {
  daemonIsUp,
  findDocker,
  imageIsPresent,
  readPullProgress,
  removeStoppedContainer,
  startContainer,
  startPull,
} from "./detector/docker";
import { loopbackPort } from "./detector/endpoint";
import { type RawPreferences, toSettings } from "./preferences";

const HEALTH_TIMEOUT_MS = 2000;
const READY_ATTEMPTS = 30;
const POLL_MS = 1000;
const IMAGE_SIZE = "1.3 GB";

type Key = "runtime" | "image" | "container";
type State = "waiting" | "busy" | "ok" | "fail";

interface Check {
  readonly key: Key;
  readonly title: string;
  readonly state: State;
  readonly status: string;
  readonly body: string;
  readonly facts: readonly (readonly [string, string])[];
}

const TITLES: Record<Key, string> = {
  runtime: "Container runtime",
  image: "Detector image",
  container: "Detector",
};

const RUNTIMES = "Docker Desktop, OrbStack, Rancher Desktop or colima";
const AGAIN = "then run Set up Detector again";
const DEGRADED =
  "Caviarde can still mask recognised patterns, including emails, phone numbers and IBANs.";
const NEEDED_FOR_LOCAL =
  "This image is only needed when Set up Detector starts a local detector.";

/** Empty where the status word already says everything: a row that works needs
 * no prose. Text appears only when something is left to do, and both paths to a
 * reachable detector say the same thing, because the result is the same. */
const TEXT = {
  checking: "",
  runtimeReady: "",
  runtimeMissing: `No supported container runtime was found.\n\nOpen or install ${RUNTIMES}, ${AGAIN}.`,
  runtimeStopped: `The container runtime is not responding.\n\nOpen it, ${AGAIN}.`,
  imageUncheckable:
    "The image can be checked once the container runtime is running.",
  imageReady: "",
  imagePreparing: "",
  imageForeign: NEEDED_FOR_LOCAL,
  imageAbsent: NEEDED_FOR_LOCAL,
  detectorStarting: "Waiting for the detector to respond.",
  detectorReady: "",
  detectorForeign: "",
  detectorNeedsRuntime: `A running container runtime is needed to start the detector.\n\n${DEGRADED}`,
  detectorUnmanageable: `This address cannot be managed by Set up Detector.\n\nFor automatic setup, set Detector URL to \`http://127.0.0.1:5002\`. Otherwise, start the detector yourself.\n\n${DEGRADED}`,
  detectorNeedsImage: `Download the detector image before starting the detector.\n\n${DEGRADED}`,
  detectorRefused: `The container could not start and the detector is not responding.\n\nCheck your container runtime, ${AGAIN}.\n\n${DEGRADED}`,
  detectorSilent: `The detector has not responded yet.\n\nWait a moment, ${AGAIN}.\n\n${DEGRADED}`,
} as const;

/** The reason docker gives is not interpolated: it is arbitrary text, and the
 * runtime already shows it in full. */
const DOWNLOAD_FAILED = `The image could not be downloaded. Check the error reported by your container runtime, ${AGAIN}.`;
const CONTINUES = "The download continues if this window is closed.";

const INITIAL: Check[] = (["runtime", "image", "container"] as const).map(
  (key) => ({
    key,
    title: TITLES[key],
    state: "waiting",
    status: "Checking",
    body: TEXT.checking,
    facts: [],
  }),
);

const COLOURS: Record<State, Color> = {
  waiting: Color.SecondaryText,
  busy: Color.Yellow,
  ok: Color.Green,
  fail: Color.Red,
};

const ICONS: Record<State, Icon> = {
  waiting: Icon.Circle,
  busy: Icon.CircleProgress50,
  ok: Icon.CheckCircle,
  fail: Icon.XMarkCircle,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The token goes out here too: a detector that also protects /health works
 * for masking while this screen would call it unreachable. */
async function detectorAnswers(
  baseUrl: string,
  authToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      headers:
        authToken.length > 0 ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return response.ok;
  } catch {
    return false;
  }
}

type Patch = Partial<Omit<Check, "key" | "title">>;
type Update = (key: Key, patch: Patch) => void;

/** Downloads the image, reporting progress, and answers whether it landed. */
async function pullImage(
  docker: string,
  update: Update,
  logPath: string,
): Promise<boolean> {
  const inFlight = readPullProgress(logPath);
  // A pull left running by an earlier window is followed rather than restarted.
  if (inFlight === null || inFlight.finished || inFlight.error !== null)
    startPull(docker, logPath);

  for (;;) {
    const progress = readPullProgress(logPath);

    if (progress?.error != null) {
      update("image", {
        state: "fail",
        status: "Download failed",
        body: DOWNLOAD_FAILED,
      });
      return false;
    }

    if (progress?.finished === true || (await imageIsPresent(docker)))
      return true;

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
        ["Size", IMAGE_SIZE],
      ],
    });
    await sleep(POLL_MS);
  }
}

async function run(update: Update, finish: () => void): Promise<void> {
  const settings = toSettings(getPreferenceValues<RawPreferences>());
  const url = settings.detectorUrl;
  const alreadyUp = await detectorAnswers(url, settings.authToken);
  const port = loopbackPort(url);
  const address: [string, string] = ["Address", url];

  // "Loopback only" is claimed only for a container this command published on
  // 127.0.0.1. For a detector that was already answering, nothing here has
  // verified where it listens.
  const managedFacts: [string, string][] = [
    address,
    ["Access", "Loopback only"],
  ];

  const docker = findDocker();
  if (docker === null) {
    update("runtime", {
      state: "fail",
      status: "Not found",
      body: TEXT.runtimeMissing,
    });
    update("image", {
      state: "waiting",
      status: "Not checked",
      body: TEXT.imageUncheckable,
    });
    update("container", {
      state: alreadyUp ? "ok" : "fail",
      status: alreadyUp ? "Running" : "Unavailable",
      body: alreadyUp
        ? TEXT.detectorForeign
        : port === null
          ? TEXT.detectorUnmanageable
          : TEXT.detectorNeedsRuntime,
      facts: [address],
    });
    finish();
    return;
  }

  const runtime: [string, string] = ["Binary", docker];
  if (!(await daemonIsUp(docker))) {
    update("runtime", {
      state: "fail",
      status: "Unavailable",
      body: TEXT.runtimeStopped,
      facts: [runtime],
    });
    update("image", {
      state: "waiting",
      status: "Not checked",
      body: TEXT.imageUncheckable,
    });
    update("container", {
      state: alreadyUp ? "ok" : "fail",
      status: alreadyUp ? "Running" : "Unavailable",
      body: alreadyUp
        ? TEXT.detectorForeign
        : port === null
          ? TEXT.detectorUnmanageable
          : TEXT.detectorNeedsRuntime,
      facts: [address],
    });
    finish();
    return;
  }
  update("runtime", {
    state: "ok",
    status: "Running",
    body: TEXT.runtimeReady,
    facts: [runtime],
  });

  const imageReady: Patch = {
    state: "ok",
    status: "Installed",
    body: TEXT.imageReady,
    facts: [["Size", IMAGE_SIZE]],
  };

  let onDisk = await imageIsPresent(docker);
  if (onDisk) {
    update("image", imageReady);
  } else if (alreadyUp) {
    // Something else is serving the port, so downloading would fix nothing.
    update("image", {
      state: "waiting",
      status: "Not installed",
      body: TEXT.imageForeign,
    });
  } else if (port === null) {
    update("image", {
      state: "waiting",
      status: "Not installed",
      body: TEXT.imageAbsent,
    });
  } else {
    const logPath = join(environment.supportPath, "pull.log");
    onDisk = await pullImage(docker, update, logPath);
    if (!onDisk) {
      update("container", {
        state: "fail",
        status: "Unavailable",
        body: TEXT.detectorNeedsImage,
        facts: [address],
      });
      finish();
      return;
    }
    update("image", imageReady);
  }

  if (alreadyUp) {
    update("container", {
      state: "ok",
      status: "Running",
      body: TEXT.detectorForeign,
      facts: [address],
    });
    finish();
    return;
  }

  if (port === null) {
    update("container", {
      state: "fail",
      status: "Unavailable",
      body: TEXT.detectorUnmanageable,
      facts: [address],
    });
    finish();
    return;
  }

  update("container", {
    state: "busy",
    status: "Starting",
    body: TEXT.detectorStarting,
    facts: managedFacts,
  });
  await removeStoppedContainer(docker);

  let refused = false;
  try {
    await startContainer(
      docker,
      join(environment.assetsPath, "detector-patch", "gliner_layer.py"),
      port,
    );
  } catch {
    refused = true;
  }

  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    if (await detectorAnswers(url, settings.authToken)) {
      update("container", {
        state: "ok",
        status: "Running",
        body: TEXT.detectorReady,
        facts: managedFacts,
      });
      finish();
      return;
    }
    // A refused start is only reported once the port has had a chance to
    // answer: something else may already be serving a detector there.
    if (refused && attempt >= 2) break;
    await sleep(2000);
  }

  update("container", {
    state: "fail",
    status: "Not responding",
    body: refused ? TEXT.detectorRefused : TEXT.detectorSilent,
    facts: managedFacts,
  });
  finish();
}

export default function SetUpDetector() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [selected, setSelected] = useState<string>("runtime");
  const [working, setWorking] = useState(true);
  const started = useRef(false);
  const followed = useRef<Key | null>(null);

  useEffect(() => {
    // React runs effects twice in development. Two concurrent runs race over
    // the same container name, and the loser reports a failure the winner has
    // already recovered from.
    if (started.current) return;
    started.current = true;

    const update: Update = (key, patch) => {
      setChecks((current) =>
        current.map((check) =>
          check.key === key ? { ...check, ...patch } : check,
        ),
      );
      // Only on a change of step: a download updates every second, and moving
      // the selection back would fight anyone reading another row.
      if (followed.current !== key) {
        followed.current = key;
        setSelected(key);
      }
    };

    void run(update, () => setWorking(false));
  }, []);

  return (
    <List
      isLoading={working}
      isShowingDetail
      navigationTitle="Set up Detector"
      searchBarPlaceholder="Setup status"
      selectedItemId={selected}
      onSelectionChange={(id) => {
        if (id !== null) setSelected(id);
      }}
    >
      {checks.map((check) => (
        <List.Item
          key={check.key}
          id={check.key}
          icon={{ source: ICONS[check.state], tintColor: COLOURS[check.state] }}
          title={check.title}
          accessories={[{ text: check.status }]}
          detail={
            <List.Item.Detail
              markdown={`## ${check.title}\n\n${check.body}`}
              metadata={
                check.facts.length === 0 ? undefined : (
                  <List.Item.Detail.Metadata>
                    {check.facts.map(([label, value]) => (
                      <List.Item.Detail.Metadata.Label
                        key={label}
                        title={label}
                        text={value}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                )
              }
            />
          }
        />
      ))}
    </List>
  );
}
