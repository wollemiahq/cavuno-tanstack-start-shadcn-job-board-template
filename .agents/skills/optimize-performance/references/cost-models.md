# Cost models

Use this reference when comparing designs before implementation or when no local operation-cost ladder exists.

## Contents

- [Use the ladder as intuition](#use-the-ladder-as-intuition)
- [Historical starting estimates](#historical-starting-estimates)
- [Work a dominant-term estimate](#work-a-dominant-term-estimate)
- [Replace estimates with local costs](#replace-estimates-with-local-costs)

## Use the ladder as intuition

Estimate `count × rough cost` for each important operation, then sum resource work. For elapsed latency, place dependent operations on the critical path and overlap independent work. Refine only terms large enough to change the decision.

The values below come from Dean and Ghemawat's [Performance Hints estimation section](https://abseil.io/fast/hints.html#estimation), whose page was last updated 2025-12-16. Treat them as historical order-of-magnitude starting estimates, not defaults. Hardware, cloud placement, power state, contention, storage, runtime, and payload shape can change them substantially.

## Historical starting estimates

| Operation | Rough cost |
| --- | ---: |
| L1 cache reference | 0.5 ns |
| L2 cache reference | 3 ns |
| Branch misprediction | 5 ns |
| Uncontended mutex lock/unlock | 15 ns |
| Main-memory reference | 50 ns |
| Compress 1 KB with Snappy | 1,000 ns |
| Read 4 KB from SSD | 20,000 ns |
| Round trip within one datacenter | 50,000 ns |
| Read 1 MB sequentially from memory | 64,000 ns |
| Read 1 MB over a 100 Gbps network | 100,000 ns |
| Read 1 MB from SSD | 1,000,000 ns |
| Disk seek | 5,000,000 ns |
| Read 1 MB sequentially from disk | 10,000,000 ns |
| California–Netherlands–California packet trip | 150,000,000 ns |

Treat these numbers only as a scale ladder: cache and branch effects compound inside tight loops; network and storage round trips dominate surprisingly large amounts of local computation. Use target-system measurements for actual comparisons.

## Work a dominant-term estimate

For one billion 4-byte values, an `O(N log N)` comparison sort makes roughly 30 passes over 4 GB. At an assumed 16 GB/s per core, memory transfer contributes about 7.5 seconds. If roughly 15 billion comparisons mispredict at 5 ns each, branch misses contribute about 75 seconds.

This estimate predicts branch behavior dominates. Investigate or benchmark that term before refining cache levels. If a branch-friendly algorithm changes the comparison pattern, rebuild the model; if measured bandwidth differs, replace the assumption. The purpose is to choose the next experiment, not predict an exact runtime.

For concurrent I/O, separate resource work from latency. Thirty independent reads still consume thirty reads of work, but with enough independent devices their latency can overlap; on one device, seek and transfer costs may serialize.

## Replace estimates with local costs

Maintain a dated project ladder:

| Operation | Workload or size | Environment | Rough range | Measured | Command or trace |
| --- | --- | --- | --- | --- | --- |
| Example: indexed database point read | warm single-row lookup | staging region A | 2–4 ms | YYYY-MM-DD | benchmark command |

Measure high-level operations the system actually performs: database point reads, cache hits and misses, service calls, serialization, rendering, queue waits, allocation, compression, or storage access. Prefer ranges or distributions to single values. Local measurements supersede every historical value above.

Source attribution: Jeffrey Dean and Sanjay Ghemawat, [Performance Hints](https://abseil.io/fast/hints.html), 2025. The publishing [Abseil documentation repository](https://github.com/abseil/abseil.github.io) is Apache-2.0 licensed.
