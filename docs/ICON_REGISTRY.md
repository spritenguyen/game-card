# Icon registry contract

## API

New presentation code uses canonical names:

```tsx
import { Icon } from '../components/ui/Icon';
<Icon icon="Camera" className="text-xl text-pink-400" />
```

`IconName` is `keyof typeof ICON_REGISTRY`. `icon` takes precedence over legacy `name`.
Canonical names do not become CSS classes. Appearance/sizing stays in `className`.
`getIcon(name: IconName): LucideIcon` allows direct component access when required.
`isIconName(value: string): value is IconName` validates runtime input using own-property
lookup; unknown values must use the caller's chosen fallback.

Existing `name` and className-only calls remain compatible, including `fa-*` aliases,
classes embedded in names, fa-spin, text sizing, null for empty input and CircleHelp
fallback/warnings. Native names already used by metadata are registered. Unregistered
future native names require an explicit registry entry; there is no full-library loader.
Prefix precedence and existing glyph mappings are preserved in `legacyIconName.ts`.

## Module boundaries and tree shaking

- `iconRegistry.ts` explicitly imports 142 components and the LucideIcon type from
  lucide-react. No namespace import, dynamic icon import or dynamic full-export lookup.
- `legacyIconName.ts` only normalizes legacy names; no React/provider/library imports.
- `Icon.tsx` retains presentation behavior and resolves components through the registry.
- Domain metadata stays framework-independent; no domain import of the UI registry.

To add an icon: add its named import and registry entry, then use its typed canonical
name. An arbitrary string cannot silently load an unregistered component.

The dynamic registry retains all registered icons. Tree shaking removes icons outside
that explicit set; it does not remove individual registry entries based on runtime use.
No dependency/version/build-tool changes were made.

## Validation and measured result

- `npm run test:icons`: 3 tests PASS, including **515 render baselines** captured from
  the original component before this change, all 142 canonical entries, unknown/prototype
  fallback, named-import constraints and compile-time contract assertions via tsc.
- Baselines cover repository fa-* tokens, native faction/element names, embedded classes,
  className-only calls, sizing, spin, unknown names and empty input. SHA-256 hashes compare
  complete server-rendered SVG markup; fixtures must not be regenerated from new code
  merely to make tests pass.
- `npm run lint`: tsc --noEmit PASS; no ESLint is configured in this repository.
- `npm run build`: PASS. Main JS approximately **1,484.14 → 694.7 kB** (about 53% smaller);
  gzip approximately **345.42 → 202.4 kB**. Vite's >500 kB warning remains.
- `npm run test:architecture`: 8 PASS, including cycles/unresolved import checks.
- `npm run test:workflows`: 115 PASS.
- `python phase3-browser-smoke.py`: 14 production tabs, lazy navigation/cache and no page errors.

Changed: Icon.tsx, package.json (test:icons script).
New: iconRegistry.ts, legacyIconName.ts, icon-regression.test.tsx,
 tests/fixtures/icon-render-before-registry.json and this document.

No UI redesign, unrelated glyph correction, state/save change or credentials work.
