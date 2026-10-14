# Evaluation report

Split `dev`, pipeline `cb236f1cb377`, detector `{"status":"ok","backend":"gliner","model":"urchade/gliner_multi_pii-v1"}`, compose.yaml `8ba6c3d7b0f9`, detector patch `c0867f5135de`, Node v24.18.1. Metric definitions are in `docs/evaluation.md`. Intervals are 95 % bootstrap intervals over groups. Each source is reported on its own; no figure pools them.

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
| detector on | 860 | 531 | 22.3 % [20.3 %, 24.5 %] | 23.5 % [21.1 %, 26.3 %] | 75.7 % [73.0 %, 78.1 %] | 2.5 % [2.3 %, 2.7 %] | 73.7 % | n/a | 50.5 % | 0.3 % | timeout 22, too-large 14 |
| detector off | 860 | 531 | 72.7 % [71.0 %, 74.3 %] | 86.7 % [85.5 %, 87.8 %] | 13.1 % [12.0 %, 14.3 %] | 0.2 % [0.2 %, 0.3 %] | 5.3 % | n/a | 22.0 % | 0.0 % | none |

Leaked characters, detector on minus off: -50.4 % [-52.9 %, -47.7 %], paired by group.

### kiji

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 320 | 320 | 21.4 % [18.8 %, 24.1 %] | 25.3 % [22.8 %, 27.8 %] | 74.6 % [72.2 %, 77.2 %] | 4.3 % [3.9 %, 4.8 %] | 0.0 % | n/a | 24.1 % | 0.0 % | none |
| detector off | 320 | 320 | 85.3 % [82.8 %, 87.8 %] | 94.3 % [93.3 %, 95.3 %] | 5.7 % [4.7 %, 6.8 %] | 0.0 % [0.0 %, 0.0 %] | 0.0 % | n/a | 10.6 % | 0.0 % | none |

Leaked characters, detector on minus off: -63.9 % [-67.1 %, -60.7 %], paired by group.

### gretel

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 380 | 319 | 16.7 % [14.0 %, 19.8 %] | 23.6 % [19.8 %, 27.4 %] | 76.0 % [72.2 %, 79.7 %] | 2.0 % [1.7 %, 2.3 %] | 38.5 % | n/a | 68.6 % | 0.0 % | none |
| detector off | 380 | 319 | 87.0 % [84.3 %, 89.5 %] | 88.9 % [86.7 %, 90.9 %] | 11.0 % [9.1 %, 13.3 %] | 0.1 % [0.1 %, 0.2 %] | 3.8 % | n/a | 19.2 % | 0.0 % | none |

