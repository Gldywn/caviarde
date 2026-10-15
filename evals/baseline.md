# Evaluation report

Split `dev`, pipeline `ab6823175a79`, detector `{"status":"ok","backend":"gliner","model":"urchade/gliner_multi_pii-v1"}`, compose.yaml `aa20e7bb56fe`, detector patch `c0867f5135de`, Node v24.18.1. Metric definitions are in `docs/evaluation.md`. Intervals are 95 % bootstrap intervals over groups. Each source is reported on its own; no figure pools them.

## Per source

### home

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 80 | 80 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % [100.0 %, 100.0 %] | 0.1 % [0.0 %, 1.1 %] | 0.0 % | 0.0 % | 99.4 % | n/a | too-large 1 |
| detector off | 80 | 80 | 12.5 % [2.8 %, 23.7 %] | 14.0 % [3.5 %, 25.3 %] | 86.0 % [75.0 %, 96.5 %] | 0.0 % [0.0 %, 0.0 %] | 0.0 % | 0.0 % | 92.5 % | 0.0 % | none |

Leaked characters, detector on minus off: -12.5 % [-24.2 %, -2.7 %], paired by group.

### redact

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 860 | 531 | 16.6 % [14.4 %, 18.8 %] | 15.5 % [13.0 %, 18.4 %] | 83.8 % [81.1 %, 86.3 %] | 2.9 % [2.7 %, 3.2 %] | 78.9 % | n/a | 51.8 % | 0.0 % | timeout 17, too-large 14 |
| detector off | 860 | 531 | 72.1 % [70.5 %, 73.7 %] | 86.3 % [85.1 %, 87.4 %] | 13.6 % [12.5 %, 14.8 %] | 0.2 % [0.2 %, 0.3 %] | 5.3 % | n/a | 22.8 % | 0.0 % | none |

Leaked characters, detector on minus off: -55.5 % [-58.2 %, -52.5 %], paired by group.

### kiji

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 320 | 320 | 10.5 % [8.7 %, 12.4 %] | 12.8 % [11.0 %, 14.8 %] | 87.1 % [85.1 %, 89.0 %] | 5.2 % [4.8 %, 5.7 %] | 0.0 % | n/a | 25.0 % | 0.0 % | none |
| detector off | 320 | 320 | 84.9 % [82.3 %, 87.5 %] | 94.1 % [93.0 %, 95.1 %] | 5.9 % [4.9 %, 7.0 %] | 0.0 % [0.0 %, 0.0 %] | 0.0 % | n/a | 11.1 % | 0.0 % | none |

Leaked characters, detector on minus off: -74.4 % [-77.3 %, -71.5 %], paired by group.

### gretel

| Mode | Cases | Groups | Leaked chars | Leaked per mention | Mentions fully masked | Over-masking | Clean texts touched | Identifiers destroyed | Exact F1 | Leaks inside merge-dropped spans | Semantic skipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| detector on | 380 | 319 | 12.8 % [10.3 %, 15.6 %] | 18.8 % [15.5 %, 22.3 %] | 80.4 % [76.9 %, 83.9 %] | 2.4 % [2.1 %, 2.8 %] | 50.0 % | n/a | 68.2 % | 0.0 % | none |
| detector off | 380 | 319 | 86.6 % [83.9 %, 89.1 %] | 88.5 % [86.2 %, 90.5 %] | 11.5 % [9.5 %, 13.7 %] | 0.1 % [0.1 %, 0.2 %] | 3.8 % | n/a | 19.8 % | 0.0 % | none |

Leaked characters, detector on minus off: -73.8 % [-77.3 %, -70.5 %], paired by group.

## Per language

### home

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 3 | 3 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |
| en | claimed | 34 | 34 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |
| es | claimed | 2 | 2 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |
| fr | claimed | 34 | 34 | 0.0 % [0.0 %, 0.0 %] | 20.4 % [5.3 %, 37.6 %] | 100.0 % | 76.9 % | 0.1 % |
| it | claimed | 1 | 1 | 0.0 %, one group | 0.0 %, one group | 100.0 % | 100.0 % | 0.0 % |
| pt | claimed | 3 | 3 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |
| nl | measured | 3 | 3 | 0.0 % [0.0 %, 0.0 %] | 0.0 % [0.0 %, 0.0 %] | 100.0 % | 100.0 % | 0.0 % |

