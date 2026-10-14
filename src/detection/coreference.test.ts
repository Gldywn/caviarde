import { describe, expect, it } from "vitest";
import { propagateFirstNames } from "./coreference";
import type { EntityType, Span } from "./types";

function spanOf(
  text: string,
  value: string,
  type: EntityType = "PERSON",
): Span {
  const start = text.indexOf(value);
  return { type, start, end: start + value.length, layer: "semantic" };
}

describe("propagateFirstNames", () => {
  it("claims a lone first name the model scored too low to keep", () => {
    const text =
      "la demande de Camille entrainerait un surcout. Camille Rousseau confirme.";
    const found = propagateFirstNames(text, [spanOf(text, "Camille Rousseau")]);
    expect(found).toHaveLength(1);
    expect(text.slice(found[0]!.start, found[0]!.end)).toBe("Camille");
  });

  it("aliases the propagated span to the full name so both share a token", () => {
    const text = "Camille Rousseau ecrit. Camille relance.";
    const found = propagateFirstNames(text, [spanOf(text, "Camille Rousseau")]);
    expect(found[0]!.alias).toBe("Camille Rousseau");
  });

  it("does not re-claim the first name inside the full name it came from", () => {
    const text = "Camille Rousseau uniquement.";
    expect(
      propagateFirstNames(text, [spanOf(text, "Camille Rousseau")]),
    ).toEqual([]);
  });

  it("skips an occurrence already covered by another span", () => {
    const text = "Camille Rousseau et Camille Bernard.";
    const spans = [
      spanOf(text, "Camille Rousseau"),
      spanOf(text, "Camille Bernard"),
    ];
    expect(propagateFirstNames(text, spans)).toEqual([]);
  });

  it("is case sensitive, so a lowercase word is left alone", () => {
    const text = "Rose Martin aime une rose rouge.";
    expect(propagateFirstNames(text, [spanOf(text, "Rose Martin")])).toEqual(
      [],
    );
  });

  it("respects word boundaries", () => {
    const text = "Marc Dupont a valide le Marcheur.";
    expect(propagateFirstNames(text, [spanOf(text, "Marc Dupont")])).toEqual(
      [],
    );
  });

  it("ignores a particle or initial as a first name", () => {
    const text = "Le Gall puis Le autre chose.";
    expect(propagateFirstNames(text, [spanOf(text, "Le Gall")])).toEqual([]);
  });

  it("ignores a single-word person span", () => {
    const text = "Theo puis Theo encore.";
    expect(propagateFirstNames(text, [spanOf(text, "Theo")])).toEqual([]);
  });

  it("propagates every occurrence, not just the first", () => {
    const text = "Camille Rousseau. Camille puis Camille.";
    expect(
      propagateFirstNames(text, [spanOf(text, "Camille Rousseau")]),
    ).toHaveLength(2);
  });

  it("leaves a longer hyphenated first name to its own full name", () => {
    const text = "Jean Rousseau ecrit. Jean-Pierre relance.";
    expect(propagateFirstNames(text, [spanOf(text, "Jean Rousseau")])).toEqual(
      [],
    );
  });

  it("gives a lone hyphenated first name the token of its full name", () => {
    const text = "Jean Rousseau et Jean-Pierre Lefevre. Jean-Pierre relance.";
    const found = propagateFirstNames(text, [
      spanOf(text, "Jean Rousseau"),
      spanOf(text, "Jean-Pierre Lefevre"),
    ]);
    expect(found).toHaveLength(1);
    expect(text.slice(found[0]!.start, found[0]!.end)).toBe("Jean-Pierre");
    expect(found[0]!.alias).toBe("Jean-Pierre Lefevre");
  });

  it("still claims a first name after an elided article", () => {
    const text = "André Müller valide. Le dossier d'André avance.";
    const found = propagateFirstNames(text, [spanOf(text, "André Müller")]);
    expect(found.map((s) => text.slice(s.start, s.end))).toEqual(["André"]);
  });

  it("ignores non-person spans", () => {
    const text = "Acme Solutions et Acme.";
    expect(
      propagateFirstNames(text, [
        spanOf(text, "Acme Solutions", "ORGANIZATION"),
      ]),
    ).toEqual([]);
  });
});
