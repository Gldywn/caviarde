/** Every external byte the harness scores is pinned here: a moving revision
 * would make two baselines incomparable without anyone noticing. */

export const REDACT = {
  name: "redact",
  repo: "https://github.com/guneeshvats/REDACT-PII-Benchmark.git",
  commit: "252232ac29669beeb99cb6474eeb2736761be508",
  data: "data/pii_benchmark_full.json",
  sha256: "f8cb68bf5e54791decd9190792766b37e623bdb346b1641c1d1fd146ddec6d1c",
  lfsPaths: ["data/pii_benchmark_full.json"],
} as const;

export const KIJI = {
  name: "kiji",
  dataset: "DataikuNLP/kiji-pii-training-data",
  revision: "0275550f0b1f1b8f2dc9356fd31ac1c788b8228b",
  files: [
    {
      path: "data/train-00000-of-00001.parquet",
      sha256:
        "9b37af7eea2718af8cb6696fbe01a4bfd01dc6160716c272c2ce0835e71846de",
    },
    {
      path: "data/test-00000-of-00001.parquet",
      sha256:
        "916c63792345bf3c2e0888941b3d14526c43b7c7fe8af60e0d283fed71b1234d",
    },
  ],
} as const;

export const GRETEL = {
  name: "gretel",
  dataset: "gretelai/synthetic_pii_finance_multilingual",
  revision: "7b844d16738527a04264f50214cb426a4cea0897",
  files: [
    {
      path: "data/train-00000-of-00001.parquet",
      sha256:
        "89bfe27e37e50098347f47f974e5e43f64a521f38171b618600ea7aa9b4fa430",
    },
    {
      path: "data/test-00000-of-00001.parquet",
      sha256:
        "014e1057978f030fce4f4cad7c93b9e3377fd0ded713d2bf4c7de00e3e3c8c72",
    },
  ],
} as const;
