# Performance case studies

Read these compact studies when a lever remains abstract, a flat profile suggests several small wins, or a microbenchmark result needs system-level interpretation. Treat every mechanism as a hypothesis for the current workload.

## Contents

- [Bulk lookup changes more than call count](#bulk-lookup-changes-more-than-call-count)
- [Flat and nested maps are workload choices](#flat-and-nested-maps-are-workload-choices)
- [A smaller fast path can run faster](#a-smaller-fast-path-can-run-faster)
- [Allocator gains compose and dilute](#allocator-gains-compose-and-dilute)
- [Instrumentation belongs in the performance budget](#instrumentation-belongs-in-the-performance-budget)
- [Sharding needs independent invariants and entropy](#sharding-needs-independent-invariants-and-entropy)
- [Many local changes can move a flat profile](#many-local-changes-can-move-a-flat-profile)

## Bulk lookup changes more than call count

**Before:** a caller performs one lookup per item. Each crossing repeats locking, validation, status construction, and dispatch.

**After:** a `lookupMany(keys, outputs)`-style API crosses once, acquires shared state once, and returns only the aggregate fact callers use. When callers cannot batch, decoding a whole block once and caching its entries can recover the same leverage internally.

**Lesson:** batching can expose a better algorithm and a narrower result contract, not merely remove function calls. Measure batch size, latency, memory, partial-failure semantics, and caller disruption.

Source: [Bulk APIs](https://abseil.io/fast/hints.html#bulk-apis).

## Flat and nested maps are workload choices

One change replaced `map<A, map<B, C>>` with `map<pair<A, B>, C>`, reducing allocations and lookups. Another moved in the opposite direction and improved a microbenchmark by 76% because a large first key repeated roughly 1,000 times and grouped accesses reused the inner table.

**Lesson:** “remove nesting” is not a rule. Estimate repeated key bytes, number of lookups, locality of grouped access, allocation shape, and hash/comparison cost. Benchmark the observed distribution.

Source: [Unnecessarily nested maps](https://abseil.io/fast/hints.html#unnecessarily-nested-maps).

## A smaller fast path can run faster

A varint parser once inlined both one-byte and two-byte cases. Moving the two-byte case to the slow routine made the common inlined path smaller and improved instruction-cache behavior.

**Lesson:** a fast path should cover the highest-value common case, not the maximum number of cases. Include code size and instruction-cache evidence when deciding where the boundary belongs.

Source: [Fast paths for common cases](https://abseil.io/fast/hints.html#fast-paths-for-common-cases).

## Allocator gains compose and dilute

A GPU allocator combined several mechanisms:

1. replace pointers with compact handles into contiguous storage;
2. reuse handle records through a free list;
3. replace tree-searched bins with directly indexed bins;
4. add a common no-retry fast path;
5. remove hot logging;
6. add a contention-aware benchmark.

Allocation microbenchmarks improved roughly 36–48%, while an application benchmark improved about 2.9%.

**Lesson:** several mutually reinforcing changes can be justified by one resource model, but local gains dilute when the optimized component is only part of system time. Report both scales.

Source: [Changes that demonstrate multiple techniques](https://abseil.io/fast/hints.html#cls-that-demonstrate-multiple-techniques).

## Instrumentation belongs in the performance budget

The source examples remove unused statistics, sample expensive measurements, reduce a sampling rate from 1-in-10 to 1-in-32, avoid touching dozens of histograms on every request, remove disabled logging from allocator internals, and hoist log-enabled checks outside nested loops.

**Lesson:** observability can be the hot path. Measure disabled-path cost, formatting, atomics, cache-line writes, clock reads, and sampling decisions. Preserve the minimum signal required to operate the system, then sample or batch the rest.

Sources: [Reduce stats collection costs](https://abseil.io/fast/hints.html#reduce-stats-collection-costs) and [Avoid logging on hot code paths](https://abseil.io/fast/hints.html#avoid-logging-on-hot-code-paths).

## Sharding needs independent invariants and entropy

Sharding a contended map can multiply throughput when each key belongs to exactly one shard and no invariant spans shards. A subtle failure appears when shard selection consumes the same hash bits the inner hash table later expects; the inner table receives a skewed distribution.

**Lesson:** verify cross-shard semantics, key skew, shard count, lock wait, and the independence of shard and table hashing. More shards can increase memory and coordination costs.

Source: [Reduce contention by sharding](https://abseil.io/fast/hints.html#reduce-contention-by-sharding).

## Many local changes can move a flat profile

An XLA compilation case combined pointer access to backing arrays, preformed views, fewer virtual calls, a status-free visitor for a proven hot success path, fixed-size specialization, a one-dimensional fast path, and deferred sharding work. The largest compilation improved by about 31%, while the overall program improved about 19%.

**Lesson:** after structural bottlenecks are exhausted, a stable benchmark can support several small changes. Keep each mechanism measurable where possible, then run the complete stack to detect interaction and dilution.

Source: [Reduce XLA compilation time by improving Shape handling](https://abseil.io/fast/hints.html#cls-that-demonstrate-multiple-techniques).
