import { type Finder, simple } from "./finder";
import type { Span } from "./types";
import { isSirenValid, isSiretValid } from "./validators/french-business";

const SIRET_CANDIDATE = /(?<!\d)\d{3}[ ]?\d{3}[ ]?\d{3}[ ]?\d{5}(?!\d)/g;
const SIREN_CANDIDATE = /(?<!\d)\d{3}[ ]?\d{3}[ ]?\d{3}(?!\d)/g;
/** A random 9-digit number passes Luhn one time in ten, and documents are full of them. */
const SIREN_CONTEXT =
  /(?:siren|siret|rcs|immatricul|greffe)[^\p{L}\p{N}]{0,12}$/iu;
const SIREN_CONTEXT_WINDOW = 32;

const PHONE_FRENCH = /(?<![\d+])0[1-9](?:[ .-]?\d{2}){4}(?!\d)/g;

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

export const findSiret = simple("SIRET", SIRET_CANDIDATE, (m) =>
  isSiretValid(digitsOf(m)),
);

export const findSiren: Finder = (text) => {
  const found: Span[] = [];
  for (const match of text.matchAll(SIREN_CANDIDATE)) {
    if (match.index === undefined) continue;
    if (!isSirenValid(digitsOf(match[0]))) continue;

    const before = text.slice(
      Math.max(0, match.index - SIREN_CONTEXT_WINDOW),
      match.index,
    );
    const spaced = match[0].includes(" ");
    if (!spaced && !SIREN_CONTEXT.test(before)) continue;

    found.push({
      type: "SIREN",
      start: match.index,
      end: match.index + match[0].length,
      layer: "deterministic",
    });
  }
  return found;
};

export const findFrenchPhone = simple("PHONE", PHONE_FRENCH);
