import { type Case, parseMarkup } from "./cases";

/** What the public sets do not test. Everything is invented, from the cast in
 * AGENTS.md. Secret-shaped fixtures stay in src/**\/*.test.ts, the only path
 * excluded from secret scanning. */
interface HomeCase {
  readonly id: string;
  readonly language: string;
  /** "local" cases need no detector and must pass exactly, in CI. */
  readonly layer: "local" | "detector";
  readonly note: string;
  /** Every `{{...}}` here passes Luhn, so its survival proves the guard and
   * not an accident of the check digit. */
  readonly luhn?: true;
  readonly markup: string;
}

const FILLER = "Le module plante au lancement depuis la mise a jour. ";

/** Markup whose parsed text is exactly `total` UTF-16 units long. */
function sized(total: number, tail: string): string {
  const room = total - parseMarkup(tail).text.length;
  return FILLER.repeat(Math.ceil(room / FILLER.length)).slice(0, room) + tail;
}

const HOME: readonly HomeCase[] = [
  // Technical identifiers, formerly src/detection/identifiers.fixture.ts.
  {
    id: "uuid-v4",
    language: "en",
    layer: "local",
    note: "UUID v4",
    markup: "user_id: {{550e8400-e29b-41d4-a716-446655440000}}",
  },
  {
    id: "uuid-uppercase",
    language: "en",
    layer: "local",
    note: "UUID in uppercase",
    markup: "REF {{550E8400-E29B-41D4-A716-446655440000}}",
  },
  {
    id: "mongo-objectid",
    language: "en",
    layer: "local",
    note: "Mongo ObjectId",
    markup: "doc {{507f1f77bcf86cd799439011}}",
  },
  {
    id: "ulid",
    language: "en",
    layer: "local",
    note: "ULID",
    markup: "id {{01ARZ3NDEKTSV4RRFFQ69G5FAV}}",
  },
  {
    id: "nanoid",
    language: "en",
    layer: "local",
    note: "nanoid",
    markup: "token {{V1StGXR8_Z5jdHi6B-myT}}",
  },
  {
    id: "prefixed-customer-id",
    language: "en",
    layer: "local",
    note: "prefixed customer id",
    markup: "customer {{cus_NffrFeUfNV2Hib}}",
  },
  {
    id: "prefixed-org-id",
    language: "en",
    layer: "local",
    note: "prefixed organisation id",
    markup: "{{org_2NNEqL2nrIRdJ194ndJqAHwEfxC}}",
  },
  {
    id: "prefixed-user-id",
    language: "en",
    layer: "local",
    note: "prefixed user id",
    markup: "{{usr_01H8XGJWBWBAQ4ZG7HPQ2M4KDN}}",
  },
  {
    id: "numeric-user-id",
    language: "en",
    layer: "local",
    note: "bare nine-digit user id that is a valid SIREN by checksum",
    luhn: true,
    markup: "user_id={{123456782}}",
  },
  {
    id: "numeric-company-id",
    language: "en",
    layer: "local",
    note: "bare nine-digit company id that is a valid SIREN by checksum",
    luhn: true,
    markup: "company_id: {{123456782}}",
  },
  {
    id: "order-number",
    language: "fr",
    layer: "local",
    note: "dashed order number",
    markup: "commande {{2024-00184722}}",
  },
  {
    id: "ticket-ref",
    language: "en",
    layer: "local",
    note: "ticket reference",
    markup: "ticket {{#4821}}",
  },
  {
    id: "epoch-ms",
    language: "en",
    layer: "local",
    note: "epoch milliseconds",
    markup: "ts {{1735689600000}}",
  },
  {
    id: "epoch-ms-luhn",
    language: "en",
    layer: "local",
    note: "epoch milliseconds that pass Luhn, once reported as a card",
    luhn: true,
    markup: "ts {{1735689600005}}",
  },
  {
    id: "order-number-luhn",
    language: "fr",
    layer: "local",
    note: "sixteen-digit order number that passes Luhn with no issuer prefix",
    luhn: true,
    markup: "commande {{1234567890123452}}",
  },
  {
    id: "git-sha",
    language: "en",
    layer: "local",
    note: "git commit SHA",
    markup: "commit {{9f2a1c4e8b7d3f6a0c5e2b8d4f7a1c3e6b9d0f2a}}",
  },
  {
    id: "semver",
    language: "en",
    layer: "local",
    note: "semantic version",
    markup: "version {{1.104.24}}",
  },
  {
    id: "loopback-port",
    language: "en",
    layer: "local",
    note: "loopback address with port, once reported by the detector",
    markup: "listening on {{127.0.0.1:5002}}",
  },
  {
    id: "loopback-v6",
    language: "en",
    layer: "local",
    note: "IPv6 loopback",
    markup: "bound to {{::1}}",
  },
  {
    id: "link-local",
    language: "en",
    layer: "local",
    note: "link-local address",
    markup: "self-assigned {{169.254.12.7}}",
  },
  {
    id: "unspecified",
    language: "en",
    layer: "local",
    note: "unspecified address with port",
    markup: "bind {{0.0.0.0:3000}}",
  },
  {
    id: "k8s-pod",
    language: "en",
    layer: "local",
    note: "Kubernetes pod name",
    markup: "pod {{api-worker-7d9f8b6c5d-x4k2p}}",
  },
  {
    id: "stripe-object-id",
    language: "en",
    layer: "local",
    note: "Stripe-like object id",
    markup: "charge {{ch_3OqLKJ2eZvKYlo2C1gFJqXyZ}}",
  },
  {
    id: "long-numeric-id",
    language: "en",
    layer: "local",
    note: "sixteen-digit external id",
    markup: "external_id {{9007199254740991}}",
  },
  {
    id: "trace-id",
    language: "en",
    layer: "local",
    note: "hex trace id with dashes",
    markup: "trace {{4bf92f35-77b3-4da6-a3ce-929d0e0e4736}}",
  },
  {
    id: "debug-ticket",
    language: "fr",
    layer: "local",
    note: "identifiers survive next to a private address that is masked",
    markup:
      "Erreur 500 sur {{GET /api/orders/507f1f77bcf86cd799439011}} depuis [[IP:10.42.0.7]], " +
      "en local sur {{127.0.0.1:5002}} ca passe. Commit {{9f2a1c4e}}.",
  },

  // SIREN and SIRET: a checksum alone never qualifies a bare number.
  {
    id: "siren-keyword",
    language: "fr",
    layer: "local",
    note: "SIREN introduced by its keyword",
    markup: "SIREN [[SIREN:123456782]] a verifier",
  },
  {
    id: "siren-rcs",
    language: "fr",
    layer: "local",
    note: "SIREN right after an RCS keyword",
    markup: "N° RCS : [[SIREN:123456782]]",
  },
  {
    id: "siren-spaced",
    language: "fr",
    layer: "local",
    note: "spaced SIREN with no keyword",
    markup: "la societe [[SIREN:123 456 782]] nous a repondu",
  },
  {
    id: "siren-bare",
    language: "fr",
    layer: "local",
    note: "bare Luhn-valid nine digits without keyword stay an order number",
    luhn: true,
    markup: "commande {{123456782}} expediee hier",
  },
  {
    id: "siret-keyword",
    language: "fr",
    layer: "local",
    note: "SIRET after its keyword, not reported as a card",
    markup: "SIRET [[SIRET:12345678200010]]",
  },
  {
    id: "siret-bare",
    language: "fr",
    layer: "local",
    note: "bare SIRET, which the detector would call a card",
    markup: "Etablissement [[SIRET:12345678200010]] ferme le lundi",
  },
  {
    id: "siret-spaced",
    language: "fr",
    layer: "local",
    note: "spaced SIRET",
    markup: "SIRET : [[SIRET:123 456 782 00010]]",
  },

  // Mentions and the lone first name that follows.
  {
    id: "mention-then-first-name",
    language: "fr",
    layer: "local",
    note: "@mention, then the lone first name later in the text",
    markup:
      "@[[PERSON#a:Camille Rousseau]] peux-tu relire ? Sinon [[PERSON#a:Camille]] verra lundi.",
  },
  {
    id: "first-name-before-mention",
    language: "fr",
    layer: "local",
    note: "lone first name before the mention that anchors it",
    markup:
      "[[PERSON#a:Marie]] valide demain. @[[PERSON#a:Marie Dubois]] a relu.",
  },
  {
    id: "two-people-one-first-name",
    language: "fr",
    layer: "local",
    note: "two people share a first name; the lone one is masked once",
    markup:
      "@[[PERSON#a:Camille Rousseau]] et @[[PERSON#b:Camille Bernard]]. [[PERSON:Camille]] valide.",
  },
  {
    id: "mention-lowercase-particle",
    language: "fr",
    layer: "local",
    note: "lowercase particle inside a mention",
    markup:
      "@[[PERSON#a:Marie de Bourbon]] a repondu, [[PERSON#a:Marie]] relance mardi.",
  },
  {
    id: "mention-capitalised-particle",
    language: "fr",
    layer: "local",
    note: "capitalised particle inside a mention",
    markup: "@[[PERSON:Marie Le Gall]] c'est OK pour moi",
  },
  {
    id: "mention-hyphenated",
    language: "fr",
    layer: "local",
    note: "hyphenated first name in a mention, then alone",
    markup:
      "@[[PERSON#a:Jean-Pierre Lefevre]] confirme. [[PERSON#a:Jean-Pierre]] envoie le devis.",
  },
  {
    id: "mention-not-a-word",
    language: "fr",
    layer: "local",
    note: "a lowercase word equal to the first name is left alone",
    markup:
      "@[[PERSON#a:Rose Martin]] aime la rose. [[PERSON#a:Rose]] confirme.",
  },
  {
    id: "mention-here",
    language: "fr",
    layer: "local",
    note: "a lowercase handle such as @here is not a person",
    markup: "@here merci de relire avant midi",
  },
  {
    id: "mention-en",
    language: "en",
    layer: "local",
    note: "English mention, then the lone first name",
    markup:
      "@[[PERSON#a:Emily Clarke]] can you check the export? Thanks [[PERSON#a:Emily]].",
  },
  {
    id: "mention-de",
    language: "de",
    layer: "local",
    note: "German mention with an umlaut and the lone first name",
    markup:
      "@[[PERSON#a:Jonas Becker]] bitte pruefen, [[PERSON#a:Jonas]] hat den Fehler gesehen. Gruss, @[[PERSON:André Müller]]",
  },
  {
    id: "mention-de-von",
    language: "de",
    layer: "local",
    note: "German particle von",
    markup: "@[[PERSON:Lena von Schneider]] hat das Ticket geschlossen.",
  },
  {
    id: "mention-es",
    language: "es",
    layer: "local",
    note: "Spanish accented names",
    markup:
      "@[[PERSON#a:Lucía Fernández]] revisa el pedido, [[PERSON#a:Lucía]] lo aprueba.",
  },
  {
    id: "mention-pt-dos",
    language: "pt",
    layer: "local",
    note: "Portuguese particle dos",
    markup:
      "@[[PERSON#a:João dos Santos]] pode verificar? O [[PERSON#a:João]] responde amanhã.",
  },
  {
    id: "mention-it-di",
    language: "it",
    layer: "local",
    note: "Italian particle di",
    markup: "@[[PERSON:Giulia di Romano]] ha chiuso la richiesta.",
  },
  {
    id: "mention-nl-de",
    language: "nl",
    layer: "local",
    note: "Dutch particle de",
    markup:
      "@[[PERSON#a:Sanne de Vries]] kun je dit bekijken? [[PERSON#a:Sanne]] weet het.",
  },

  // Names inside emails: the email wins whole, and a lowercase name inside it
  // is not propagated.
  {
    id: "email-holds-name",
    language: "fr",
    layer: "local",
    note: "first name of the mention also appears inside an email",
    markup:
      "@[[PERSON#a:Marie Dubois]] ecrit depuis [[EMAIL:marie.dubois@acme-solutions.fr]], [[PERSON#a:Marie]] attend.",
  },
  {
    id: "email-accented",
    language: "fr",
    layer: "local",
    note: "accented local part caught in full",
    markup: "ecrire a [[EMAIL:andré.müller@acme-solutions.fr]] stp",
  },
  {
    id: "email-trailing-period",
    language: "en",
    layer: "local",
    note: "email before a sentence-ending period",
    markup: "Contact: [[EMAIL:emily.clarke@acme-logistik.de]].",
  },

  // Structured values in several languages.
  {
    id: "phone-fr-national",
    language: "fr",
    layer: "local",
    note: "French national format, spaced and dotted",
    markup: "tel [[PHONE:06 12 34 56 78]] ou [[PHONE:01.23.45.67.89]]",
  },
  {
    id: "phone-international",
    language: "en",
    layer: "local",
    note: "international formats",
    markup: "call [[PHONE:+44 20 1234 5678]] or [[PHONE:+49 30 12345678]]",
  },
  {
    id: "phone-international-siren-tail",
    language: "es",
    layer: "local",
    note: "international number whose last nine digits are a valid spaced SIREN",
    markup: "llamar al [[PHONE:+34 123 456 782]] por la tarde",
  },
  {
    id: "phone-international-card-digits",
    language: "pt",
    layer: "local",
    note: "international number whose digits pass the card check",
    markup: "ligar para [[PHONE:+55 11 91234-5676]] amanhã",
  },
  {
    id: "iban-spaced",
    language: "fr",
    layer: "local",
    note: "spaced IBAN followed by prose",
    markup: "IBAN [[IBAN:FR76 3000 6000 0112 3456 7890 189]] merci",
  },
  {
    id: "iban-documentation-examples",
    language: "nl",
    layer: "local",
    note: "documentation example IBANs from several countries",
    markup:
      "Rekening [[IBAN:NL91ABNA0417164300]], Konto [[IBAN:DE89370400440532013000]], cuenta [[IBAN:ES9121000418450200051332]].",
  },
  {
    id: "card-spaced",
    language: "en",
    layer: "local",
    note: "spaced test card number",
    markup: "card [[CARD:4111 1111 1111 1111]] declined",
  },
  {
    id: "ip-private",
    language: "en",
    layer: "local",
    note: "private range is masked, loopback is not",
    markup: "prod on [[IP:10.42.0.7]], local on {{127.0.0.1}}",
  },

  // Text with nothing to mask.
  {
    id: "clean-fr",
    language: "fr",
    layer: "local",
    note: "no personal data",
    markup: "Le module plante au lancement depuis la mise a jour.",
  },
  {
    id: "clean-en-log",
    language: "en",
    layer: "local",
    note: "log line with no personal data",
    markup:
      "2026-10-14T09:12:44Z WARN retry 3/5 after timeout (2500 ms) on queue billing-events",
  },
  {
    id: "clean-de",
    language: "de",
    layer: "local",
    note: "no personal data",
    markup: "Der Export bricht nach dem Update mit einem Speicherfehler ab.",
  },
  {
    id: "clean-numbers",
    language: "fr",
    layer: "local",
    note: "amounts, dates and times that resemble identifiers",
    markup:
      "Montant 1 234,56 EUR le 14/10/2026 a 10:30:00, delai 48 h, version 3.2.",
  },

  // Offsets past astral characters, and the size cap of the semantic layer.
  {
    id: "astral-before-spans",
    language: "fr",
    layer: "local",
    note: "emoji, two UTF-16 units each, before every masked span",
    markup:
      "🙂 Ecrire a [[EMAIL:marie.dubois@acme-solutions.fr]] 📞 [[PHONE:06 12 34 56 78]] 👉 @[[PERSON:Camille Rousseau]]",
  },
  {
    id: "size-over-cap",
    language: "fr",
    layer: "local",
    note: "6,001 UTF-16 units: the detector is skipped, the email is still masked",
    markup: sized(
      6_001,
      "\nEcrire a [[EMAIL:marie.dubois@acme-solutions.fr]] pour la suite.",
    ),
  },

  // Cases that need the detector.
  {
    id: "detector-astral",
    language: "fr",
    layer: "detector",
    note: "detector offsets after an emoji",
    markup:
      "🙂 Bonjour, je suis [[PERSON:Marie Dubois]] du bureau de [[LOCATION:Villeurbanne]].",
  },
  {
    id: "detector-at-cap",
    language: "fr",
    layer: "detector",
    note: "exactly 6,000 UTF-16 units, a name at the very end",
    markup: sized(
      6_000,
      "\nBonjour, je suis [[PERSON:Marie Dubois]] du bureau de [[LOCATION:Villeurbanne]].",
    ),
  },
  {
    id: "detector-names-place",
    language: "fr",
    layer: "detector",
    note: "full names in prose and a city",
    markup:
      "Bonjour, je suis [[PERSON:Marie Dubois]] du bureau de [[LOCATION:Villeurbanne]]. " +
      "Mon collegue [[PERSON:Jean-Pierre Lefevre]] confirme le probleme.",
  },
  {
    id: "detector-organisations",
    language: "fr",
    layer: "detector",
    note: "company names, which the detector patch adds",
    markup:
      "[[PERSON:Marie Dubois]], responsable chez [[ORGANIZATION:Acme Solutions SARL]], signale que " +
      "la synchronisation avec [[ORGANIZATION:Boulangerie Martin]] echoue.",
  },
  {
    id: "detector-ticket",
    language: "fr",
    layer: "detector",
    note: "a whole ticket, with the first name propagated from a prose name",
    markup:
      "[[PERSON#a:Marie Dubois]] signale un souci. Contact [[EMAIL:marie.dubois@acme-solutions.fr]] " +
      "ou [[PHONE:06 12 34 56 78]]. IBAN [[IBAN:FR7630006000011234567890189]], SIRET [[SIRET:12345678200010]]. " +
      "[[PERSON#a:Marie]] rappelle demain.",
  },
  {
    id: "detector-identifiers",
    language: "en",
    layer: "detector",
    note: "identifiers the detector's checksum-only pass used to mask",
    luhn: true,
    markup:
      "ts {{1735689600005}} order {{1234567890123452}} user_id={{123456782}}",
  },
];

export interface HomeEntry extends Case {
  readonly layer: HomeCase["layer"];
  readonly note: string;
  readonly luhn: boolean;
}

export const HOME_CASES: readonly HomeEntry[] = HOME.map((entry) => {
  const { text, mask, keep } = parseMarkup(entry.markup);
  const id = `home:${entry.id}`;
  return {
    id,
    source: "home",
    language: entry.language,
    genre: entry.layer,
    group: id,
    text,
    mask,
    keep,
    ignore: [],
    layer: entry.layer,
    note: entry.note,
    luhn: entry.luhn === true,
  };
});