### redact

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 42 | 9.8 % [6.9 %, 13.0 %] | 72.9 % [67.5 %, 78.1 %] | 88.3 % | 13.1 % | 2.8 % |
| en | claimed | 60 | 52 | 20.4 % [7.4 %, 31.7 %] | 68.3 % [62.3 %, 74.9 %] | 72.1 % | 13.2 % | 2.6 % |
| es | claimed | 60 | 42 | 13.6 % [8.3 %, 18.9 %] | 72.0 % [65.4 %, 78.1 %] | 90.1 % | 18.4 % | 2.6 % |
| fr | claimed | 60 | 38 | 20.2 % [9.1 %, 32.4 %] | 68.6 % [62.5 %, 74.4 %] | 77.9 % | 15.8 % | 3.0 % |
| fr_ca | claimed | 60 | 50 | 18.3 % [11.9 %, 24.3 %] | 77.2 % [72.4 %, 82.2 %] | 84.5 % | 10.3 % | 3.7 % |
| it | claimed | 60 | 41 | 8.1 % [5.0 %, 12.4 %] | 68.3 % [63.7 %, 74.2 %] | 90.2 % | 13.4 % | 3.1 % |
| pt_br | claimed | 60 | 50 | 26.3 % [18.5 %, 34.8 %] | 74.6 % [69.3 %, 80.3 %] | 82.1 % | 14.1 % | 2.7 % |
| pt_eu | claimed | 60 | 44 | 19.0 % [13.9 %, 24.1 %] | 74.4 % [70.5 %, 77.7 %] | 85.1 % | 16.3 % | 3.2 % |
| nl | measured | 60 | 41 | 10.9 % [4.1 %, 20.8 %] | 75.2 % [67.4 %, 81.4 %] | 90.1 % | 11.7 % | 3.0 % |
| ar | information | 20 | 18 | 8.8 % [4.0 %, 14.2 %] | 72.1 % [64.0 %, 80.5 %] | 91.5 % | 14.4 % | 4.3 % |
| cs | information | 20 | 15 | 14.1 % [2.7 %, 24.5 %] | 72.4 % [57.3 %, 81.1 %] | 86.6 % | 13.7 % | 1.9 % |
| da | information | 20 | 18 | 10.2 % [5.6 %, 14.1 %] | 63.2 % [56.3 %, 73.2 %] | 89.8 % | 22.9 % | 2.9 % |
| fi | information | 20 | 18 | 19.3 % [3.4 %, 38.3 %] | 68.9 % [59.7 %, 77.8 %] | 82.6 % | 13.0 % | 2.3 % |
| he | information | 20 | 17 | 17.1 % [6.1 %, 30.7 %] | 76.3 % [66.6 %, 86.4 %] | 91.8 % | 9.8 % | 3.1 % |
| hi | information | 20 | 17 | 32.4 % [17.8 %, 52.1 %] | 76.5 % [67.4 %, 83.8 %] | 58.2 % | 10.5 % | 2.7 % |
| hu | information | 20 | 18 | 8.8 % [4.7 %, 13.3 %] | 79.5 % [70.8 %, 85.8 %] | 90.0 % | 9.5 % | 2.6 % |
| ja | information | 20 | 16 | 22.3 % [9.7 %, 38.6 %] | 60.1 % [48.7 %, 70.7 %] | 67.7 % | 13.2 % | 2.5 % |
| ko | information | 20 | 16 | 20.7 % [9.9 %, 33.5 %] | 64.1 % [49.9 %, 75.7 %] | 71.3 % | 12.5 % | 2.7 % |
| no | information | 20 | 17 | 5.3 % [3.3 %, 7.6 %] | 64.3 % [54.0 %, 73.0 %] | 92.7 % | 17.7 % | 4.3 % |
| ru | information | 20 | 18 | 25.1 % [13.2 %, 34.3 %] | 74.0 % [65.6 %, 81.4 %] | 83.1 % | 16.9 % | 2.6 % |
| sv | information | 20 | 19 | 5.1 % [2.2 %, 9.1 %] | 73.1 % [62.4 %, 82.3 %] | 93.2 % | 10.0 % | 2.7 % |
| th | information | 20 | 19 | 40.4 % [30.4 %, 48.5 %] | 82.9 % [76.2 %, 89.7 %] | 68.4 % | 9.2 % | 1.6 % |
| tr | information | 20 | 17 | 17.8 % [7.9 %, 31.7 %] | 74.0 % [63.0 %, 84.2 %] | 89.1 % | 9.5 % | 3.4 % |
| zh_cn | information | 20 | 19 | 19.2 % [9.8 %, 32.9 %] | 61.2 % [45.4 %, 75.4 %] | 65.7 % | 13.6 % | 2.5 % |
| zh_tw | information | 20 | 20 | 17.6 % [10.5 %, 26.8 %] | 51.5 % [34.7 %, 69.8 %] | 68.8 % | 17.5 % | 1.9 % |

