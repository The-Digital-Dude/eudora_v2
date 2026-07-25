# Clio mascot — Lottie contract

Single source of truth for the Clio mascot's state/variant → animation mapping.
Both the animation files in `public/lottie/` and the lookup table in
[ClioMascot.tsx](./ClioMascot.tsx) build against the contract in this doc.
Change a mapping here → change it in `ClioMascot.tsx`.

- Assets: `public/lottie/*.lottie` (dotLottie exports — see `MASCOT_ANIMATIONS` in
  [ClioMascot.tsx](./ClioMascot.tsx) for the exact filenames in use).
- Player: [`@lottiefiles/dotlottie-react`](https://www.npmjs.com/package/@lottiefiles/dotlottie-react),
  which plays `.lottie` archives directly (no manual unzip/JSON extraction needed).

## States

The `state` prop is unchanged from the original Rive-era contract — call sites don't
need to change when new variants/assets are added.

| `state` | Meaning |
|---|---|
| `idle` | Default resting loop |
| `thinking` | Student is actively interacting with a widget, hasn't submitted |
| `celebrate` | Correct-answer one-shot |
| `encourage` | Friendly nudge (no strong trigger, just supportive) |
| `wrong` | Wrong-answer one-shot |
| `greeting` | Session/lesson start |
| `confused` | Student seems stuck |
| `hint` | A hint is being shown/explained |
| `milestone` | Level-up / big win one-shot |

## Variants

Different UI surfaces can show a different **posture** of Clio for the same state.
`variant` defaults to `"standing"`. More variants (and more per-state coverage within
existing variants) get added over time as new use cases and art show up — a variant is
just a new column in `MASCOT_ANIMATIONS`.

| Variant | Used by |
|---|---|
| `standing` | Default — `LessonCompleteModal`, and fallback for any state a variant doesn't cover |
| `chair` | Active-learning lesson page (`/learn/[lessonId]`) — Clio sits alongside the student |

## Resolution order

For a given `(state, variant)`, `resolveAnimation()` in `ClioMascot.tsx` picks the first
match: **the requested variant → `standing` → `idle`/`standing`**. This is why several
states (e.g. `idle`, `greeting`, `milestone` under the `chair` variant) don't need an
explicit chair-posed clip yet — they gracefully fall back to standing until dedicated
seated art exists.

## Playback

- **Loop** (`loop: true`): continuous mood states (`idle`, `thinking`, `greeting`,
  `encourage`, `confused`, `hint`) play on repeat.
- **One-shot** (`loop: false`): trigger states (`celebrate`, `wrong`, `milestone`) play
  once and hold their final frame — the Lottie equivalent of a Rive trigger that
  auto-returns to idle, without needing completion-callback plumbing.

## Adding a new state or variant

1. Drop the `.lottie` file into `public/lottie/`.
2. Add/extend the entry in `MASCOT_ANIMATIONS` in `ClioMascot.tsx`.
3. Update the tables above.
