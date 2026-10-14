import { join } from "node:path";
import { isIbanValid } from "../../src/detection/validators/iban";
import { type Case, HarnessError } from "../cases";
import { readPinned } from "./fetch";
import { REDACT } from "./pins";
import {
  assertCovered,
  countInto,
  type LabelPolicy,
  type Loaded,
  toGold,
} from "./policy";

/** Every one of REDACT's 51 labels, so a new one fails loudly. Tax ids are not
 * all VAT numbers and passwords are not API keys, hence "ignore". */
export const REDACT_POLICY: LabelPolicy = {
  Full_Name: "PERSON",
  First_Given_Name: "PERSON",
  Last_Family_Name: "PERSON",
  Preferred_Name: "PERSON",
  Personal_Email_Address: "EMAIL",
  Work_Email_Address: "EMAIL",
  Telephone_Numbers_Personal: "PHONE",
  Telephone_Numbers_Work: "PHONE",
  Static_IP_Address: "IP",
  Credit_Card_Numbers: "CARD",
  Org_Name: "ORGANIZATION",
  Address_Personal: "LOCATION",
  Address_Work: "LOCATION",
  City: "LOCATION",
  Location: "LOCATION",
  State: "LOCATION",
  Country_of_Residence: "LOCATION",
  Place_of_Birth: "LOCATION",
  // Labels a bank account in general; only a valid IBAN is one of our types.
  Account_Statements: (value) => (isIbanValid(value) ? "IBAN" : "ignore"),
  Age: "ignore",
  Allergy_Information: "ignore",
  Building_Badge_Card_Number: "ignore",
  Business_Title: "ignore",
  Citizenship_Status: "ignore",
  Compensation_and_Salary: "ignore",
  Crime: "ignore",
  Customer_Reference_Number: "ignore",
  Date_Time: "ignore",
  Date_of_Birth: "ignore",
  Disciplinary_Action: "ignore",
  Driving_License_Number: "ignore",
  Emergency_Contact_Details: "ignore",
  Employee_ID_Number: "ignore",
  Gender: "ignore",
  Geolocation_Data: "ignore",
  Marital_Status: "ignore",
  Medical_Information: "ignore",
  National_Identification_Number: "ignore",
  Nationality: "ignore",
  PEP_Status: "ignore",
  Passport_Number: "ignore",
  Password: "ignore",
  Performance_Assessment: "ignore",
  Political_Party: "ignore",
  Professional_Background: "ignore",
  Religion: "ignore",
  Sex_Orientation: "ignore",
  Sickness_Day_Records: "ignore",
  Social_Media_Identifiers: "ignore",
  Tax_Reference_Number: "ignore",
  Trade_Union_Membership: "ignore",
};

interface RedactEntity {
  readonly entity_type: string;
  readonly entity_string: string;
  readonly start: unknown;
  readonly end: unknown;
  readonly disclosed: boolean;
  readonly disclosure_form: string;
}

interface RedactRecord {
  readonly record_id: number | string;
  readonly text: string;
  readonly target_pattern_id: string;
  readonly axes: { readonly language: string; readonly format: string };
  readonly entities: readonly RedactEntity[];
}

/** An evaluation exclusion, not a claim that masking these is wrong or that
 * they are safe: hypotheticals and templates are not disclosures, and
 * obfuscated forms are left out. Partial forms stay in scope. */
function outOfScope(entity: RedactEntity): string | undefined {
  if (!entity.disclosed) return "REDACT disclosed:false";
  if (entity.disclosure_form === "obfuscated") return "REDACT obfuscated";
  return undefined;
}

export async function loadRedact(root: string): Promise<Loaded> {
  const data = await readPinned(
    join(root, REDACT.name, REDACT.data),
    REDACT.sha256,
  );
  let records: RedactRecord[];
  try {
    records = JSON.parse(data.toString("utf8")) as RedactRecord[];
  } catch {
    // The parser's own message may quote the data.
    throw new HarnessError("REDACT data is not valid JSON");
  }
  assertCovered(
    REDACT_POLICY,
    records.flatMap((record) => record.entities.map((e) => e.entity_type)),
  );

  const cases: Case[] = [];
  const quarantined = new Map<string, number>();
  const excluded = new Map<string, number>();

  for (const record of records) {
    const language = record.axes.language.toLowerCase();
    const gold = toGold(
      record.text,
      record.entities.map((entity) => ({
        label: entity.entity_type,
        start: entity.start,
        end: entity.end,
        value: entity.entity_string,
        ignore: outOfScope(entity),
      })),
      REDACT_POLICY,
      true,
    );
    if (!gold.ok) {
      countInto(quarantined, `${language}/${gold.reason}`);
      continue;
    }
    for (const reason of gold.excluded) countInto(excluded, reason);
    cases.push({
      id: `redact:${record.record_id}`,
      source: REDACT.name,
      language,
      genre: record.axes.format,
      // Records generated for one target pattern are near-duplicates.
      group: `pattern:${record.target_pattern_id}`,
      text: record.text,
      mask: gold.mask,
      keep: [],
      ignore: gold.ignore,
    });
  }

  return { cases, quarantined, excluded, total: records.length };
}
