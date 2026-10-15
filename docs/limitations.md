# Limitations

Detection is best-effort. The semantic layer is a probabilistic model and will
miss things. Nothing here constitutes a compliance guarantee. Read what you
paste.

## Technical identifiers are not masked

Masked text has to stay usable for debugging and database queries, so
identifiers are deliberately left alone: UUIDs, object ids, prefixed ids
(`cus_`, `org_`, `usr_`), bare numeric user and company ids, order references,
epoch timestamps, git SHAs, semver, and Kubernetes pod names.

Two rules make that work. A bare nine-digit number is read as a SIREN only when a
keyword precedes it or it is written `123 456 782`, because one random nine-digit
number in ten passes the Luhn checksum. And loopback, unspecified and link-local
addresses (`127.0.0.0/8`, `0.0.0.0`, `169.254.0.0/16`, `::1`, `fe80::/10`) are
never masked, since they identify nobody.

Private ranges (`10/8`, `172.16/12`, `192.168/16`) **are** masked, on the grounds
that they can describe an internal topology.

A third rule covers cards, for the same reason: Luhn alone accepts about one
numeric identifier in ten, timestamps and order numbers included. A card also has
to begin with an issuer prefix, so a number outside those ranges is left alone
even when its check digit is right. The cost is the reverse case, a card from an
issuer outside the listed ranges, which is not masked at all.

One gap remains: a SIRET is accepted on its checksum alone, so a bare
fourteen-digit number that passes Luhn is masked, as described under SIREN and
SIRET.

The semantic layer follows the same rules. The detector runs its own structured
pass, and that pass is checksum-only, so its cards and IBANs are re-validated
here before being accepted. Without that, turning the detector on would mask the
very identifiers the deterministic layer is careful to leave alone.

## Names

Full names in prose are detected by the semantic layer. Two cases are handled
without it, by pattern alone: an `@mention` marks a person, and a first name
appearing on its own is masked when the same person's full name appears
elsewhere in the text.

A bare first name with no full-name anchor and no `@` is not detected. The model
scores an isolated first name far below the threshold that ordinary French nouns
already reach, so no threshold separates them.

A mention stops at the first lowercase word that is not a single particle, so
`@Daan van den Berg` masks `Daan` only and leaves `van den Berg`: the pattern
allows one particle before each capitalised word, not two in a row.

## Organisations

Company names are detected only when the detector runs the patch described in
`detector-patch.md`. Without it they pass through untouched and the
corresponding preference has no effect.

Detection is imperfect in both directions. Some real companies score below the
threshold and are missed. Internal team names are sometimes masked, and scores
vary with surrounding text, so the threshold is not a clean separation.
Over-masking a team name is the harmless direction; missing a company name is
not, and it happens.

## SIREN and SIRET

Handled by the deterministic layer rather than the detector, which reports a
SIRET as a credit card (a SIRET is fourteen digits and Luhn-valid by
construction, La Poste excepted) and does not detect a SIREN at all.

A SIRET needs no keyword or spacing, so a bare fourteen-digit number that passes
Luhn, about one in ten, is masked as a SIRET: a compact timestamp such as
`20241014125302`, or a fourteen-digit order number.

A bare SIREN needs its keyword right before the number, separated by
punctuation or spaces only: `SIREN 123456782` and `RCS : 123456782` are
masked, `RCS Lyon 123456782` is not, because a word stands between them. The
spaced form `RCS Lyon B 123 456 782` is masked regardless.

## Phone numbers

The deterministic layer recognises, whatever the `phoneRegions` preference says,
French national numbers written as five pairs of digits (`01 23 45 67 89`) and
international `+` numbers, with nothing or an ordinary space, dot or hyphen as
separator.

Other layouts rely on the formats the detector supports: another grouping
(`0 800 123 456`), groups separated by a non-breaking space, as French
typography writes them, or a trunk zero in brackets (`+33 (0)1 23 45 67 89`).
Groups separated by a narrow non-breaking space (U+202F) are missed by both
layers. `phoneRegions` supplies the detector's region hints for national
numbers. Those hints have no effect without a successful detector response, and
no request is made when the text is over the semantic size limit or when all
three semantic preferences are off.

