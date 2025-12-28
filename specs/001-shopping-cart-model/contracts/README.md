# Domain Contracts

This directory contains TypeScript interface definitions and type contracts for the Shopping Cart domain model. These contracts serve as the blueprint for implementation.

## Files

- `value-objects.ts` - Value Object interfaces
- `entities.ts` - Entity interfaces
- `aggregates.ts` - Aggregate Root interfaces
- `repositories.ts` - Repository interfaces
- `exceptions.ts` - Domain exception types
- `dtos.ts` - Data Transfer Object interfaces (Application layer)

## Usage

These contracts define the public API surface of domain objects. Implementation files in `src/domain/` must satisfy these interfaces.

**Note**: These are planning artifacts. During implementation, you may adjust based on TypeScript requirements, but maintain the core structure and behavior defined here.
