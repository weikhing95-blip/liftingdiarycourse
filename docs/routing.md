# Routing

## Route Structure

All application routes must be nested under `/dashboard`.

- The root `/` page should redirect to `/dashboard`
- Feature pages live at `/dashboard/<feature>` (e.g. `/dashboard/workout`, `/dashboard/history`)

## Route Protection

All `/dashboard` routes (and any sub-routes) are protected — they are only accessible by authenticated users.

Route protection is handled exclusively via **Next.js middleware** (`src/proxy.ts`). Do not implement auth checks inside individual page components or layouts.

### Rules

- Use Clerk's middleware helpers (`clerkMiddleware`, `createRouteMatcher`) to define protected routes
- Match all `/dashboard` routes with a pattern like `/dashboard(.*)`
- Redirect unauthenticated users to the sign-in page automatically via the middleware
- Public routes (e.g. `/sign-in`, `/sign-up`) must be explicitly allowlisted in the matcher

### Example

```ts
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
```