### kiji

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 60 | 6.8 % [3.9 %, 10.1 %] | 79.2 % [73.0 %, 85.1 %] | 91.0 % | 7.7 % | 5.1 % |
| en | claimed | 60 | 60 | 9.4 % [4.2 %, 16.8 %] | 83.4 % [77.2 %, 89.2 %] | 89.9 % | 7.3 % | 5.7 % |
| es | claimed | 60 | 60 | 16.7 % [12.1 %, 21.4 %] | 88.7 % [82.6 %, 94.0 %] | 81.6 % | 4.5 % | 6.4 % |
| fr | claimed | 60 | 60 | 6.5 % [4.2 %, 9.1 %] | 85.5 % [78.7 %, 91.5 %] | 90.0 % | 5.8 % | 4.4 % |
| nl | measured | 60 | 60 | 10.4 % [6.6 %, 14.7 %] | 86.9 % [80.6 %, 92.6 %] | 86.1 % | 4.9 % | 4.7 % |
| da | information | 20 | 20 | 15.4 % [6.9 %, 25.4 %] | 86.6 % [76.1 %, 95.4 %] | 82.1 % | 5.0 % | 5.3 % |

### gretel

| Language | Tier | Cases | Groups | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off | Over-masking, on |
|---|---|---|---|---|---|---|---|---|
| de | claimed | 60 | 59 | 14.4 % [9.1 %, 20.8 %] | 91.3 % [85.9 %, 96.5 %] | 77.8 % | 5.9 % | 2.3 % |
| en | claimed | 60 | 58 | 5.4 % [2.1 %, 9.6 %] | 85.1 % [78.8 %, 91.7 %] | 90.6 % | 13.1 % | 2.9 % |
| es | claimed | 60 | 57 | 6.9 % [3.5 %, 11.1 %] | 84.7 % [78.4 %, 90.2 %] | 90.6 % | 15.0 % | 2.0 % |
| fr | claimed | 60 | 59 | 9.0 % [4.3 %, 15.8 %] | 86.6 % [79.9 %, 92.6 %] | 86.2 % | 11.6 % | 3.2 % |
| it | claimed | 60 | 59 | 11.6 % [7.0 %, 16.8 %] | 89.8 % [82.2 %, 95.8 %] | 78.2 % | 8.5 % | 1.7 % |
| nl | measured | 60 | 58 | 27.6 % [18.8 %, 35.4 %] | 83.9 % [78.1 %, 89.5 %] | 67.3 % | 15.0 % | 2.3 % |
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
| PHONE | 22 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| SIREN | 4 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| SIRET | 4 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |

### redact

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| CARD | 6 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| EMAIL | 1169 | 1.2 % | 1.5 % | 97.9 % | 97.9 % |
| IBAN | 14 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IP | 101 | 24.3 % | 30.5 % | 83.2 % | 80.2 % |
| LOCATION | 1793 | 33.8 % | 100.0 % | 67.7 % | 0.0 % |
| ORGANIZATION | 753 | 15.4 % | 98.7 % | 82.5 % | 2.0 % |
| PERSON | 9489 | 13.6 % | 99.6 % | 85.0 % | 0.5 % |
| PHONE | 740 | 10.2 % | 14.9 % | 87.2 % | 81.9 % |

### kiji

| Type | Mentions | Leaked chars, on | Leaked chars, off | Fully masked, on | Fully masked, off |
|---|---|---|---|---|---|
| CARD | 5 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| EMAIL | 42 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| IBAN | 22 | 0.0 % | 0.0 % | 100.0 % | 100.0 % |
| LOCATION | 1132 | 13.4 % | 100.0 % | 84.2 % | 0.1 % |
| ORGANIZATION | 47 | 0.0 % | 100.0 % | 100.0 % | 0.0 % |
| PERSON | 638 | 9.1 % | 100.0 % | 90.4 % | 0.0 % |
| PHONE | 57 | 14.8 % | 17.8 % | 82.5 % | 78.9 % |

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
| PHONE | 59 | 11.0 % | 20.4 % | 88.1 % | 78.0 % |

## Per genre

### home

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| local | 74 | 0.0 % | 0.0 % | 0.2 % |

Not listed, under 10 cases each: 1 genre.

