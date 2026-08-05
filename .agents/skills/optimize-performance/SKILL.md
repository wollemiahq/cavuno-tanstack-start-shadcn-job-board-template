---
name: optimize-performance
description: Optimize component-level software performance as a causal experiment. Use as primary for measured regressions, benchmark or profile design, performance-sensitive API or code review, or verified changes to latency, throughput, CPU, memory, allocations, code size, or contention. Send ambiguous slow-or-broken reports to general diagnosis first. For distributed systems, databases, browsers, and ML hardware, support domain guidance with evidence and verification.
---

# Optimize performance

Treat each optimization as a causal experiment: the cost model predicts, the profile localizes, and the benchmark judges. Preserve correctness and keep complexity inside an explicit budget.

## Route the request

- For diagnosis or review, gather evidence and stop after reporting ranked hypotheses unless the user also asks for changes.
- For implementation, run the complete loop.
- For new code without a baseline, classify it as test, application, or reusable library code. Protect test-cycle time and asymptotic behavior; distinguish setup from hot application paths; give library APIs extra design-time scrutiny because later callers inherit their costs and compatibility promises. Compare candidate designs with a cost model and representative prototypes. Prefer the faster design when its complexity cost is negligible.
- For distributed systems, databases, browser rendering, or ML hardware, read the relevant domain skill or authoritative guidance before selecting an intervention. Let it define domain correctness and mechanism constraints; use this loop to govern evidence and verification. When domain guidance is unavailable, deliver the performance contract and evidence plan, then report that boundary.

Read references only when their condition applies:

- Read [measurement and experiment design](references/measurement-and-experiment-design.md) before creating or judging a benchmark, profile, or performance claim.
- Read [cost models](references/cost-models.md) when estimating without local measurements, comparing designs, or building an environment-specific cost ladder.
- Read [diagnosis and hypothesis menu](references/diagnosis-and-hypothesis-menu.md) when localizing a bottleneck, choosing a profile, or facing a flat profile.
- Read [implementation levers](references/implementation-levers.md) after evidence identifies the dominant cost.
- Read [case studies](references/case-studies.md) when an implementation lever remains abstract, a flat profile calls for several small improvements, or local and system results diverge.
- Read [C++ and Protocol Buffers notes](references/cpp-and-protobuf.md) only for relevant C++ or Protocol Buffers code.

## The measurement loop

### 1. Define the performance contract

Name the metric and unit: latency distribution, throughput, CPU time, allocation rate, peak or retained memory, code size, contention, or another resource. Fix the representative workload, environment, correctness invariants, public-API and compatibility constraints, and acceptable complexity. Record a baseline when runnable code exists.

Complete this step only when the objective, workload, baseline or design alternatives, and guardrails are explicit.

### 2. Triangulate the dominant cost

Build a rough cost model from operation counts multiplied by environment-relevant costs. Measure the resource named in the contract with a production-like build and the narrowest representative benchmark. Profile CPU, waiting, allocations, locks, I/O, hardware counters, or code size according to the symptom. Use multiple evidence types when one can mislead.

State one ranked bottleneck hypothesis with:

- the observation;
- the proposed cause;
- the mechanism linking cause to metric;
- the predicted direction and approximate scale of improvement;
- the evidence that could falsify it.

Complete this step only when the leading hypothesis is evidence-backed. When measurement is unavailable, label estimates as estimates and report the missing evidence.

### 3. Select the highest-leverage intervention

Search from structural to local: algorithm and access pattern, API shape and batching, eliminated work, data representation and locality, allocation and copying, concurrency and synchronization, then instruction- or code-size details. Prefer the smallest change that tests the leading hypothesis and keeps the performance contract intact.

Complete this step only when the proposed diff maps to one causal mechanism and includes its correctness and complexity tradeoffs.

### 4. Make a controlled change

Change one dominant variable at a time where practical. Keep optimizations behind a narrow interface so callers see a simple contract while the implementation owns its complexity. Preserve a clear general path when a fast path or specialization handles only common inputs. Add or update correctness tests before trusting performance results.

Run the same benchmark before and after under comparable conditions. Include warm-up, repeated samples, and a representative system-level check when a microbenchmark could reward unrealistic behavior.

Complete this step only when correctness checks pass and the before/after measurements are comparable.

### 5. Judge and lock in the result

Report absolute values, relative change, sample count or variance, environment, and benchmark scenario. Check secondary metrics and maintenance costs. Accept the change when the improvement is meaningful and survives a representative check; revise or discard it when the result is noise, shifts cost elsewhere, or violates a guardrail. Add a regression benchmark when it is stable and cheap enough to maintain.

Complete the loop only when the final report contains the baseline, method, change, result, confidence and caveats, correctness validation, tradeoffs, and the next bottleneck or stopping reason.

## Stop conditions

Stop optimizing when the target is met, the next gain is smaller than measurement noise, the complexity cost exceeds the stated budget, or the remaining bottleneck lies outside the authorized scope. Report the evidence and boundary instead of inventing a local fix.

## Provenance

Conceptual source: Jeff Dean and Sanjay Ghemawat, [Performance Hints](https://abseil.io/fast/hints.html). This skill adapts its general principles, dated cost ladder, and selected case studies with attribution; the complete internal-code catalog remains in the primary source.

Created by the team behind [Cavuno](https://cavuno.com) and [Himalayas](https://himalayas.app).
