# Clio mascot — design & rig spec

Single source of truth for the Clio Rive mascot. The **Rive editor work** (art import,
rig, state machine) and the **React integration** ([RiveClioMascot.tsx](./RiveClioMascot.tsx))
both build against the contracts in this doc. Change a name here → change it in both places.

- Source art: [`public/clio/clio-source.svg`](../../../public/clio/clio-source.svg) (layered, named groups)
- Built artboard target: `public/rive/clio-mascot.riv`

---

## 1. Art direction

Orange gel-blob bear. The appeal is **squash / stretch / jiggle** + oversized eyes — not a
rigid sprite. Emotion lives almost entirely in **eyes + mouth + brows**.

| Token | Hex | Use |
|---|---|---|
| outline | `#B8530D` | all linework |
| body | `#F4923B` (→`#E07B22` shade) | blob fill |
| arm | `#EE8326` | tentacle arms |
| belly | `#FBC685` (→`#FFE4BC`) | muzzle / front patch |
| sheen | `#FFF0DB` | top-left highlight |
| cheek | `#F2926A` @ 0.5 | rosy accents |
| pupil | `#241A10` | eyes |
| nose / mouth | `#7A3406` | features |
| inner mouth | `#C8506A` | open-mouth grin |

## 2. Layer contract

Every part is a named `<g>` in the source SVG. Do **not** flatten on import.

| Layer | Rig role |
|---|---|
| `arm_left`, `arm_right` | bones — swing (idle), raise (celebrate), chin (thinking) |
| `body` | **mesh + bones** — breathing, squash/stretch, jiggle |
| `belly`, `belly_sheen` | parented to body, deform with it |
| `cheeks` | opacity/scale on celebrate & encourage |
| `brows` | small rotate/translate — biggest cheap emotion lever |
| `eye_L`/`eye_R` → `eye_white`, `pupil`, `glint`, `eyelid` | pupil = free for look tracking; eyelid = body-colored rect parked **above** the eye, clipped to the eye circle → invisible at rest; rig slides it **down** ~96px to blink/squint |
| `nose` | static |
| `mouth` | **swappable** — see mouth set below |
| `fx_anchor` | empty marker; confetti / sparkle / thought-dots attach here |

### Mouth set (designer draws these as mouth variants)
- `smile` (default): `M222,310 Q256,348 290,310`
- `grin_open`: filled `M222,308 Q256,352 290,308 Q256,322 222,308 Z` + inner `#C8506A`
- `o` (surprise/thinking): small circle r≈12 at (256,318), `#7A3406`
- `flat` (confused/hint): `M232,318 L280,318`
- `frown` (wrong, brief): `M222,326 Q256,300 290,326`

## 3. State machine: `ClioBrain`

One state machine, four layers. **Rive owns transitions/blends** — React only sets inputs.

```
Layer 1 Locomotion : Idle ⇄ Thinking ⇄ Confused ⇄ Hint    (blended by `mood`)
Layer 2 One-shots  : celebrate / wrong / levelUp triggers → play → auto-return to Idle
Layer 3 Blink      : independent random-interval loop (always on)
Layer 4 Look       : lookX / lookY → pupil offset + slight head/body lean
```

### Inputs

| Input | Type | Range | Drives |
|---|---|---|---|
| `mood` | number | 0–8 | locomotion blend (see state map) |
| `celebrate` | trigger | — | correct-answer one-shot |
| `wrong` | trigger | — | wrong-answer one-shot |
| `levelUp` | trigger | — | milestone / level-up burst |
| `lookX` | number | −1..1 | pupil/head horizontal |
| `lookY` | number | −1..1 | pupil/head vertical |
| `energy` | number | 0..1 | idle jiggle intensity (tie to streak) |

### `mood` → state map (preserves existing 9-state prop)

| prop `state` | mechanism |
|---|---|
| `idle` | `mood=0` |
| `thinking` | `mood=1` |
| `confused` | `mood=2` |
| `hint` | `mood=3` |
| `greeting` | `mood=4` (wave via arm bone) |
| `encourage` | `mood=5` |
| `celebrate` | `celebrate` trigger |
| `wrong` | `wrong` trigger |
| `milestone` | `levelUp` trigger |

## 4. React integration (next round, after `.riv` is built)

[RiveClioMascot.tsx](./RiveClioMascot.tsx) currently plays animations **by name**
(`rive.play(state)`) — hard cuts, no blending. Migrate to state-machine inputs:

- `useRive({ src, stateMachines: "ClioBrain", autoplay: true })`
- `useStateMachineInput(rive, "ClioBrain", "mood" | "lookX" | ...)`
- Keep the existing `state` prop signature identical → no downstream breakage.
- Map `state` → set `mood` number or `.fire()` the matching trigger.

### Eye tracking
- Throttled `pointermove` → normalize cursor to −1..1 around Clio's bounding center → set `lookX`/`lookY`.
- In a question/answer view, snap target to the **focused input's** center instead of raw cursor.
- Idle drift when no pointer for ~3s (small sine wander) so eyes never freeze.

## 5. Build order
1. ✅ Layered source art (`clio-source.svg`)
2. Import to Rive editor → mesh+bones on `body`, parent belly, rig arms/eyes/mouth
3. Build `ClioBrain` state machine + inputs above
4. Export `clio-mascot.riv` → `public/rive/`
5. Rewrite `RiveClioMascot.tsx` to the input contract + add eye tracking
6. Verify all 9 `state` values + triggers across learn flow, lesson-complete modal, HUD
