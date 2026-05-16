---
name: shadcn-manual-setup
description: >
  Sets up shadcn/ui component library without the interactive CLI. Use this
  skill whenever you need to add shadcn/ui to a project and the `npx shadcn@latest init`
  CLI is unavailable or unusable — for example in CI pipelines, AI agent sessions,
  automated scaffolding scripts, or any context where interactive terminal prompts
  cannot be answered. Also use it when adding individual shadcn components without
  running `npx shadcn add`. Covers both Tailwind v3 and Tailwind v4 setups.
---

# shadcn/ui Manual Setup (No CLI)

The `npx shadcn@latest init` and `npx shadcn add` commands are **fully interactive** — they
present arrow-key menus that cannot be bypassed with flags alone. In non-interactive
environments (CI, AI coding agents, scripts), you must set everything up by hand.

## Step 1 — Install peer dependencies

```bash
# Core utilities (always needed)
pnpm add class-variance-authority clsx tailwind-merge

# Radix UI primitives — install only what you need
pnpm add @radix-ui/react-slot          # Button (asChild pattern)
pnpm add @radix-ui/react-dialog
pnpm add @radix-ui/react-dropdown-menu
pnpm add @radix-ui/react-select
pnpm add @radix-ui/react-tabs
pnpm add @radix-ui/react-progress
pnpm add @radix-ui/react-toast
pnpm add @radix-ui/react-label
pnpm add @radix-ui/react-separator
pnpm add lucide-react                  # Icons (shadcn default)
```

## Step 2 — Create `components.json`

This file tells shadcn/ui where things live (required for `npx shadcn add` to work later
if you want, and documents the setup for collaborators):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Set `"config": ""` for Tailwind v4 (no `tailwind.config.ts`). For Tailwind v3, point it at
`"tailwind.config.ts"`.

## Step 3 — Create `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Step 4 — Add CSS variables to `globals.css`

### Tailwind v4 (uses `@theme inline` + `hsl()` wrappers)

```css
@import "tailwindcss";

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode values ... */
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

### Tailwind v3 (uses `tailwind.config.ts` + standard HSL variables)

In `tailwind.config.ts`, extend the theme:

```typescript
theme: {
  extend: {
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      // ... etc
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },
  },
}
```

Then in `globals.css` add `:root { --background: 0 0% 100%; ... }` (same HSL values).

## Step 5 — Write component files

Copy the component source from the [shadcn/ui GitHub repository](https://github.com/shadcn-ui/ui/tree/main/apps/www/registry/default/ui) or write them by hand. Each component:

- Lives in `components/ui/<name>.tsx`
- Imports `cn` from `@/lib/utils`
- Is a `'use client'` component if it uses Radix primitives
- Uses `cva` from `class-variance-authority` for variants

### Key pattern — Button with variants

```typescript
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ...',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground ...',
        outline: 'border border-input bg-background ...',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
```

## Common gotchas

- **Tailwind v4 + shadcn**: Use `@theme inline` to map CSS custom properties to Tailwind
  utilities. The `tailwind.config.ts` file is not used in v4.
- **`@layer base` border reset**: Without `* { @apply border-border; }`, borders on
  shadcn components will be invisible.
- **`'use client'`**: All Radix-based components need this directive. Pure wrapper
  components (Card, Badge, Skeleton) do not.
- **Zod schema order matters for `trim()`**: Use `z.string().trim().min(1)` not
  `z.string().min(1).trim()`. The latter validates before trimming, so whitespace-only
  strings incorrectly pass `min(1)`.
- **Toast**: Requires a `Toaster` component in the root layout AND a `useToast` hook.
  Both must be set up — the toast component alone does nothing.
