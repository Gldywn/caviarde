import { type Finder, simple } from "./finder";
import {
  findFrenchInternationalPhone,
  findFrenchPhone,
  findSiren,
  findSiret,
} from "./fr";
import type { Span } from "./types";
import { isCardNumber } from "./validators/card";
import { isIbanValid } from "./validators/iban";
import { isMaskableIpv4, isMaskableIpv6 } from "./validators/ip";

// Stop at the next marker so unclosed blocks cannot repeatedly scan the rest.
const PEM_BLOCK =
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----(?:(?!-----)[\s\S])+-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----/g;

const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

const API_KEY = new RegExp(
  [
    "\\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}",
    "\\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}",
    "\\bgh[pousr]_[A-Za-z0-9]{36}\\b",
    "\\b(?:AKIA|ASIA|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|APKA|AROA)[0-9A-Z]{16}\\b",
    "\\bxox[abpsr]-[A-Za-z0-9-]{10,}",
    "\\bAIza[0-9A-Za-z_-]{35}\\b",
  ].join("|"),
  "g",
);

const EMAIL =
  /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}_%+-]+(?:\.[\p{L}\p{N}_%+-]+)*@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,}(?![\p{L}\p{N}-])/gu;

/** An "@" before a capitalised word marks a person in a Notion or Slack thread.
 * The certainty is in the "@", not the word, so no model is involved. */
const MENTION =
  /(?<=@)\p{Lu}[\p{L}'’-]*(?:[ ](?:(?:de|du|des|van|von|da|di|del|dos|el|le|la)[ ])?\p{Lu}[\p{L}'’-]*){0,2}/gu;

const IPV6_CANDIDATE =
  /(?<![\w:.])[0-9A-Fa-f]{0,4}(?::[0-9A-Fa-f]{0,4}){2,7}(?![\w:.])/g;
const IPV4 = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?!\d)(?!\.\d)/g;

const IBAN_CANDIDATE =
  /(?<![A-Za-z0-9])[A-Za-z]{2}\d{2}(?:[ ]?[A-Za-z0-9]){11,30}(?![A-Za-z0-9])/g;

const CARD_CANDIDATE = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;

/** The bracketed group is a trunk zero, `+44 (0)20`, or an area code, `+1 (234)`. */
const PHONE_INTERNATIONAL =
  /(?<![\d+])\+\d{1,3}(?:[ .\u00a0\u202f-]?\(\d{1,4}\))?(?:[ .\u00a0\u202f-]?\d){6,14}(?!\d)/g;

const SIGNED_AMOUNT =
  /\+\d{1,3}(?:[ .\u00a0\u202f]\d{3})+(?:[.,]\d{1,2}(?!\d)|[ \u00a0\u202f]?[\u20ac$\u00a3%])/y;

/** `+1 234 567,89 EUR`: a sign, groups of three and a decimal part or a currency sign make an
 * amount. The whole run is judged after matching, so no shorter phone is tried in its place. */
function withoutAmounts(find: Finder): Finder {
  return (text) =>
    find(text).filter(({ start, end }) => {
      SIGNED_AMOUNT.lastIndex = start;
      const amount = SIGNED_AMOUNT.exec(text);
      return amount === null || amount[0].length < end - start;
    });
}

/** `(234) 567-8901` in North America, `(11) 91234-5678` for a Brazilian mobile. The brackets
 * and the fixed grouping are the anchor: a bare digit run is as likely an order number, and a
 * Brazilian landline, four digits and four, is written like a year or page range. A letter
 * after the digits makes a reference, except the `x` of a glued extension, `x204`. */
const PHONE_AREA_CODE =
  /(?<![\p{L}\p{N}_])\((?:\d{3}\)[ \u00a0\u202f]?\d{3}[-.]|\d{2}\)[ \u00a0\u202f]?9\d{4}-)\d{4}(?:(?=[xX]\d)|(?![\p{L}\p{N}_]))/gu;

/** `020-1234567`, `030/12345678`. A zero-padded reference has a second zero, and no
 * subscriber number starts with one, so neither position may hold a zero. */
const PHONE_TRUNK_ZERO =
  /(?<![\p{L}\p{N}_/.-])0[1-9]\d{0,3}[-/][1-9]\d{2}[ \u00a0\u202f]?\d{3,5}(?:(?=[xX]\d)|(?![\p{L}\p{N}_/-]))/gu;

function hasNationalLength(match: string): boolean {
  const digits = match.replace(/\D/g, "").length;
  return digits === 10 || digits === 11;
}

/** The candidate can run past the IBAN into prose, so trailing tokens are trimmed
 * off until what remains validates. */
const findIban: Finder = (text) => {
  const found: Span[] = [];
  for (const match of text.matchAll(IBAN_CANDIDATE)) {
    if (match.index === undefined) continue;
    const tokens = match[0].split(" ");
    while (tokens.length > 0) {
      const candidate = tokens.join(" ");
      if (isIbanValid(candidate)) {
        found.push({
          type: "IBAN",
          start: match.index,
          end: match.index + candidate.length,
          layer: "deterministic",
        });
        break;
      }
      tokens.pop();
    }
  }
  return found;
};

/** Priority order: a later finder never claims a range an earlier one took. A leading +
 * is a phone whatever its digits pass; a SIRET passes the card check and starts with a SIREN. */
const FINDERS: readonly Finder[] = [
  simple("PRIVATE_KEY", PEM_BLOCK),
  simple("JWT", JWT),
  simple("API_KEY", API_KEY),
  simple("EMAIL", EMAIL),
  simple("PERSON", MENTION),
  simple("IP", IPV6_CANDIDATE, isMaskableIpv6),
  simple("IP", IPV4, isMaskableIpv4),
  findIban,
  withoutAmounts(findFrenchInternationalPhone),
  withoutAmounts(simple("PHONE", PHONE_INTERNATIONAL)),
  findSiret,
  findSiren,
  simple("CARD", CARD_CANDIDATE, isCardNumber),
  findFrenchPhone,
  simple("PHONE", PHONE_AREA_CODE),
  simple("PHONE", PHONE_TRUNK_ZERO, hasNationalLength),
];

export function detectDeterministic(text: string): Span[] {
  if (text.length === 0) return [];

  const accepted: Span[] = [];
  for (const find of FINDERS) {
    for (const span of find(text)) {
      const clashes = accepted.some(
        (kept) => span.start < kept.end && kept.start < span.end,
      );
      if (!clashes) accepted.push(span);
    }
  }

  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