Leaked characters, detector on minus off: -70.2 % [-74.1 %, -67.0 %], paired by group.

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
| de | claimed | 60 | 42 | 18.2 % [14.3 %, 22.3 %] | 72.9 % [67.5 %, 78.1 %] | 75.3 % | 13.1 % | 2.3 % |
| en | claimed | 60 | 52 | 25.9 % [14.4 %, 36.2 %] | 71.2 % [65.1 %, 77.7 %] | 65.4 % | 11.4 % | 2.5 % |
| es | claimed | 60 | 42 | 18.0 % [12.1 %, 23.5 %] | 72.6 % [65.9 %, 78.6 %] | 84.5 % | 16.4 % | 2.2 % |
| fr | claimed | 60 | 38 | 26.0 % [15.5 %, 37.3 %] | 68.6 % [62.5 %, 74.4 %] | 71.1 % | 15.8 % | 2.7 % |
| fr_ca | claimed | 60 | 50 | 27.2 % [19.6 %, 34.3 %] | 79.2 % [74.7 %, 84.0 %] | 74.5 % | 8.9 % | 3.2 % |
| it | claimed | 60 | 41 | 13.0 % [9.1 %, 18.0 %] | 68.3 % [63.7 %, 74.2 %] | 82.4 % | 13.4 % | 2.8 % |
| pt_br | claimed | 60 | 50 | 32.2 % [24.6 %, 39.6 %] | 75.1 % [69.8 %, 81.1 %] | 73.7 % | 13.5 % | 2.2 % |
| pt_eu | claimed | 60 | 44 | 25.8 % [20.9 %, 30.7 %] | 74.4 % [70.5 %, 77.9 %] | 77.2 % | 16.0 % | 2.7 % |
| nl | measured | 60 | 41 | 16.0 % [8.5 %, 25.2 %] | 75.6 % [67.7 %, 81.9 %] | 82.4 % | 11.3 % | 2.7 % |
| ar | information | 20 | 18 | 15.7 % [8.1 %, 24.3 %] | 72.1 % [64.0 %, 80.5 %] | 83.2 % | 14.4 % | 3.3 % |
| cs | information | 20 | 15 | 17.8 % [5.3 %, 29.2 %] | 72.6 % [57.5 %, 81.2 %] | 80.2 % | 13.2 % | 1.8 % |
| da | information | 20 | 18 | 18.1 % [10.2 %, 23.8 %] | 63.2 % [56.3 %, 73.2 %] | 79.3 % | 22.9 % | 2.3 % |
| fi | information | 20 | 18 | 24.0 % [7.3 %, 41.3 %] | 68.9 % [59.7 %, 77.8 %] | 74.4 % | 13.0 % | 1.5 % |
| he | information | 20 | 17 | 22.2 % [11.6 %, 35.4 %] | 78.1 % [68.9 %, 87.8 %] | 82.8 % | 8.6 % | 3.0 % |
| hi | information | 20 | 17 | 34.0 % [19.7 %, 53.4 %] | 76.5 % [67.4 %, 83.8 %] | 55.6 % | 10.5 % | 2.3 % |
| hu | information | 20 | 18 | 15.0 % [9.4 %, 20.7 %] | 79.5 % [70.8 %, 85.8 %] | 78.3 % | 9.5 % | 2.1 % |
| ja | information | 20 | 16 | 24.5 % [12.0 %, 40.8 %] | 60.1 % [48.7 %, 70.7 %] | 62.7 % | 13.2 % | 2.2 % |
| ko | information | 20 | 16 | 28.1 % [18.1 %, 40.9 %] | 64.1 % [49.9 %, 75.7 %] | 57.0 % | 12.5 % | 2.1 % |
| no | information | 20 | 17 | 8.4 % [4.8 %, 12.3 %] | 64.3 % [54.0 %, 73.0 %] | 87.8 % | 17.7 % | 3.6 % |
| ru | information | 20 | 18 | 28.8 % [18.4 %, 36.6 %] | 78.6 % [72.4 %, 84.4 %] | 77.9 % | 13.6 % | 1.9 % |
| sv | information | 20 | 19 | 9.5 % [6.9 %, 13.5 %] | 73.4 % [62.4 %, 83.0 %] | 86.3 % | 9.8 % | 2.3 % |
| th | information | 20 | 19 | 49.7 % [39.7 %, 61.2 %] | 82.9 % [76.2 %, 89.7 %] | 54.8 % | 9.2 % | 1.3 % |
| tr | information | 20 | 17 | 22.0 % [12.8 %, 34.8 %] | 74.0 % [63.0 %, 84.2 %] | 82.6 % | 9.5 % | 3.0 % |
| zh_cn | information | 20 | 19 | 26.6 % [15.3 %, 39.5 %] | 62.1 % [46.2 %, 76.4 %] | 54.5 % | 13.1 % | 1.9 % |
| zh_tw | information | 20 | 20 | 19.6 % [12.1 %, 29.2 %] | 51.5 % [34.7 %, 69.8 %] | 63.6 % | 17.5 % | 1.7 % |

### kiji

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 60 | 20.6 % [15.4 %, 26.8 %] | 80.0 % [74.0 %, 85.8 %] | 75.1 % | 7.1 % | 4.0 % |
| en | claimed | 60 | 60 | 20.3 % [13.5 %, 27.9 %] | 83.9 % [77.9 %, 89.8 %] | 77.1 % | 7.0 % | 5.0 % |
| es | claimed | 60 | 60 | 26.9 % [20.2 %, 33.1 %] | 88.7 % [82.6 %, 94.0 %] | 69.2 % | 4.5 % | 5.5 % |
| fr | claimed | 60 | 60 | 21.0 % [15.6 %, 27.4 %] | 86.0 % [79.1 %, 92.3 %] | 73.9 % | 5.5 % | 3.2 % |
| nl | measured | 60 | 60 | 18.7 % [14.1 %, 24.1 %] | 87.3 % [81.0 %, 93.2 %] | 77.0 % | 4.6 % | 3.9 % |
| da | information | 20 | 20 | 18.3 % [9.2 %, 28.8 %] | 86.6 % [76.1 %, 95.4 %] | 78.6 % | 5.0 % | 5.1 % |

### gretel

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 59 | 22.1 % [15.8 %, 29.4 %] | 91.3 % [85.9 %, 96.5 %] | 70.0 % | 5.9 % | 1.9 % |
| en | claimed | 60 | 58 | 11.9 % [7.0 %, 17.0 %] | 86.8 % [81.2 %, 92.4 %] | 82.8 % | 10.7 % | 2.4 % |
| es | claimed | 60 | 57 | 9.7 % [5.9 %, 14.2 %] | 84.7 % [78.4 %, 90.2 %] | 88.0 % | 15.0 % | 1.7 % |
| fr | claimed | 60 | 59 | 11.6 % [6.1 %, 19.1 %] | 86.6 % [79.9 %, 92.6 %] | 83.0 % | 11.6 % | 2.7 % |
| it | claimed | 60 | 59 | 14.2 % [8.3 %, 20.6 %] | 89.8 % [82.2 %, 95.8 %] | 74.6 % | 8.5 % | 1.4 % |
| nl | measured | 60 | 58 | 30.2 % [21.7 %, 38.5 %] | 84.4 % [78.8 %, 90.0 %] | 64.7 % | 14.3 % | 1.7 % |
| sv | information | 20 | 20 | 23.9 % [14.2 %, 36.7 %] | 83.4 % [73.3 %, 95.3 %] | 64.0 % | 11.5 % | 1.5 % |

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
| EMAIL | 1169 | 1.3 % | 1.5 % | 97.9 % | 97.9 % |
| IBAN | 14 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IP | 101 | 25.0 % | 30.5 % | 82.2 % | 80.2 % |
| LOCATION | 1793 | 37.8 % | 100.0 % | 63.1 % | 0.0 % |
| ORGANIZATION | 753 | 16.4 % | 98.7 % | 81.9 % | 2.0 % |
| PERSON | 9489 | 24.5 % | 99.6 % | 74.4 % | 0.5 % |
| PHONE | 740 | 15.4 % | 22.8 % | 79.6 % | 71.5 % |

