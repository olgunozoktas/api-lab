# Adopt shadcn/ui primitives — Button, Dialog, Select, Tabs

Priority: P2

## Context

Drop in shadcn-style primitives (Radix UI + cva + tailwind-merge + lucide-react) for the four most common interactive elements. Improves accessibility (Radix handles focus traps, escape, ARIA), keyboard navigation (Tab/Enter/Esc), and consistency at zero design cost.

## Items

- [ ] Install deps via dnpm: class-variance-authority, clsx, tailwind-merge, lucide-react, @radix-ui/react-{dialog,select,tabs,slot}, tw-animate-css
- [ ] `lib/cn.ts` — `cn(...args)` helper using clsx + tailwind-merge
- [ ] `components/ui/button.tsx` — variant=default|secondary|ghost|destructive, size=sm|md|lg
- [ ] `components/ui/dialog.tsx` — Radix-based; replace EnvEditorModal's manual modal
- [ ] `components/ui/select.tsx` — Radix select; migrate method/auth-type/body-mode/locale/env pickers
- [ ] `components/ui/tabs.tsx` — Radix tabs; migrate composer + response tab strips
- [ ] All 400-line cap respected, decompose if needed

## Acceptance

App builds, all four primitives migrated, no visual regression vs current Tailwind-only style. Tab/Esc work consistently across modals + dropdowns.
