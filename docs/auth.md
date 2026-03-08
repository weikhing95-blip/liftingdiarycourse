# Auth Coding Standards

## Authentication Provider: Clerk Only

This app uses [Clerk](https://clerk.com/) exclusively for authentication. Do not use any other auth library or roll custom auth logic.

### Rules

- **ONLY** Clerk APIs and components are permitted for authentication.
- **NO** custom session management, JWT handling, or cookie-based auth.
- **NO** other auth libraries (e.g., NextAuth, Auth.js, Lucia, Supabase Auth).
- The authenticated `userId` **MUST** always come from the server-side Clerk session — never from client-supplied input (query params, request body, cookies you read manually, etc.).

---

## Middleware

Clerk middleware is configured in `src/proxy.ts` (note: **not** `middleware.ts`).

```ts
// src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

Do not rename this file to `middleware.ts` or move it — Next.js picks it up via the project config.

---

## Getting the Current User (Server-Side)

Use `auth()` from `@clerk/nextjs/server` inside Server Components, Server Actions, and Route Handlers.

```ts
import { auth } from "@clerk/nextjs/server";

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    // User is not signed in — redirect or return early
    redirect("/sign-in");
  }

  // userId is now safe to use for scoped DB queries
}
```

### Rules

- **ALWAYS** call `auth()` server-side — never client-side.
- **ALWAYS** check that `userId` is non-null before using it. A null `userId` means the user is unauthenticated.
- **NEVER** pass `userId` from the client to the server (e.g., via form fields or query params) and trust it — always derive it from `auth()`.

---

## Protecting Routes

Use Clerk's `auth()` to guard Server Components and redirect unauthenticated users.

```ts
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // render protected content
}
```

To protect entire route groups, apply the redirect in the layout instead of repeating it in every page.

---

## Client-Side Auth

Use Clerk's React hooks only for reading auth state in Client Components (e.g., to show/hide UI). Never use them to make authorization decisions — those must happen server-side.

```tsx
"use client";

import { useUser } from "@clerk/nextjs";

export function UserGreeting() {
  const { user } = useUser();
  return <p>Hello, {user?.firstName}</p>;
}
```

```tsx
// WRONG — do not use client-side auth state to gate access to data or pages
"use client";

const { userId } = useAuth();
if (!userId) return null; // ← this is UI-only, not a security boundary
```

---

## Summary Checklist

| Concern | Requirement |
|---------|-------------|
| Auth provider | Clerk only |
| Middleware file | `src/proxy.ts` |
| Server-side userId | `auth()` from `@clerk/nextjs/server` |
| Unauthenticated users | Check for null `userId`, redirect to `/sign-in` |
| Client-side auth | Clerk hooks for UI only — never for authorization |
| User-supplied userId | Never trust — always use server-side session |
