# Data Mutations

## CRITICAL RULES

### 1. Mutations via Helper Functions in `/data`

**ALL database mutations MUST go through helper functions located in the `/data` directory.**

- Do NOT write inline database mutations inside page, component, or action files
- Do NOT use raw SQL — always use **Drizzle ORM**
- Each helper function in `/data` is responsible for one focused mutation

```ts
// src/data/workouts.ts — CORRECT
import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function createWorkout(userId: string, name: string) {
  const [workout] = await db
    .insert(workouts)
    .values({ userId, name })
    .returning();
  return workout;
}
```

```ts
// WRONG — mutation written inline in an action
await db.insert(workouts).values({ userId, name });

// WRONG — raw SQL
await db.execute(sql`INSERT INTO workouts (user_id, name) VALUES (${userId}, ${name})`);
```

### 2. Server Actions via Colocated `actions.ts` Files

**ALL data mutations MUST be triggered via Server Actions defined in colocated `actions.ts` files.**

- Each route segment that needs mutations gets its own `actions.ts` file alongside its `page.tsx`
- Server Actions MUST NOT be defined inline inside component files
- Server Actions MUST NOT use Route Handlers (API routes) for mutations

```
src/app/workouts/
├── page.tsx
├── actions.ts        ← server actions live here
└── [id]/
    ├── page.tsx
    └── actions.ts    ← colocated actions for this route
```

```ts
// src/app/workouts/actions.ts — CORRECT
"use server";

export async function createWorkoutAction(...) { ... }
```

```ts
// WRONG — action defined inside a component file
// src/app/workouts/page.tsx
async function createWorkout() {
  "use server";
  ...
}
```

### 3. Typed Parameters — No FormData

**ALL Server Action parameters MUST be explicitly typed. `FormData` MUST NOT be used as a parameter type.**

- Define a specific TypeScript type or interface for each action's input
- Parameters must be typed individually or via an input object type

```ts
// CORRECT — typed parameters
export async function createWorkoutAction(name: string, startedAt: Date) { ... }

// CORRECT — typed input object
export async function updateWorkoutAction(input: { id: string; name: string }) { ... }
```

```ts
// WRONG — FormData parameter
export async function createWorkoutAction(formData: FormData) { ... }
```

### 4. Validate All Arguments with Zod

**ALL Server Actions MUST validate their arguments using Zod before doing anything else.**

- Define a Zod schema for each action's input
- Call `.parse()` or `.safeParse()` at the top of the action body before any logic
- Do NOT trust or use raw arguments before validation

```ts
// src/app/workouts/actions.ts — CORRECT
"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createWorkout } from "@/data/workouts";

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function createWorkoutAction(input: { name: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { name } = createWorkoutSchema.parse(input);

  return createWorkout(userId, name);
}
```

```ts
// WRONG — no validation before using arguments
export async function createWorkoutAction(input: { name: string }) {
  return createWorkout(userId, input.name); // ← input is never validated
}
```

### 5. User Data Isolation in Mutations

**Mutations MUST be scoped to the authenticated user.** Never trust a user-supplied ID for ownership.

- Always retrieve `userId` from the server-side session via `auth()` from `@clerk/nextjs/server`
- Pass `userId` from the action into the data helper — never accept it as a client-supplied parameter
- Data helpers that mutate user-owned records MUST filter by `userId` to prevent unauthorized modification

```ts
// CORRECT — userId comes from session, not from the caller
export async function deleteWorkoutAction(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = z.string().uuid().parse(workoutId);

  return deleteWorkout(id, userId); // helper filters by both id and userId
}
```

```ts
// WRONG — userId accepted as a parameter (caller-controlled)
export async function deleteWorkoutAction(workoutId: string, userId: string) { ... }
```

## Summary Checklist

| Rule | Requirement |
|------|-------------|
| Where mutations live | `/data` directory helper functions |
| ORM | Drizzle ORM — no raw SQL |
| How mutations are triggered | Server Actions only — no Route Handlers |
| Where actions are defined | Colocated `actions.ts` files |
| Parameter types | Explicit TypeScript types — no `FormData` |
| Input validation | Zod — validate before any logic |
| User scoping | `userId` from server-side session only |