### kiji

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| CARD | 5 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| EMAIL | 42 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IBAN | 22 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| LOCATION | 1132 | 23.5 % | 100.0 % | 74.7 % | 0.1 % |
| ORGANIZATION | 47 | 0.0 % | 100.0 % | 100.0 % | 0.0 % |
| PERSON | 638 | 30.3 % | 100.0 % | 69.4 % | 0.0 % |
| PHONE | 57 | 18.2 % | 25.4 % | 78.9 % | 70.2 % |

### gretel

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| API_KEY | 3 | 100.0 % | 100.0 % | 0.0 % | 0.0 % |
| CARD | 8 | 14.6 % | 14.6 % | 87.5 % | 87.5 % |
| EMAIL | 103 | 1.4 % | 2.1 % | 98.1 % | 97.1 % |
| IBAN | 27 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IP | 33 | 0.0 % | 10.6 % | 100.0 % | 93.9 % |
| LOCATION | 351 | 12.5 % | 100.0 % | 84.0 % | 0.0 % |
| ORGANIZATION | 363 | 0.9 % | 100.0 % | 98.1 % | 0.0 % |
| PERSON | 891 | 32.4 % | 100.0 % | 59.7 % | 0.0 % |
| PHONE | 59 | 22.9 % | 33.9 % | 76.3 % | 64.4 % |

## Per genre

### home

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| local | 63 | 0.0 % | 0.0 % | 0.2 % |

Not listed, under 10 cases each: 1 genre.

### redact

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| chat_transcript | 132 | 15.6 % | 85.4 % | 4.0 % |
| email | 113 | 20.9 % | 56.1 % | 2.7 % |
| json_record | 86 | 19.6 % | 71.7 % | 2.0 % |
| key_value_pairs | 131 | 30.1 % | 71.0 % | 2.5 % |
| log_entry | 139 | 20.5 % | 64.8 % | 1.7 % |
| plain_text | 112 | 28.2 % | 78.4 % | 2.0 % |
| ticket_worknotes | 147 | 23.3 % | 81.5 % | 2.4 % |

### kiji

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| mixed | 320 | 21.4 % | 85.3 % | 4.3 % |

### gretel

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| BAI Format | 17 | 24.3 % | 95.8 % | 3.2 % |
| Bill of Lading | 11 | 10.3 % | 79.1 % | 5.5 % |
| CSV | 10 | 16.9 % | 88.9 % | 2.7 % |
| Customer support conversational log | 10 | 42.7 % | 100.0 % | 2.7 % |
| EDI | 15 | 25.6 % | 86.1 % | 3.0 % |
| Email | 13 | 25.1 % | 73.5 % | 0.8 % |
| Loan Application | 25 | 11.0 % | 73.1 % | 1.1 % |
| Payment Confirmation | 10 | 8.8 % | 84.9 % | 2.5 % |
| Safety Data Sheet | 10 | 27.2 % | 77.8 % | 0.9 % |
| XBRL | 12 | 41.7 % | 89.9 % | 0.0 % |

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
| up to 6000 | 846 | 20.6 % | 73.0 % |

### kiji

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| up to 6000 | 320 | 21.4 % | 85.3 % |

### gretel

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| up to 6000 | 380 | 16.7 % | 87.0 % |

## Type confusion, detector on

Mentions whose dominant overlapping span has another type than the gold. Coverage is measured separately: a confused mention can also leak.

### redact

| Gold → masked as | Mentions |
|---|---|
| LOCATION → ORGANIZATION | 86 |
| PERSON → ORGANIZATION | 38 |
| PHONE → SIREN | 25 |
| PERSON → EMAIL | 17 |
| ORGANIZATION → EMAIL | 15 |
| LOCATION → PHONE | 3 |
| IP → ORGANIZATION | 2 |
| ORGANIZATION → LOCATION | 2 |
| PHONE → CARD | 2 |
| EMAIL → ORGANIZATION | 1 |
| LOCATION → PERSON | 1 |
| ORGANIZATION → PERSON | 1 |

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
| PERSON → LOCATION | 6 |
| ORGANIZATION → LOCATION | 2 |
| ORGANIZATION → PERSON | 2 |
| EMAIL → LOCATION | 1 |
| LOCATION → PERSON | 1 |

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
