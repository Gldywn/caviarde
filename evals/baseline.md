# Evaluation report

Split `dev`, pipeline `26ecc51df218`, detector `{"status":"ok","backend":"gliner","model":"urchade/gliner_multi_pii-v1"}`, compose.yaml `aa20e7bb56fe`, detector patch `c0867f5135de`, Node v24.18.1. Metric definitions are in `docs/evaluation.md`. Intervals are 95 % bootstrap intervals over groups. Each source is reported on its own; no figure pools them.

## Per source

### home

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 69 | 69 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % [100.0 %, 100.0 %] | 0.1 % [0.0 %, 1.3 %] | 0.0 % | 0.0 % | 99.3 % | n/a | too-large 1 |
| detector off | 69 | 69 | 15.7 % [4.2 %, 28.7 %] | 17.4 % [5.0 %, 30.3 %] | 82.6 % [69.7 %, 95.2 %] | 0.0 % [0.0 %, 0.0 %] | 0.0 % | 0.0 % | 90.5 % | 0.0 % | none |

Leaked characters, detector on minus off: -15.7 % [-30.8 %, -3.2 %], paired by group.

### redact

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 860 | 531 | 17.4 % [15.2 %, 19.8 %] | 16.2 % [13.6 %, 19.0 %] | 83.1 % [80.3 %, 85.6 %] | 2.9 % [2.7 %, 3.2 %] | 78.9 % | n/a | 51.2 % | 0.3 % | timeout 24, too-large 14 |
| detector off | 860 | 531 | 72.7 % [71.0 %, 74.3 %] | 86.7 % [85.5 %, 87.8 %] | 13.1 % [12.0 %, 14.3 %] | 0.2 % [0.2 %, 0.3 %] | 5.3 % | n/a | 22.0 % | 0.0 % | none |

Leaked characters, detector on minus off: -55.3 % [-57.9 %, -52.3 %], paired by group.

### kiji

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 320 | 320 | 10.7 % [8.8 %, 12.6 %] | 12.9 % [11.0 %, 14.8 %] | 87.0 % [85.1 %, 88.9 %] | 5.2 % [4.8 %, 5.7 %] | 0.0 % | n/a | 24.9 % | 0.0 % | none |
| detector off | 320 | 320 | 85.3 % [82.8 %, 87.8 %] | 94.3 % [93.3 %, 95.3 %] | 5.7 % [4.7 %, 6.8 %] | 0.0 % [0.0 %, 0.0 %] | 0.0 % | n/a | 10.6 % | 0.0 % | none |

Leaked characters, detector on minus off: -74.7 % [-77.6 %, -71.7 %], paired by group.

### gretel

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 380 | 319 | 13.1 % [10.6 %, 15.9 %] | 19.1 % [15.8 %, 22.6 %] | 80.0 % [76.6 %, 83.6 %] | 2.4 % [2.1 %, 2.8 %] | 50.0 % | n/a | 68.1 % | 0.0 % | none |
| detector off | 380 | 319 | 87.0 % [84.3 %, 89.5 %] | 88.9 % [86.7 %, 90.9 %] | 11.0 % [9.1 %, 13.3 %] | 0.1 % [0.1 %, 0.2 %] | 3.8 % | n/a | 19.2 % | 0.0 % | none |

Leaked characters, detector on minus off: -73.9 % [-77.5 %, -70.5 %], paired by group.

## Per language

### home

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 3 | 3 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |
| en | claimed | 30 | 30 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |
| es | claimed | 1 | 1 | 0.0 %, one group | 0.0 %, one group | 100.0 % | 100.0 % | 0.0 % |
| fr | claimed | 31 | 31 | 0.0 % [0.0 %, 0.0 %] | 22.1 % [5.8 %, 40.5 %] | 100.0 % | 75.0 % | 0.1 % |
| it | claimed | 1 | 1 | 0.0 %, one group | 0.0 %, one group | 100.0 % | 100.0 % | 0.0 % |
| pt | claimed | 1 | 1 | 0.0 %, one group | 0.0 %, one group | 100.0 % | 100.0 % | 0.0 % |
| nl | measured | 2 | 2 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |

