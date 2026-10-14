import { join } from "node:path";
import type { Case } from "../cases";
import { readParquet } from "./parquet";
import { GRETEL } from "./pins";
import {
  assertCovered,
  countInto,
  type LabelPolicy,
  type Loaded,
  toGold,
} from "./policy";

/** A BBAN is not an IBAN and a customer id is a technical identifier, so both
 * are ignored rather than counted as leaks. */
export const GRETEL_POLICY: LabelPolicy = {
  name: "PERSON",
  first_name: "PERSON",
  last_name: "PERSON",
  company: "ORGANIZATION",
  street_address: "LOCATION",
  email: "EMAIL",
  phone_number: "PHONE",
  iban: "IBAN",
  credit_card_number: "CARD",
  ipv4: "IP",
  ipv6: "IP",
  api_key: "API_KEY",
  account_pin: "ignore",
  bank_routing_number: "ignore",
  bban: "ignore",
  credit_card_security_code: "ignore",
  customer_id: "ignore",
  date: "ignore",
  date_of_birth: "ignore",
  date_time: "ignore",
  driver_license_number: "ignore",
  employee_id: "ignore",
  local_latlng: "ignore",
  passport_number: "ignore",
  password: "ignore",
  ssn: "ignore",
  swift_bic_code: "ignore",
  time: "ignore",
  user_name: "ignore",
};

const LANGUAGES: Readonly<Record<string, string>> = {
  English: "en",
  France: "fr",
  German: "de",
  Spanish: "es",
  Italian: "it",
  Dutch: "nl",
  Swedish: "sv",
};

interface GretelSpan {
  readonly start: unknown;
  readonly end: unknown;
  readonly label: string;
}

export async function loadGretel(root: string): Promise<Loaded> {
  const cases: Case[] = [];
  const quarantined = new Map<string, number>();
  const excluded = new Map<string, number>();
  let total = 0;

  for (const file of GRETEL.files) {
    const split = file.path.includes("train") ? "train" : "test";
    const rows = await readParquet(
      join(root, GRETEL.name, file.path),
      file.sha256,
      [
        "document_type",
        "expanded_type",
        "language",
        "generated_text",
        "pii_spans",
      ],
    );
    const parsed = rows.map((row) => {
      try {
        const spans: unknown = JSON.parse(row.pii_spans as string);
        return Array.isArray(spans) ? (spans as GretelSpan[]) : null;
      } catch {
        return null;
      }
    });
    assertCovered(
      GRETEL_POLICY,
      parsed.flatMap((spans) => (spans ?? []).map((span) => span.label)),
    );

    rows.forEach((row, index) => {
      total++;
      const text = row.generated_text as string;
      const language =
        LANGUAGES[row.language as string] ?? String(row.language);
      const spans = parsed[index];
      if (!spans) {
        countInto(quarantined, `${language}/unparseable`);
        return;
      }

      // No surface string is published, so only bounds and blank spans can
      // be checked; the offsets are taken as Python's code points.
      const gold = toGold(
        text,
        spans.map((span) => ({
          label: span.label,
          start: span.start,
          end: span.end,
        })),
        GRETEL_POLICY,
        true,
      );
      if (!gold.ok) {
        countInto(quarantined, `${language}/${gold.reason}`);
        return;
      }
      for (const reason of gold.excluded) countInto(excluded, reason);
      const documentType = String(row.document_type);
      cases.push({
        id: `gretel:${split}:${index}`,
        source: GRETEL.name,
        language,
        genre: documentType,
        // Documents prompted by one descriptor are near-duplicates.
        group: `descriptor:${documentType}/${String(row.expanded_type)}`,
        text,
        mask: gold.mask,
        keep: [],
        ignore: gold.ignore,
      });
    });
  }

  return { cases, quarantined, excluded, total };
}
