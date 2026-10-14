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
punctuation or spaces only: `SIREN 123456782` and `RCS : 123456782` are masked, `RCS Lyon
123456782` is not, because a word stands between them. The spaced form
`RCS Lyon B 123 456 782` is masked regardless.

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

The thresholds set in `compose.yaml` were chosen from a small sample of synthetic
French text, not from a benchmark. Different text will behave differently. The
evaluation harness described in `evaluation.md` measures them against three
public corpora per language, with run-to-run noise measured alongside; its
baseline is the reference any threshold change has to be compared with.