### redact

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 42 | 9.8 % [6.9 %, 13.0 %] | 72.9 % [67.5 %, 78.1 %] | 88.3 % | 13.1 % | 2.8 % |
| en | claimed | 60 | 52 | 20.2 % [7.6 %, 32.4 %] | 71.2 % [65.1 %, 77.7 %] | 74.2 % | 11.4 % | 2.8 % |
| es | claimed | 60 | 42 | 14.2 % [8.8 %, 19.3 %] | 72.6 % [65.9 %, 78.6 %] | 88.1 % | 16.4 % | 2.6 % |
| fr | claimed | 60 | 38 | 22.2 % [11.2 %, 34.2 %] | 68.6 % [62.5 %, 74.4 %] | 76.4 % | 15.8 % | 2.9 % |
| fr_ca | claimed | 60 | 50 | 20.0 % [13.5 %, 26.2 %] | 79.2 % [74.7 %, 84.0 %] | 83.3 % | 8.9 % | 3.7 % |
| it | claimed | 60 | 41 | 8.1 % [5.0 %, 12.4 %] | 68.3 % [63.7 %, 74.2 %] | 90.2 % | 13.4 % | 3.1 % |
| pt_br | claimed | 60 | 50 | 28.4 % [20.7 %, 36.7 %] | 75.1 % [69.8 %, 81.1 %] | 78.8 % | 13.5 % | 2.6 % |
| pt_eu | claimed | 60 | 44 | 19.1 % [13.9 %, 24.3 %] | 74.4 % [70.5 %, 77.9 %] | 84.8 % | 16.0 % | 3.2 % |
| nl | measured | 60 | 41 | 10.9 % [4.1 %, 20.8 %] | 75.6 % [67.7 %, 81.9 %] | 90.1 % | 11.3 % | 3.0 % |
| ar | information | 20 | 18 | 8.8 % [4.0 %, 14.2 %] | 72.1 % [64.0 %, 80.5 %] | 91.5 % | 14.4 % | 4.3 % |
| cs | information | 20 | 15 | 14.3 % [3.0 %, 24.6 %] | 72.6 % [57.5 %, 81.2 %] | 86.1 % | 13.2 % | 1.9 % |
| da | information | 20 | 18 | 10.2 % [5.6 %, 14.1 %] | 63.2 % [56.3 %, 73.2 %] | 89.8 % | 22.9 % | 2.9 % |
| fi | information | 20 | 18 | 19.3 % [3.4 %, 38.3 %] | 68.9 % [59.7 %, 77.8 %] | 82.6 % | 13.0 % | 2.3 % |
| he | information | 20 | 17 | 17.1 % [6.1 %, 30.7 %] | 78.1 % [68.9 %, 87.8 %] | 91.8 % | 8.6 % | 3.1 % |
| hi | information | 20 | 17 | 32.4 % [17.8 %, 52.1 %] | 76.5 % [67.4 %, 83.8 %] | 58.2 % | 10.5 % | 2.7 % |
| hu | information | 20 | 18 | 8.8 % [4.7 %, 13.3 %] | 79.5 % [70.8 %, 85.8 %] | 90.0 % | 9.5 % | 2.6 % |
| ja | information | 20 | 16 | 22.3 % [9.7 %, 38.6 %] | 60.1 % [48.7 %, 70.7 %] | 67.7 % | 13.2 % | 2.5 % |
| ko | information | 20 | 16 | 21.8 % [9.9 %, 35.8 %] | 64.1 % [49.9 %, 75.7 %] | 70.6 % | 12.5 % | 2.6 % |
| no | information | 20 | 17 | 5.3 % [3.3 %, 7.6 %] | 64.3 % [54.0 %, 73.0 %] | 92.7 % | 17.7 % | 4.3 % |
| ru | information | 20 | 18 | 29.7 % [13.8 %, 43.5 %] | 78.6 % [72.4 %, 84.4 %] | 79.2 % | 13.6 % | 2.3 % |
| sv | information | 20 | 19 | 12.6 % [3.6 %, 26.8 %] | 73.4 % [62.4 %, 83.0 %] | 86.1 % | 9.8 % | 2.6 % |
| th | information | 20 | 19 | 44.2 % [31.4 %, 56.4 %] | 82.9 % [76.2 %, 89.7 %] | 65.8 % | 9.2 % | 1.5 % |
| tr | information | 20 | 17 | 17.8 % [7.9 %, 31.7 %] | 74.0 % [63.0 %, 84.2 %] | 89.1 % | 9.5 % | 3.4 % |
| zh_cn | information | 20 | 19 | 19.2 % [9.8 %, 32.9 %] | 62.1 % [46.2 %, 76.4 %] | 65.7 % | 13.1 % | 2.5 % |
| zh_tw | information | 20 | 20 | 17.6 % [10.5 %, 26.8 %] | 51.5 % [34.7 %, 69.8 %] | 68.8 % | 17.5 % | 1.9 % |

