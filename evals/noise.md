# Noise check

Pipeline `ab6823175a79`, detector `{"status":"ok","backend":"gliner","model":"urchade/gliner_multi_pii-v1"}` at `http://127.0.0.1:5005`, compose.yaml `aa20e7bb56fe`, detector patch `c0867f5135de`, Node v24.18.1, sample `ce87c7d78394`. The loaded confidence floors are not reported by the detector: the comparison assumes the container was started from this compose.yaml.

200 frozen cases: the home dataset and the `noise` ids of `evals/manifest.json`, six development records per source for each claimed language and Dutch, not stratified by genre. 2 invocations, 6 passes. A case is unstable when its accepted spans or its skip reason differ between passes. A restart is as stated by whoever ran the invocation. The detector caches inference per text window, so passes after the first in an invocation normally replay that cache: first passes compared across restarts test the model, later passes the cached path.

- First passes differing across invocations: 0 (none)
- Unstable within one invocation: 0 (none)
- Unstable across all passes: 0 (none)
- Skip reason changed: 0 (none)

| Invocation | Started | Detector restarted before | Pass | First request ms | Median ms | p95 ms |
|---|---|---|---|---|---|---|
| 1 | 2026-10-15T16:23:40.056Z | yes | 1 | 230 | 255 | 2010 |
| 1 | 2026-10-15T16:23:40.056Z | yes | 2 | 2 | 3 | 9 |
| 1 | 2026-10-15T16:23:40.056Z | yes | 3 | 24 | 4 | 10 |
| 2 | 2026-10-15T16:25:27.071Z | yes | 1 | 211 | 243 | 1996 |
| 2 | 2026-10-15T16:25:27.071Z | yes | 2 | 3 | 3 | 9 |
| 2 | 2026-10-15T16:25:27.071Z | yes | 3 | 3 | 3 | 10 |
