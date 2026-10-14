import { join } from "node:path";
import type { Case } from "../cases";
import { readParquet } from "./parquet";
import { KIJI } from "./pins";
import {
  assertCovered,
  countInto,
  type LabelPolicy,
  type Loaded,
  toGold,
} from "./policy";

/** First names and surnames stay separate mentions: merging them across the
 * text between would invent a span nobody annotated. The card lists 26
 * labels; the data carries the 19 after `ORGANIZATION` as well. */
export const KIJI_POLICY: LabelPolicy = {
  FIRSTNAME: "PERSON",
  SURNAME: "PERSON",
  CITY: "LOCATION",
  STREET: "LOCATION",
  BUILDINGNUM: "LOCATION",
  ZIP: "LOCATION",
  STATE: "LOCATION",
  COUNTRY: "LOCATION",
  COMPANYNAME: "ORGANIZATION",
  EMAIL: "EMAIL",
  PHONENUMBER: "PHONE",
  IBAN: "IBAN",
  CREDITCARDNUMBER: "CARD",
  AGE: "ignore",
  DATEOFBIRTH: "ignore",
  DRIVERLICENSENUM: "ignore",
  IDCARDNUM: "ignore",
  LICENSEPLATENUM: "ignore",
  NATIONALID: "ignore",
  PASSPORTID: "ignore",
  PASSWORD: "ignore",
  SECURITYTOKEN: "ignore",
  SSN: "ignore",
  TAXNUM: "ignore",
  URL: "ignore",
  USERNAME: "ignore",
  ORGANIZATION: "ORGANIZATION",
  LOCATION: "LOCATION",
  BUILDNUM: "LOCATION",
  COLONY: "LOCATION",
  COUNTY: "LOCATION",
  PROVINCE: "LOCATION",
  REGION: "LOCATION",
  AREACODE: "ignore",
  DOMAIN: "ignore",
  KUNDENNUMMER: "ignore",
  MEDICARE: "ignore",
  MONTH: "ignore",
  NATIONALITY: "ignore",
  NHSNUMBER: "ignore",
  PERSONALAUSWEISNUMMER: "ignore",
  PERSONNUMMER: "ignore",
  REFERENCE_TITLE: "ignore",
  RUT: "ignore",
  TITLE: "ignore",
  YEAR: "ignore",
};

const LANGUAGES: Readonly<Record<string, string>> = {
  English: "en",
  French: "fr",
  German: "de",
  Spanish: "es",
  Dutch: "nl",
  Danish: "da",
};

/** hyparquet returns int64 columns as bigint. */
function integer(value: unknown): unknown {
  return typeof value === "bigint" ? Number(value) : value;
}

interface KijiMention {
  readonly value: string;
  readonly label: string;
  readonly start?: unknown;
  readonly end?: unknown;
}

export async function loadKiji(root: string): Promise<Loaded> {
  const cases: Case[] = [];
  const quarantined = new Map<string, number>();
  const excluded = new Map<string, number>();
  let total = 0;

  for (const file of KIJI.files) {
    const split = file.path.includes("train") ? "train" : "test";
    const rows = await readParquet(
      join(root, KIJI.name, file.path),
      file.sha256,
      ["text", "privacy_mask", "language"],
    );
    assertCovered(
      KIJI_POLICY,
      rows.flatMap((row) =>
        (row.privacy_mask as KijiMention[]).map((mention) => mention.label),
      ),
    );

    rows.forEach((row, index) => {
      total++;
      const text = row.text as string;
      const mentions = row.privacy_mask as KijiMention[];
      const language =
        LANGUAGES[row.language as string] ?? String(row.language);

      const gold = toGold(
        text,
        mentions.map((mention) => ({
          label: mention.label,
          start: integer(mention.start),
          end: integer(mention.end),
          value: mention.value,
        })),
        KIJI_POLICY,
        true,
      );
      if (!gold.ok) {
        countInto(quarantined, `${language}/${gold.reason}`);
        return;
      }
      for (const reason of gold.excluded) countInto(excluded, reason);
      const id = `kiji:${split}:${index}`;
      cases.push({
        id,
        source: KIJI.name,
        language,
        genre: "mixed",
        // No template key is published, so a record is its own group.
        group: id,
        text,
        mask: gold.mask,
        keep: [],
        ignore: gold.ignore,
      });
    });
  }

  return { cases, quarantined, excluded, total };
}