### kiji

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 60 | 6.8 % [3.9 %, 10.1 %] | 80.0 % [74.0 %, 85.8 %] | 91.0 % | 7.1 % | 5.1 % |
| en | claimed | 60 | 60 | 9.9 % [4.6 %, 17.3 %] | 83.9 % [77.9 %, 89.8 %] | 89.6 % | 7.0 % | 5.7 % |
| es | claimed | 60 | 60 | 16.7 % [12.1 %, 21.4 %] | 88.7 % [82.6 %, 94.0 %] | 81.6 % | 4.5 % | 6.4 % |
| fr | claimed | 60 | 60 | 7.0 % [4.6 %, 9.7 %] | 86.0 % [79.1 %, 92.3 %] | 89.7 % | 5.5 % | 4.4 % |
| nl | measured | 60 | 60 | 10.4 % [6.6 %, 14.7 %] | 87.3 % [81.0 %, 93.2 %] | 86.1 % | 4.6 % | 4.7 % |
| da | information | 20 | 20 | 15.4 % [6.9 %, 25.4 %] | 86.6 % [76.1 %, 95.4 %] | 82.1 % | 5.0 % | 5.3 % |

### gretel

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 59 | 14.4 % [9.1 %, 20.8 %] | 91.3 % [85.9 %, 96.5 %] | 77.8 % | 5.9 % | 2.3 % |
| en | claimed | 60 | 58 | 7.1 % [3.6 %, 11.2 %] | 86.8 % [81.2 %, 92.4 %] | 88.1 % | 10.7 % | 2.9 % |
| es | claimed | 60 | 57 | 6.9 % [3.5 %, 11.1 %] | 84.7 % [78.4 %, 90.2 %] | 90.6 % | 15.0 % | 2.0 % |
| fr | claimed | 60 | 59 | 9.0 % [4.3 %, 15.8 %] | 86.6 % [79.9 %, 92.6 %] | 86.2 % | 11.6 % | 3.2 % |
| it | claimed | 60 | 59 | 11.6 % [7.0 %, 16.8 %] | 89.8 % [82.2 %, 95.8 %] | 78.2 % | 8.5 % | 1.7 % |
| nl | measured | 60 | 58 | 27.6 % [18.8 %, 35.4 %] | 84.4 % [78.8 %, 90.0 %] | 67.3 % | 14.3 % | 2.3 % |
| sv | information | 20 | 20 | 20.2 % [11.2 %, 32.6 %] | 83.4 % [73.3 %, 95.3 %] | 67.6 % | 11.5 % | 2.0 % |

## Per gold type

Characters are summed over the mentions of each type, so a character inside two nested mentions counts in both; the per-source figures count it once.

