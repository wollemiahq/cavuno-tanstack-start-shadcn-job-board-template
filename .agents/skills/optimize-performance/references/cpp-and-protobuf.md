# C++ and Protocol Buffers notes

Use these notes only after the general measurement loop identifies a relevant C++ or Protocol Buffers cost. Verify library-specific advice against the project's current toolchain and official documentation.

## Contents

- [C++ interfaces and containers](#c-interfaces-and-containers)
- [Allocation and code generation](#allocation-and-code-generation)
- [Protocol Buffers](#protocol-buffers)

## C++ interfaces and containers

- Prefer borrowed view types such as `std::span`, `std::string_view`, or their project equivalents when the callee does not take ownership. Prove lifetimes.
- Consider flat hash tables for hot unordered lookup, B-tree containers for ordered data with locality needs, inline vectors for usually-small sequences, and bit vectors or arrays for dense bounded domains. Benchmark the actual key/value sizes and mutation pattern.
- Consider small-container fallbacks when collections usually fit inline but occasionally grow, and intrusive lists when element ownership already provides stable link storage. Prefer project-standard implementations.
- Use smaller stored integer types only after validating range and conversion behavior.
- Stable indices into contiguous storage can replace pointer-heavy node ownership when object movement and deletion semantics permit it.
- Make synchronization an API property: externally synchronized types avoid universal locking costs, while internally synchronized types can hide future sharding. Choose from observed caller behavior.

## Allocation and code generation

- Reserve containers when capacity is predictable.
- Reuse scratch objects across loop iterations when retained capacity is bounded.
- Use arenas for related lifetimes after measuring retained memory.
- Keep uncommon work out of inline functions on hot call sites.
- Inspect template instantiations and generated symbols when binary size, compile time, or instruction-cache pressure is measured.
- Avoid rich status objects on extremely hot paths only when the error contract genuinely needs no details; retain clear failure semantics.

## Protocol Buffers

Protocol Buffers optimize interoperability and durable serialization, not arbitrary in-memory computation. When profiles implicate them:

- use plain in-memory structures for data used only inside the process;
- flatten message hierarchy when nesting has no semantic value;
- assign frequently occurring fields numbers 1–15 when compatible with schema evolution; their tags use one byte, while field numbers 16–2047 use two;
- choose `int`, `sint`, and fixed-width encodings from the measured value distribution; small negative values favor zigzag `sint`, while large or hash-like values may favor fixed width;
- pack repeated numeric primitives in proto2 when compatible; proto3 packs them by default;
- use `bytes` for binary payloads and `string` for text;
- avoid rebuilding or copying large messages repeatedly;
- reserve repeated fields and reuse message objects when lifetimes allow;
- consider arenas for allocation-heavy message trees;
- keep schema files narrow enough to avoid pulling unrelated generated code into binaries;
- consider serialized storage for large, long-lived collections when only a subset is accessed;
- parse a compatible subset message when only a few fields are needed;
- prefer repeated key/value messages or an application map when protobuf map fields appear in measured hot paths;
- consider view-backed fields only when the serialized backing storage outlives the parsed message;
- consider cord-like storage for large fields when measured length distributions and access patterns favor cheap sharing or appends.

Treat schema and wire-format changes as compatibility work. Validate generated-code size, serialized size, parse/serialize cost, ownership, and unknown-field behavior before adopting them.
