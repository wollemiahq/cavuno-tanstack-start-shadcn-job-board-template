# Implementation levers

Read this catalog only after measurement identifies the dominant resource. Each lever is a hypothesis family, not a default rewrite.

## Contents

- [Algorithms and access patterns](#algorithms-and-access-patterns)
- [APIs and bulk work](#apis-and-bulk-work)
- [Eliminate or defer work](#eliminate-or-defer-work)
- [Representation and locality](#representation-and-locality)
- [Allocation, ownership, and copying](#allocation-ownership-and-copying)
- [Specialization and code size](#specialization-and-code-size)
- [Concurrency and synchronization](#concurrency-and-synchronization)
- [Instrumentation and caching](#instrumentation-and-caching)

## Algorithms and access patterns

Change asymptotic behavior before tuning instructions. Replace repeated searches, incremental graph updates, or ordered lookups when the workload permits a cheaper algorithm. Account for constants, locality, input size, and construction cost; a theoretically better structure can lose on small or skewed inputs.

## APIs and bulk work

Cross expensive boundaries once for many items. Bulk APIs can amortize locks, validation, dispatch, serialization, allocation, and network round trips while enabling whole-input algorithms. Keep the public interface narrow and return only information callers use. When callers cannot batch directly, consider a bounded internal buffer or cache and state its latency and memory tradeoffs.

Use non-owning views for borrowed inputs and allow callers to provide reusable scratch space or precomputed values when ownership and lifetimes remain clear.

Keep implementation freedom behind deep modules. Every compatibility promise—stable iterators, universal thread safety, rich errors, extensible callbacks, or persistent object identity—can impose cost on callers that never use it. Add such promises only when the API contract requires them.

## Eliminate or defer work

- Add a fast path for common inputs while retaining a clear general path.
- Precompute stable information once.
- Hoist invariant work out of loops.
- Delay expensive work until its result is required.
- Skip logging, formatting, statistics, parsing, or validation that the active mode does not consume.
- Replace a general operation with a cheaper equivalent when the input contract proves it sufficient.

Calculate hit rates and invalidation frequency. A branch, cache, or lazy value that rarely hits can add cost.

## Representation and locality

Reduce bytes touched, indirections, and cache lines:

- choose compact field widths when ranges are proven;
- reorder fields to reduce padding and separate hot, cold, read-mostly, and frequently written data;
- prefer contiguous or batched storage for hot traversal;
- replace pointers with stable indices when ownership permits;
- inline the common small case;
- use arrays or bitsets for small dense key spaces;
- choose compound-key or nested maps from key size and access locality: compound keys avoid a second lookup, while nesting can avoid repeating a large first key and improve grouped access;
- group fields by access pattern and isolate frequently written shared fields when false sharing is measured.

Encapsulate bit-packed representations inside a well-tested boundary. Measure the entire lifecycle: a compact read path can make mutation, construction, alignment, or memory use worse.

## Allocation, ownership, and copying

Use allocation profiles to target the highest contributors. Reserve known capacities, reuse temporary storage, move or borrow values when ownership allows, use stack allocation for bounded objects in runtimes that expose that choice, allocate related short-lived objects together, and avoid per-item wrappers on hot paths.

Treat pooling and arenas as lifecycle choices: they can reduce allocator work and improve locality, but may increase retained memory, complicate ownership, or delay reclamation.

Choose `reserve` when element construction is expensive and `resize` when the final initialized size is known. Grow geometrically rather than reserving one element at a time. Reused containers retain their high-water capacity; reconstruct them periodically when rare large inputs would otherwise pin memory.

## Specialization and code size

Specialize stable, frequent cases when it removes general dispatch or repeated checks. Keep uncommon code out of hot inline bodies. Inspect compiler output or inlining reports before forcing inline decisions. Reduce repeated template or generated-code instantiation when code size or instruction-cache evidence points there.

Balance dynamic dispatch, branches, inlining, and code size with measurements; none is universally cheaper.

After profiles or counters justify low-level work, help the compiler by moving slow paths out of line, keeping hot values in local alias-free variables, simplifying abstractions in the innermost loop, or processing several items per iteration. Inspect generated code after each change; manual unrolling and SIMD are evidence-driven terminal levers.

## Concurrency and synchronization

Exploit independent work when the task is large enough to amortize scheduling and coordination and spare CPU or memory bandwidth exists. Prefer batching before adding threads. Reduce lock acquisition frequency, shorten critical sections, shard independently accessed state, buffer producer/consumer pipelines, and process tiny work inline when scheduling dominates.

Move RPCs, file access, and expensive destructors outside critical sections. Shard only when cross-shard invariants are absent. Preserve hash entropy by deriving shard selection independently from the bits later used by the shard's own table.

Use lock-free or atomic designs only with a proven contention problem, a suitable higher-level abstraction, and strong correctness validation. Check tail latency, fairness, memory use, and context switches as well as throughput.

## Instrumentation and caching

Move formatting and aggregation off hot paths, sample or batch metrics, and ensure disabled logging performs minimal work.

Cache only when repeated computation is measured and invalidation, capacity, locality, and concurrency semantics are explicit. Report hit rate and memory cost. Prefer a structural reduction in repeated work when it is simpler than maintaining a cache.