### home

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| CARD | 1 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| EMAIL | 6 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IBAN | 5 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IP | 2 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| LOCATION | 3 | 0.0 % | 100.0 % | 100.0 % | 0.0 % |
| ORGANIZATION | 2 | 0.0 % | 100.0 % | 100.0 % | 0.0 % |
| PERSON | 37 | 0.0 % | 20.4 % | 100.0 % | 81.1 % |
| PHONE | 6 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| SIREN | 3 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| SIRET | 4 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |

### redact

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| CARD | 6 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| EMAIL | 1169 | 1.2 % | 1.5 % | 97.9 % | 97.9 % |
| IBAN | 14 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IP | 101 | 24.3 % | 30.5 % | 83.2 % | 80.2 % |
| LOCATION | 1793 | 34.3 % | 100.0 % | 67.3 % | 0.0 % |
| ORGANIZATION | 753 | 15.8 % | 98.7 % | 82.2 % | 2.0 % |
| PERSON | 9489 | 14.4 % | 99.6 % | 84.5 % | 0.5 % |
| PHONE | 740 | 15.6 % | 22.8 % | 79.5 % | 71.5 % |

### kiji

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| CARD | 5 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| EMAIL | 42 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IBAN | 22 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| LOCATION | 1132 | 13.4 % | 100.0 % | 84.2 % | 0.1 % |
| ORGANIZATION | 47 | 0.0 % | 100.0 % | 100.0 % | 0.0 % |
| PERSON | 638 | 9.1 % | 100.0 % | 90.4 % | 0.0 % |
| PHONE | 57 | 18.2 % | 25.4 % | 78.9 % | 70.2 % |

### gretel

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| API_KEY | 3 | 100.0 % | 100.0 % | 0.0 % | 0.0 % |
| CARD | 8 | 14.6 % | 14.6 % | 87.5 % | 87.5 % |
| EMAIL | 103 | 1.4 % | 2.1 % | 98.1 % | 97.1 % |
| IBAN | 27 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IP | 33 | 0.0 % | 10.6 % | 100.0 % | 93.9 % |
| LOCATION | 351 | 6.8 % | 100.0 % | 89.2 % | 0.0 % |
| ORGANIZATION | 363 | 0.9 % | 100.0 % | 98.1 % | 0.0 % |
| PERSON | 891 | 26.5 % | 100.0 % | 66.0 % | 0.0 % |
| PHONE | 59 | 21.2 % | 33.9 % | 78.0 % | 64.4 % |

## Per genre

### home

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| local | 63 | 0.0 % | 0.0 % | 0.2 % |

Not listed, under 10 cases each: 1 genre.

### redact

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| chat_transcript | 132 | 10.8 % | 85.4 % | 4.8 % |
| email | 113 | 16.9 % | 56.1 % | 3.2 % |
| json_record | 86 | 16.7 % | 71.7 % | 2.2 % |
| key_value_pairs | 131 | 26.6 % | 71.0 % | 2.9 % |
| log_entry | 139 | 15.4 % | 64.8 % | 1.9 % |
| plain_text | 112 | 22.4 % | 78.4 % | 2.4 % |
| ticket_worknotes | 147 | 15.8 % | 81.5 % | 2.8 % |

### kiji

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| mixed | 320 | 10.7 % | 85.3 % | 5.2 % |

### gretel

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| BAI Format | 17 | 22.6 % | 95.8 % | 3.4 % |
| Bill of Lading | 11 | 6.7 % | 79.1 % | 6.6 % |
| CSV | 10 | 13.4 % | 88.9 % | 3.4 % |
| Customer support conversational log | 10 | 38.8 % | 100.0 % | 4.0 % |
| EDI | 15 | 15.5 % | 86.1 % | 4.5 % |
| Email | 13 | 19.4 % | 73.5 % | 0.8 % |
| Loan Application | 25 | 7.7 % | 73.1 % | 1.2 % |
| Payment Confirmation | 10 | 5.8 % | 84.9 % | 3.0 % |
| Safety Data Sheet | 10 | 24.8 % | 77.8 % | 0.9 % |
| XBRL | 12 | 41.7 % | 89.9 % | 0.1 % |

