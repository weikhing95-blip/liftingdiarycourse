# UI Coding Standards

## Component Library: shadcn/ui Only

All UI in this project **must** use [shadcn/ui](https://ui.shadcn.com/) components exclusively.

### Rules

- **ONLY** shadcn/ui components are permitted for UI elements.
- **NO** custom components may be created. If a UI need arises, find the appropriate shadcn/ui component.
- **NO** third-party UI libraries other than shadcn/ui (e.g., no MUI, Chakra UI, Ant Design, etc.).
- **NO** raw HTML elements styled with Tailwind as standalone components (e.g., no wrapping a `<button>` in a custom `Button.tsx`).
- Tailwind CSS utility classes may be used **only** to adjust layout, spacing, or override styles on top of existing shadcn/ui components.

### Adding shadcn/ui Components

Install components using the shadcn CLI:

```bash
npx shadcn@latest add <component-name>
```

Components are added to `src/components/ui/`. Do not modify these generated files — apply customizations via `className` props at the usage site.

### Correct Usage Example

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

### Incorrect Usage (Forbidden)

```tsx
// ❌ Do NOT create custom wrapper components
export function MyButton({ children }: { children: React.ReactNode }) {
  return <button className="bg-blue-500 px-4 py-2 rounded">{children}</button>
}

// ❌ Do NOT use raw HTML elements as reusable UI components
export function Section({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border rounded">{children}</div>
}
```

### Available shadcn/ui Components

Refer to the [shadcn/ui component library](https://ui.shadcn.com/docs/components) for the full list of available components, including:

- Layout: `Card`, `Separator`, `ScrollArea`, `AspectRatio`
- Navigation: `NavigationMenu`, `Breadcrumb`, `Tabs`
- Forms: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `Form`
- Feedback: `Alert`, `Badge`, `Progress`, `Skeleton`, `Toast` / `Sonner`
- Overlays: `Dialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `HoverCard`, `DropdownMenu`, `ContextMenu`
- Data: `Table`, `DataTable`

If the needed UI pattern does not map to an existing shadcn/ui component, consult with the team before creating anything custom.

---

## Date Formatting

All date formatting must use [date-fns](https://date-fns.org/).

### Format

Dates must be displayed in the following format: **`do MMM yyyy`**

```
1st Jan 2025
2nd Mar 2021
3rd Oct 2023
4th Feb 2024
```

### Usage

```tsx
import { format } from "date-fns"

format(new Date("2025-01-01"), "do MMM yyyy") // "1st Jan 2025"
format(new Date("2021-03-02"), "do MMM yyyy") // "2nd Mar 2021"
```

### Installing date-fns

```bash
npm install date-fns
```

### Rules

- **ONLY** use `date-fns` for date formatting — no `Intl.DateTimeFormat`, `toLocaleDateString()`, or manual string construction.
- Always use the `do MMM yyyy` format token when displaying dates to users.
