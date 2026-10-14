import {
  Action,
  ActionPanel,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { useEffect, useRef, useState } from "react";
import {
  daemonIsUp,
  findDocker,
  imageIsPresent,
  imageSize,
  pullIsAlive,
  readPullProgress,
  removeStoppedContainer,
  startContainer,
  startPull,
} from "./detector/docker";
import {
  CONTAINER_NAME,
  DETECTOR_IMAGE,
  DOCKER_CANDIDATES,
  DOCKER_HOME_CANDIDATES,
} from "./detector/image";
import {
  type Key,
  runSetup,
  type State,
  type Step,
  type Update,
} from "./detector/setup";
import { toSettings } from "./preferences";

const HEALTH_TIMEOUT_MS = 2000;

interface Check extends Step {
  readonly key: Key;
  readonly title: string;
}

const TITLES: Record<Key, string> = {
  runtime: "Container runtime",
  image: "Detector image",
  container: "Detector",
};

const [IMAGE_REPOSITORY, IMAGE_DIGEST] = DETECTOR_IMAGE.split("@sha256:");
const DETAIL_HELP: Record<Key, string> = {
  runtime: `### Container runtime lookup

The **first executable found** in this order is used. A successful \`docker info\` check confirms that the runtime responds.

${[...DOCKER_CANDIDATES, ...DOCKER_HOME_CANDIDATES.map((path) => `~/${path}`)]
  .map((path, index) => `${index + 1}. \`${path}\``)
  .join("\n")}

\`~\` is the home directory.`,
  image:
    "### Detector image policy\n\nThe local setup image is **pinned by digest** in the source code and is **not updated automatically**. Its details are below.",
  container: "",
};

const INITIAL: Check[] = (["runtime", "image", "container"] as const).map(
  (key) => ({
    key,
    title: TITLES[key],
    state: "waiting",
    status: "Checking",
    body: "",
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

const FACT_ICONS: Record<string, Icon> = {
  Address: Icon.Link,
  Access: Icon.Shield,
  Binary: Icon.Cog,
  Layers: Icon.Layers,
  Size: Icon.HardDrive,
};

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

export default function SetUpDetector() {
  const [settings] = useState(() =>
    toSettings(getPreferenceValues<Preferences.SetupDetector>()),
  );
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

    void runSetup(
      settings.detectorUrl,
      {
        pullLog: join(environment.supportPath, "pull.log"),
        patch: join(
          environment.assetsPath,
          "detector-patch",
          "gliner_layer.py",
        ),
      },
      {
        findDocker,
        daemonIsUp,
        imageIsPresent,
        imageSize,
        startPull,
        readPullProgress,
        pullIsAlive,
        removeStoppedContainer,
        startContainer,
        answers: () =>
          detectorAnswers(settings.detectorUrl, settings.authToken),
        sleep,
      },
      update,
    ).then(() => setWorking(false));
  }, [settings]);

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
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              {check.key === "container" && (
                <Action.CopyToClipboard
                  title="Copy Address"
                  content={settings.detectorUrl}
                />
              )}
              {check.key === "image" && (
                <Action.CopyToClipboard
                  title="Copy Image Reference"
                  content={DETECTOR_IMAGE}
                />
              )}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={
                [check.body, DETAIL_HELP[check.key]]
                  .filter(Boolean)
                  .join("\n\n") || undefined
              }
              metadata={
                check.facts.length === 0 &&
                check.key === "runtime" ? undefined : (
                  <List.Item.Detail.Metadata>
                    {check.facts.map(([label, value]) => (
                      <List.Item.Detail.Metadata.Label
                        key={label}
                        title={label}
                        text={value}
                        icon={FACT_ICONS[label]}
                      />
                    ))}
                    {check.key === "image" && (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Image"
                          text={IMAGE_REPOSITORY}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="SHA-256"
                          text={IMAGE_DIGEST}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Setup container"
                          text={CONTAINER_NAME}
                        />
                      </>
                    )}
                    {check.key === "container" && (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Detector Timeout (ms)"
                          text={String(settings.detectorTimeoutMs)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Auth Token"
                          text={
                            settings.authToken.length > 0 ? "Set" : "Not set"
                          }
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Phone Regions"
                          text={settings.phoneRegions.join(", ") || "None"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Mask person names"
                          text={settings.maskPersons ? "Enabled" : "Disabled"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Mask locations and addresses"
                          text={settings.maskLocations ? "Enabled" : "Disabled"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Mask company and organisation names"
                          text={
                            settings.maskOrganizations ? "Enabled" : "Disabled"
                          }
                        />
                      </>
                    )}
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