Not listed, under 10 cases each: 49 genres.

## By size

### home

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| over 6000 | 1 | 0.0 % | 0.0 % |
| up to 6000 | 68 | 0.0 % | 16.2 % |

### redact

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| over 6000 | 14 | 65.4 % | 65.4 % |
| up to 6000 | 846 | 15.5 % | 73.0 % |

### kiji

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| up to 6000 | 320 | 10.7 % | 85.3 % |

### gretel

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| up to 6000 | 380 | 13.1 % | 87.0 % |

## Type confusion, detector on

Mentions whose dominant overlapping span has another type than the gold. Coverage is measured separately: a confused mention can also leak.

### redact

| Gold → masked as | Mentions |
|---|---|
| LOCATION → ORGANIZATION | 85 |
| PERSON → ORGANIZATION | 38 |
| PHONE → SIREN | 25 |
| PERSON → EMAIL | 17 |
| ORGANIZATION → EMAIL | 15 |
| LOCATION → PHONE | 3 |
| IP → ORGANIZATION | 2 |
| ORGANIZATION → LOCATION | 2 |
| ORGANIZATION → PERSON | 2 |
| PHONE → CARD | 2 |
| EMAIL → ORGANIZATION | 1 |
| IP → LOCATION | 1 |

### kiji

| Gold → masked as | Mentions |
|---|---|
| LOCATION → ORGANIZATION | 10 |
| PERSON → LOCATION | 3 |
| PERSON → ORGANIZATION | 2 |
| LOCATION → PHONE | 1 |

### gretel

| Gold → masked as | Mentions |
|---|---|
| PERSON → ORGANIZATION | 12 |
| LOCATION → PERSON | 11 |
| PERSON → LOCATION | 7 |
| ORGANIZATION → LOCATION | 2 |
| ORGANIZATION → PERSON | 2 |
| EMAIL → LOCATION | 1 |
| PHONE → LOCATION | 1 |

## Placeholder consistency

Only where the gold names its entities. Placeholder pairs are counted over mentions one span covers whole.

### home

| Mode | Entities with every mention masked | Same entity, different placeholders | Different entities, same placeholder |
|---|---|---|---|
| detector on | 100.0 % | 0 of 12 | 0 of 1 |
| detector off | 92.9 % | 0 of 11 | 0 of 1 |

## Ingestion

| Source | Revision | Records | Quarantined | In-scope gold ignored | Cases run | Groups | Ignored chars | Group key |
|---|---|---|---|---|---|---|---|---|
| home | in repository | 69 | none | none | 69 | 69 | 0.0 % | case |
| redact | 252232ac2966 | 13427 | ar/bounds 12, cs/bounds 38, da/bounds 30, de/bounds 50, en/bounds 26, es/bounds 35, fi/bounds 53, fr_ca/bounds 38, fr/bounds 36, he/bounds 28, hi/bounds 14, hu/bounds 43, it/bounds 40, ja/bounds 21, ko/bounds 8, nl/bounds 42, no/bounds 39, pt_br/bounds 19, pt_eu/bounds 10, ru/bounds 46, sv/bounds 33, th/bounds 13, tr/bounds 25, zh_cn/bounds 9, zh_tw/bounds 9 | CARD failing Luhn 169, CARD not a full number 1497, non-identifying IP 50, REDACT disclosed:false 1546, REDACT obfuscated 59 | 860 | 531 | 6.6 % | target pattern |
| kiji | 0275550f0b1f | 51495 | none | CARD failing Luhn 2115, CARD not a full number 487, IBAN failing mod-97 2534 | 320 | 320 | 4.6 % | record (no family key published) |
| gretel | 7b844d167385 | 55940 | de/bounds 3, en/blank 2, en/bounds 72, es/bounds 6, fr/bounds 4, it/bounds 1, nl/bounds 7, sv/bounds 12 | CARD failing Luhn 618, CARD not a full number 21, IBAN failing mod-97 444, non-identifying IP 39 | 380 | 319 | 2.1 % | document type and subtype |
