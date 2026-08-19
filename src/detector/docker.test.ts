import { describe, expect, it } from "vitest";
import {
  CONTAINER_NAME,
  CONTAINER_PORT,
  DETECTOR_IMAGE,
  DOCKER_CANDIDATES,
  DOCKER_HOME_CANDIDATES,
  FLOORS,
  PATCH_TARGET,
} from "./image";

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
      fs.readFile(new URL("../../compose.yaml", import.meta.url), "utf8"),
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
      fs.readFile(new URL("../../compose.yaml", import.meta.url), "utf8"),
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
