# Diagnosis and hypothesis menu

Use this reference to localize a bottleneck and turn observations into ranked, falsifiable hypotheses.

## Contents

- [Start from the symptom](#start-from-the-symptom)
- [Read profiles causally](#read-profiles-causally)
- [Handle flat profiles](#handle-flat-profiles)
- [Rank hypotheses](#rank-hypotheses)

## Start from the symptom

### Latency

Split on-CPU time from waiting. Find the critical path, serialization points, queueing, repeated round trips, and fan-out that amplifies tail latency. Compare median and tail behavior; different causes often dominate each.

### Throughput or CPU

Find the saturated resource. In CPU profiles, consider both self cost and high-level loops that multiply cheap callees. Check whether work scales with requests, items, bytes, graph edges, or another input dimension.

### Allocation or memory

Separate allocation rate from retained memory and peak working set. High allocation rate points toward temporary objects, copying, container growth, or GC pressure. High retained memory points toward representation, ownership, cache policy, or leaks. High resident memory with modest live data may indicate fragmentation or page/cache behavior.

### Contention

Measure wait time and lock ownership, not CPU utilization alone. Inspect critical-section duration, acquisition frequency, shared hot fields, queue depth, false sharing, and context switches.

### Code size

Attribute bytes to symbols, templates, generated code, and inlined call sites. Correlate size with build cost or instruction-cache evidence before optimizing for size alone.

## Read profiles causally

- **Self time** identifies expensive local work.
- **Cumulative time** identifies callers and loops that multiply downstream work.
- **Frequency without high self time** can reveal an API boundary crossed too often.
- **Off-CPU time** reveals waits hidden by a CPU-only view.
- **Allocation counts** can matter even when allocated bytes are modest.
- **Hardware counters** help distinguish instructions, cache misses, branches, and memory bandwidth when source-level profiles look similar.

Inspect source around the dynamic call graph after locating the active path. Confirm call frequency and data scale in code rather than inferring them from a single flame graph.

## Handle flat profiles

A flat profile means no single leaf dominates; broaden the lens:

1. Move upward to loops and orchestration code that repeat many small costs.
2. Compare algorithms and data flow, including incremental work that could become bulk work.
3. Look for over-general operations on common inputs.
4. Collect allocation, lock, I/O, and hardware-counter profiles.
5. Examine data representation and cache locality.
6. Use a stable benchmark to accumulate several small, independent improvements only when the system target justifies it.

## Rank hypotheses

For each candidate, record:

| Field | Question |
| --- | --- |
| Observation | What measured fact needs explaining? |
| Cause | What code or design choice creates it? |
| Mechanism | Why should changing it move the target metric? |
| Scale | How often does it occur and what is the plausible upper bound? |
| Falsifier | What measurement would disprove it? |
| Tradeoff | What correctness, memory, complexity, or API cost could appear? |

Rank by expected impact multiplied by confidence, then divided by implementation and complexity cost. Test the top hypothesis with the smallest discriminating experiment.
