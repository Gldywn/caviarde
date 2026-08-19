import { environment, getPreferenceValues, showHUD } from "@raycast/api";
import { join } from "node:path";
import {
  daemonIsUp,
  findDocker,
  imageIsPresent,
  removeStoppedContainer,
  startContainer,
  startPull,
} from "./detector/docker";
import { type RawPreferences, toSettings } from "./preferences";

const HEALTH_TIMEOUT_MS = 2000;
const READY_ATTEMPTS = 30;
const READY_INTERVAL_MS = 2000;

async function detectorAnswers(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitUntilReady(baseUrl: string): Promise<boolean> {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    if (await detectorAnswers(baseUrl)) return true;
    await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
  }
  return false;
}

export default async function setUpDetector(): Promise<void> {
  const settings = toSettings(getPreferenceValues<RawPreferences>());

  if (await detectorAnswers(settings.detectorUrl)) {
    await showHUD("Detector already running");
    return;
  }

  const docker = findDocker();
  if (docker === null) {
    await showHUD(
      "No container runtime found. Install Docker Desktop, OrbStack or colima",
    );
    return;
  }

  if (!(await daemonIsUp(docker))) {
    await showHUD(
      "Container runtime is installed but not running. Start it, then try again",
    );
    return;
  }

  if (!(await imageIsPresent(docker))) {
    startPull(docker);
    await showHUD(
      "Downloading the detector, about 1.3 GB. Run this command again once it lands",
    );
    return;
  }

  await removeStoppedContainer(docker);

  try {
    await startContainer(
      docker,
      join(environment.assetsPath, "detector-patch", "gliner_layer.py"),
    );
  } catch {
    await showHUD("Could not start the detector. Check that port 5002 is free");
    return;
  }

  await showHUD("Detector starting, loading the model");

  if (await waitUntilReady(settings.detectorUrl)) {
    await showHUD(
      "Detector ready. Names, places and companies are now masked too",
    );
  } else {
    await showHUD(
      "Detector started but did not answer in time. It may still be loading",
    );
  }
}