### redact

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| chat_transcript | 132 | 11.7 % | 85.1 % | 4.7 % |
| email | 113 | 15.0 % | 55.4 % | 3.2 % |
| json_record | 86 | 14.6 % | 71.5 % | 2.3 % |
| key_value_pairs | 131 | 25.0 % | 69.7 % | 2.9 % |
| log_entry | 139 | 14.5 % | 64.5 % | 2.0 % |
| plain_text | 112 | 21.7 % | 77.4 % | 2.4 % |
| ticket_worknotes | 147 | 15.6 % | 81.2 % | 2.8 % |

### kiji

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| mixed | 320 | 10.5 % | 84.9 % | 5.2 % |

### gretel

| Genre | Cases | Leaked chars, on | Leaked chars, off | Over-masking, on |
|---|---|---|---|---|
| BAI Format | 17 | 22.6 % | 95.8 % | 3.4 % |
| Bill of Lading | 11 | 6.0 % | 78.4 % | 6.7 % |
| CSV | 10 | 13.4 % | 86.1 % | 3.4 % |
| Customer support conversational log | 10 | 38.8 % | 100.0 % | 4.0 % |
| EDI | 15 | 15.5 % | 86.1 % | 4.5 % |
| Email | 13 | 19.4 % | 73.5 % | 0.8 % |
| Loan Application | 25 | 5.6 % | 71.0 % | 1.2 % |
| Payment Confirmation | 10 | 5.8 % | 84.9 % | 3.0 % |
| Safety Data Sheet | 10 | 24.8 % | 77.8 % | 0.9 % |
| XBRL | 12 | 41.7 % | 89.9 % | 0.1 % |

Not listed, under 10 cases each: 49 genres.

## By size

### home

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| over 6000 | 1 | 0.0 % | 0.0 % |
| up to 6000 | 79 | 0.0 % | 12.8 % |

### redact

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| over 6000 | 14 | 63.8 % | 63.8 % |
| up to 6000 | 846 | 14.7 % | 72.5 % |

### kiji

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| up to 6000 | 320 | 10.5 % | 84.9 % |

### gretel

| Characters | Cases | Leaked chars, on | Leaked chars, off |
|---|---|---|---|
| up to 6000 | 380 | 12.8 % | 86.6 % |

## Type confusion, detector on

Mentions whose dominant overlapping span has another type than the gold. Coverage is measured separately: a confused mention can also leak.

### redact

| Gold → masked as | Mentions |
|---|---|
| LOCATION → ORGANIZATION | 86 |
| PERSON → ORGANIZATION | 38 |
| PERSON → EMAIL | 17 |
| ORGANIZATION → EMAIL | 15 |
| LOCATION → PHONE | 4 |
| PHONE → SIREN | 3 |
| IP → ORGANIZATION | 2 |
| ORGANIZATION → LOCATION | 2 |
| ORGANIZATION → PERSON | 2 |
| EMAIL → ORGANIZATION | 1 |
| IP → LOCATION | 1 |
| LOCATION → PERSON | 1 |

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
| CARD → PHONE | 1 |
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
| home | in repository | 80 | none | none | 80 | 80 | 0.0 % | case |
| redact | 252232ac2966 | 13427 | ar/bounds 12, cs/bounds 38, da/bounds 30, de/bounds 50, en/bounds 26, es/bounds 35, fi/bounds 53, fr_ca/bounds 38, fr/bounds 36, he/bounds 28, hi/bounds 14, hu/bounds 43, it/bounds 40, ja/bounds 21, ko/bounds 8, nl/bounds 42, no/bounds 39, pt_br/bounds 19, pt_eu/bounds 10, ru/bounds 46, sv/bounds 33, th/bounds 13, tr/bounds 25, zh_cn/bounds 9, zh_tw/bounds 9 | CARD failing Luhn 169, CARD not a full number 1497, non-identifying IP 50, REDACT disclosed:false 1546, REDACT obfuscated 59 | 860 | 531 | 6.6 % | target pattern |
| kiji | 0275550f0b1f | 51495 | none | CARD failing Luhn 2115, CARD not a full number 487, IBAN failing mod-97 2534 | 320 | 320 | 4.6 % | record (no family key published) |
| gretel | 7b844d167385 | 55940 | de/bounds 3, en/blank 2, en/bounds 72, es/bounds 6, fr/bounds 4, it/bounds 1, nl/bounds 7, sv/bounds 12 | CARD failing Luhn 618, CARD not a full number 21, IBAN failing mod-97 444, non-identifying IP 39 | 380 | 319 | 2.1 % | document type and subtype |