The default list is `FR,GB,DE,NL,BE,CH,IE`. Each country listed lets the
detector read more runs of digits as national phone numbers, and the extension
does not re-check the phone numbers the detector returns. In tests against the
detector with invented identifiers, Spain turned a bare nine-digit number such
as `987654321` into a phone number, Portugal one such as `600123456`, the United
States and Canada an eleven-digit number starting with 1, Brazil a ten-digit
one, Italy a ten-digit one starting with 32 to 39, and Austria an eight-digit
one starting with 0. Those countries are left out of the default for that
reason. Their numbers are still masked in international `+` form, and adding
one of them to the list trades that identifier risk for its national format.

## Confidence thresholds are a tuning choice

The detector drops a span when its score falls under the floor set for its
label in `compose.yaml`: 0.80 for persons, 0.60 for locations, 0.30 for street
addresses and 0.50 for organisations. These values were measured with the
evaluation harness described in `evaluation.md`, on the development split of
three public synthetic corpora and the home dataset, one label and one step at
a time. A step was kept only when the leak fell on at least one corpus with a
95 % paired bootstrap interval excluding zero, no corpus got worse, over-masking
stayed within one point of the previous baseline, and nothing the masked text
needs was newly lost against the previous floors: identifiers, texts with no
personal data, and the product names, team names and technical strings of a
set of invented tickets.

Against the previous floors (0.95, 0.70, 0.70, 0.50), the share of sensitive
characters left visible fell from 22.3 % to 17.4 % on REDACT, from 21.4 % to
10.7 % on Kiji and from 16.7 % to 13.1 % on Gretel. The price is masking more
of what is not personal data: over-masking rose from 2.5 % to 2.9 %, from 4.3 %
to 5.2 % and from 2.0 % to 2.4 %. The final holdout, run once at these floors,
leaves 19.8 %, 10.8 % and 12.5 % visible. On REDACT the gap with development
comes from texts over the 6,000-character cap, which the semantic layer never
sees: 24 in the holdout against 14; under the cap the two splits leave 15.9 %
and 15.5 % visible. `evals/baseline.md` holds the full development figures.

Every floor sits one step above a value that breaks something:

- persons at 0.75: a session UUID repeated through an access log is masked as
  a person, which destroys the identifier needed to query the logs;
- locations at 0.55: cloud regions such as `eu-west-3` and node names are
  masked as places;
- addresses at 0.20: the lowercase handle `@here` is masked as a place in a
  text with no personal data;
- organisations at 0.45: a team name that 0.50 leaves alone is masked, and
  over-masking on Kiji reaches the one-point limit for a gain of a tenth of a
  point.

The margins are thin and the checks have gaps. The UUID above scored 0.76, close
to the 0.80 floor, and nothing outside the floors stops a semantic span from
covering an identifier. Fourteen long REDACT development texts, mostly key-value
records and logs, time out at the default 3,500 ms at every floor, so no check
saw what the detector does with them; a longer Detector Timeout lets it. The
holdout, at the final floors, masks a 32-digit number in a bank statement as a
place, and has no run at the previous floors to say whether these floors caused
it.

What the current floors still get wrong in both directions: roles and
honorifics written as names ("Customer", "Agent", "Herr") are sometimes masked
as persons, and a name that starts with an honorific ("Herr Jonas Becker") makes
the honorific, not the first name, stand for the person elsewhere in the text.
The word "address" itself ("adresse postale", "Wohnort") is sometimes masked as
a place, some of it already under the previous floors, and so, in the corpora,
are a locale code, two field names and a terminal tag that names a city.
Organisations, unchanged at 0.50, already mask some product and team names
named in a ticket. On the other side, REDACT still leaves a third of its
location characters visible, and Gretel a quarter of its person characters. All
three corpora are generated by language models, and the model's scores depend
on the surrounding text, so real clipboard content will not reproduce these
figures exactly.
