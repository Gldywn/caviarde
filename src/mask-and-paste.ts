import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { maskText } from "./mask-text";
import { toSettings } from "./preferences";
import { buildSummary } from "./summary";

/** Pasting more than this into a chat is not the use case, and it keeps a
 * pathological clipboard from stalling the command. */
const MAX_INPUT_CHARS = 1_000_000;

export default async function maskAndPaste(): Promise<void> {
  let text: string;
  try {
    text = (await Clipboard.readText()) ?? "";
  } catch {
    await showHUD("Could not read the clipboard");
    return;
  }

  if (text.trim().length === 0) {
    await showHUD("No text to paste");
    return;
  }
  if (text.length > MAX_INPUT_CHARS) {
    await showHUD("Text too long to mask. Copy a smaller selection");
    return;
  }

  const settings = toSettings(getPreferenceValues<Preferences.MaskAndPaste>());

  const { masked, counts, semanticSkipped } = await maskText(text, {
    baseUrl: settings.detectorUrl,
    timeoutMs: settings.detectorTimeoutMs,
    authToken: settings.authToken,
    phoneRegions: settings.phoneRegions,
    maskPersons: settings.maskPersons,
    maskLocations: settings.maskLocations,
    maskOrganizations: settings.maskOrganizations,
  });

  try {
    await Clipboard.paste(masked);
  } catch {
    await showHUD("Could not paste the masked text");
    return;
  }

  await showHUD(buildSummary(counts, semanticSkipped !== null));
}
