# Data Fetching

## CRITICAL RULES

### 1. Server Components Only

**ALL data fetching MUST be done via React Server Components.**

- Data MUST NOT be fetched via Route Handlers (API routes under `src/app/api/`)
- Data MUST NOT be fetched client-side (no `useEffect` + `fetch`, no SWR, no React Query)
- If a component needs data, it must either be a Server Component itself, or receive data as props from a parent Server Component

```tsx
// CORRECT — fetch data in a Server Component
export default async function WorkoutsPage() {
  const workouts = await getWorkoutsByUser(userId);
  return <WorkoutList workouts={workouts} />;
}

// WRONG — do not use route handlers for data fetching
// GET /api/workouts → returns JSON → fetched client-side
```

### 2. Database Queries via Helper Functions in `/data`

**ALL database queries MUST go through helper functions located in the `/data` directory.**

- Do NOT write inline database queries inside page or component files
- Do NOT use raw SQL — always use **Drizzle ORM**
- Each helper function in `/data` is responsible for one focused query or mutation

```ts
// src/data/workouts.ts — CORRECT
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkoutsByUser(userId: string) {
  return db.select().from(workouts).where(eq(workouts.userId, userId));
}
```

```ts
// WRONG — raw SQL
const result = await db.execute(sql`SELECT * FROM workouts WHERE user_id = ${userId}`);

// WRONG — query written inline in a page component
const workouts = await db.select().from(workoutsTable).where(...);
```

### 3. User Data Isolation — NEVER Return Another User's Data

**A logged-in user MUST only ever be able to access their own data.**

This is a security requirement, not a preference.

Every single data helper function that reads user-specific data **MUST** filter by the authenticated user's ID. Never trust a user-supplied ID from params or query strings without verifying it matches the authenticated session.

```ts
// CORRECT — always scope queries to the authenticated user
export async function getWorkout(workoutId: string, userId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  return workout ?? null;
}
```

```ts
// WRONG — fetching by ID alone without scoping to the current user
export async function getWorkout(workoutId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId)); // ← any user's data could be returned
  return workout;
}
```

The authenticated `userId` must always come from the **server-side session** (e.g., from your auth library's `getSession()` or equivalent), never from client-supplied input.

## Summary Checklist

| Rule | Requirement |
|------|-------------|
| Where to fetch data | Server Components only |
| Route Handlers for data | Never |
| Where queries live | `/data` directory helper functions |
| ORM | Drizzle ORM — no raw SQL |
| Data scoping | Always filter by authenticated `userId` from server session |
