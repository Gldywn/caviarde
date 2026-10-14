import {
  analyze,
  type DetectorConfig,
  type DetectorEntity,
} from "../detector/client";
import {
  ENTITY_TYPES,
  type EntityType,
  type SemanticSkipReason,
  type Span,
} from "./types";
import { isCardNumber } from "./validators/card";
import { isIbanValid } from "./validators/iban";
import { isNonIdentifyingIp } from "./validators/ip";

/** Past this the detector costs more than the hotkey is worth, so the layer is
 * skipped whole rather than truncated. */
export const SEMANTIC_MAX_CHARS = 6_000;

export interface SemanticOptions extends DetectorConfig {
  readonly phoneRegions: readonly string[];
  readonly maskPersons: boolean;
  readonly maskLocations: boolean;
  readonly maskOrganizations: boolean;
}

export type SemanticResult =
  | { readonly ok: true; readonly spans: readonly Span[] }
  | { readonly ok: false; readonly reason: SemanticSkipReason };

/** Types the detector does not know are left for the client to drop. */
function requestedTypes(options: SemanticOptions): EntityType[] {
  return ENTITY_TYPES.filter((type) => {
    if (type === "PERSON") return options.maskPersons;
    if (type === "LOCATION") return options.maskLocations;
    if (type === "ORGANIZATION") return options.maskOrganizations;
    return true;
  });
}

const VALIDATORS: Partial<
  Readonly<Record<EntityType, (value: string) => boolean>>
> = {
  CARD: isCardNumber,
  IBAN: isIbanValid,
  IP: (value) => !isNonIdentifyingIp(value),
};

function toSpan(entity: DetectorEntity, text: string): Span | null {
  if (
    entity.start < 0 ||
    entity.end > text.length ||
    entity.start >= entity.end
  )
    return null;

  // The detector's structured pass is checksum-only, so it reports a Luhn-valid
  // timestamp as a card. Its spans go through the same validators as the
  // deterministic layer, or enabling the model would undo identifier
  // preservation.
  const accepts = VALIDATORS[entity.type];
  if (accepts !== undefined && !accepts(text.slice(entity.start, entity.end)))
    return null;

  return { ...entity, layer: "semantic" };
}

/** Exported so the revalidation can be tested without reaching the detector. */
export function entitiesToSpans(
  entities: readonly DetectorEntity[],
  text: string,
): Span[] {
  return entities
    .map((entity) => toSpan(entity, text))
    .filter((span): span is Span => span !== null);
}

export async function detectSemantic(
  text: string,
  options: SemanticOptions,
): Promise<SemanticResult> {
  if (
    !options.maskPersons &&
    !options.maskLocations &&
    !options.maskOrganizations
  ) {
    return { ok: false, reason: "disabled" };
  }
  if (text.length > SEMANTIC_MAX_CHARS) {
    return { ok: false, reason: "too-large" };
  }

  const outcome = await analyze(
    {
      text,
      types: requestedTypes(options),
      phoneRegions: options.phoneRegions,
    },
    options,
  );

  if (!outcome.ok) return { ok: false, reason: outcome.reason };

  return { ok: true, spans: entitiesToSpans(outcome.entities, text) };
}
