# Caviarde

*Caviarder*: to black out a passage in a document.

Caviarde replaces personal data in your clipboard with placeholders and pastes
the result, so a support ticket can go into an AI tool without the customer's
identity going with it.

```
Marie Dubois à Lyon, marie.dubois@acme-solutions.fr, SIRET 12345678200010
→ [PERSON_1] à [LOCATION_1], [EMAIL_1], SIRET [SIRET_1]
```

One command, no interface, and by default nothing leaves your machine.

## The command

**Mask and Paste** reads the clipboard, masks it, and pastes the masked text.

Raycast hotkeys are assigned per command by you, not by the extension. Open
Raycast Settings, find *Caviarde → Mask and Paste*, and record a shortcut.
⌥⌘V is a good one: it sits next to the paste you already know.

Placeholders are numbered per type and stable within a single paste, so the same
name is always `[PERSON_1]`. Numbering restarts on the next paste, and nothing is
stored: there is no unmask command and no mapping kept anywhere.

Plain text only. Formatting from Notion or elsewhere is dropped, which is usually
what you want when pasting into a chat.

## Two layers, one optional

**Deterministic** detection always runs, in-process, with no network and no
dependency: emails, phone numbers, IPv4 and IPv6, IBANs validated with mod-97,
cards and SIRET validated with Luhn, SIREN, API keys, JWTs, PEM private keys, and
names written as `@mentions`.

**Semantic** detection finds what patterns cannot, names, places and company
names, by calling a [PasteGuard](https://github.com/sgasser/pasteguard) detector
running on your machine. Company detection needs a three-line patch that
`compose.yaml` mounts for you, explained in
[docs/detector-patch.md](docs/detector-patch.md).

Start it with the pinned compose file in this repository:

```bash
docker compose up -d
```

It listens on `127.0.0.1:5002` and never leaves your machine. Point the extension
elsewhere with the **Detector URL** preference if you moved it.

**When the detector is unreachable, Caviarde does not fail.** It masks with the
deterministic layer alone and the HUD says so:

```
2 masked: 1 email, 1 IBAN (partial: detector unreachable)
```

That wording matters. Without the detector, a name is masked only when it is
written as an `@mention`, or when it is the first name of someone mentioned that
way elsewhere in the text. Names in free prose, places and company names are not.

## Detection is best-effort

The semantic layer is a probabilistic NER model. It will miss things, and it will
occasionally mask something harmless. The deterministic layer is exact where a
checksum exists and a heuristic everywhere else.

Caviarde reduces what you leak. It does not guarantee you leak nothing, and it is
not a compliance control. Read what you paste.

Known gaps are listed in [docs/limitations.md](docs/limitations.md).

## Preferences

| Preference | Default | What it does |
|---|---|---|
| Detector URL | `http://127.0.0.1:5002` | Where the semantic detector lives |
| Detector Timeout | `3500` ms | Past this, fall back to deterministic only |
| Auth Token | empty | Sent as a bearer token. A local detector needs none |
| Phone Regions | `FR` | Without a region, only `+33`-style numbers are found |
| Mask person names | on | Needs the detector, except `@mentions` |
| Mask locations and addresses | on | Needs the detector |
| Mask company and organisation names | on | Needs the detector and the patch |

Text over 6,000 characters skips the semantic layer, since the model costs roughly 350 ms per
KB and a hotkey should not hang. Over 1,000,000 characters, Caviarde does nothing and says so.

## Development

```bash
pnpm install
pnpm dev            # loads the extension into Raycast
pnpm test
pnpm lint
```

Integration tests talk to a running detector and skip themselves when there is
none.

Changing the icon needs a full Raycast restart, not just `pnpm dev`: Settings
picks the new file up immediately while the root search keeps serving the one it
cached. Quit Raycast with its own `Quit Raycast` command and reopen. Regenerate
the PNG with `sips`, not `qlmanage`, which flattens transparency onto white:

```bash
cd assets && sips -s format png icon.svg --out icon.png
```

See [docs/architecture.md](docs/architecture.md) for the module layout and the
span-merging rules, and [docs/security-notes.md](docs/security-notes.md) for what
was audited in the detector image and why it is pinned by digest.

## License

MIT, except `detector-patch/gliner_layer.py`, which is derived from PasteGuard
and stays under Apache-2.0. Its licence text is in `detector-patch/LICENSE`.
