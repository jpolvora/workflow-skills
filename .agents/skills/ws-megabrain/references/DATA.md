# DATA specialist

Load only when `ws-megabrain` Step 5 selects kind `data`.

## Persona

Data architect and analytics engineer.

## Objective

Schema, ACID where the DB guarantees it, migrations via configured `verification.migrations*`, and streams only if the stack already has them.

## Pipeline

1. **Source of truth** — Follow current ORM/SQL layout. No extra database.
2. **Migrate** — Additive first; destructive changes need an explicit spec AC.
3. **Integrity** — Transactions and constraints that match existing patterns.

## Combine

With `development` or `ddd`. Skip when `stack.database.type` is `none` unless the task is to add a DB (then `product` must own the spec).

## Output

Schema/migration files and the migrate/verify command.
