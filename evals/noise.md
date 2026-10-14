# Noise check

Pipeline `cb236f1cb377`, detector `{"status":"ok","backend":"gliner","model":"urchade/gliner_multi_pii-v1"}` at `http://127.0.0.1:5003`, compose.yaml `8ba6c3d7b0f9`, detector patch `c0867f5135de`, Node v24.18.1, sample `cf8ebcdb1e69`. The loaded confidence floors are not reported by the detector: the comparison assumes the container was started from this compose.yaml.

189 frozen cases: the home dataset and the `noise` ids of `evals/manifest.json`, six development records per source for each claimed language and Dutch, not stratified by genre. 2 invocations, 6 passes. A case is unstable when its accepted spans or its skip reason differ between passes. A restart is as stated by whoever ran the invocation. The detector caches inference per text window, so passes after the first in an invocation normally replay that cache: first passes compared across restarts test the model, later passes the cached path.

- First passes differing across invocations: 1 (gretel=1)
- Unstable within one invocation: 1 (gretel=1)
- Unstable across all passes: 1 (gretel=1)
- Skip reason changed: 1 (gretel=1)

| Invocation | Started | Detector restarted before | Pass | First request ms | Median ms | p95 ms |
|---|---|---|---|---|---|---|
| 1 | 2026-10-14T22:22:38.658Z | yes | 1 | 213 | 386 | 2408 |
| 1 | 2026-10-14T22:22:38.658Z | yes | 2 | 3 | 3 | 9 |
| 1 | 2026-10-14T22:22:38.658Z | yes | 3 | 2 | 4 | 10 |
| 2 | 2026-10-14T22:24:48.026Z | yes | 1 | 203 | 342 | 2371 |
| 2 | 2026-10-14T22:24:48.026Z | yes | 2 | 3 | 3 | 9 |
| 2 | 2026-10-14T22:24:48.026Z | yes | 3 | 2 | 3 | 8 |
