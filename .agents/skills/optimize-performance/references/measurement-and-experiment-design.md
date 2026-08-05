# Measurement and experiment design

Use this reference before creating or judging a benchmark, profile, or performance claim.

## Contents

- [Define representative work](#define-representative-work)
- [Build a cost model](#build-a-cost-model)
- [Choose the measurement](#choose-the-measurement)
- [Protect benchmark integrity](#protect-benchmark-integrity)
- [Interpret the result](#interpret-the-result)

## Define representative work

Specify the operation, input distribution, concurrency, dataset size, cache state, and lifecycle phase. Separate setup from steady state when they have different budgets. For services, include tail latency and production concurrency; for libraries, cover the common case and an adversarial scale; for batch work, include total resource use as well as elapsed time.

A microbenchmark answers whether a mechanism became cheaper. An end-to-end benchmark answers whether the system benefited. Use both when call frequency, caching, I/O, scheduling, or downstream work can dilute or reverse a local gain.

## Build a cost model

Estimate:

`total resource cost ≈ Σ(operation count × operation cost)`

For latency, place dependencies on the critical path instead of summing work that overlaps. For throughput, identify the saturated resource. For memory, separate live data, temporary allocation volume, fragmentation, and allocator metadata.

Maintain environment-specific rough costs for relevant operations such as database reads, network round trips, serialization, allocation, cache misses, disk access, or rendering. Calibrate them with local measurements. Use the model to rank alternatives and to check whether a benchmark result is plausible, not to manufacture precision.

When local costs are unavailable, read [cost models](cost-models.md) for a dated order-of-magnitude ladder, a worked estimate, and a template for replacing source values with local measurements.

## Choose the measurement

| Symptom | Primary evidence | Useful corroboration |
| --- | --- | --- |
| High CPU or low throughput | CPU profile with self and cumulative time | instruction count, cache/branch counters |
| High wall latency with moderate CPU | wall or off-CPU profile | I/O trace, scheduler and queue timing |
| Allocation or GC pressure | allocation profile and allocation rate | retained heap, pause time, cache misses |
| Growing or high memory | heap snapshots over time | object counts, fragmentation, resident set |
| Contention | lock/wait profile | critical-section timing, context switches |
| Binary or instruction-cache pressure | symbol/code-size report | instruction-cache misses, inlining report |
| I/O-bound work | request and storage traces | bytes, round trips, queue depth |

Profile an optimized production-like build with enough symbols to attribute costs. Profile the workload named in the contract, not whichever workload is easiest to launch.

Use tools appropriate to the runtime. `pprof` is a useful high-level starting point for supported binaries; `perf` and platform equivalents expose lower-level counters. Treat profiling unfamiliar code as architectural discovery: follow the dynamic call graph into the routines that multiply the measured cost.

## Protect benchmark integrity

- Compare the same code path, inputs, build flags, hardware, power mode, and dependency state.
- Warm runtimes, JITs, pools, and caches according to the intended scenario.
- Run enough interleaved or randomized samples to expose drift and variance.
- Prevent dead-code elimination and verify that outputs are consumed.
- Keep setup outside the timed region unless setup is the target.
- Measure absolute values and distributions, not only percentages.
- Inspect outliers; report rather than silently trim them.
- Confirm that a microbenchmark has not removed contention, I/O, allocation, or batching behavior central to production.
- Record the command, revision, environment, and inputs needed to reproduce the result.

## Interpret the result

Ask whether the measured change matches the predicted mechanism. A surprising win or loss is new diagnostic evidence, not automatic success or failure.

Classify the outcome:

- **Confirmed:** direction and scale are plausible, repeated, and representative.
- **Local only:** the mechanism improved but system impact is diluted; report both.
- **Inconclusive:** confidence interval or run-to-run noise covers the effect.
- **Regressed elsewhere:** the primary metric improves while a guardrail worsens.
- **Falsified:** the expected mechanism does not move; update the hypothesis.

Use a regression benchmark only when it reliably detects the mechanism, finishes within the project's test budget, and does not freeze irrelevant machine-specific numbers.
