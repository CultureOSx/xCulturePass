# Apple + Airbnb UX/UI Guidelines (CulturePass)

This guideline defines the default interaction and visual behavior for all new and refactored CulturePass UI.

## Core Principles

1. Clarity first — content hierarchy is obvious at a glance.
2. Calm confidence — minimal visual noise, generous whitespace.
3. Human warmth — approachable copy, soft surfaces, culturally respectful tone.
4. Tactile feedback — subtle animation + haptics for meaningful actions.
5. Consistency over novelty — use system tokens, avoid one-off styling.

## Foundation Tokens (Required)

- Font: Inter (mapped through existing app font keys)
- Icons: Ionicons outline variants only (except brand `logo-*` icons)
- Spacing scale (`Spacing.*`):

| Token | Value |
| ----- | ----- |
| xs | 4 |
| sm | 8 |
| md | 16 |
| lg | 24 |
| xl | 32 |
| xxl (2xl) | 40 |
| xxxl (3xl) | 48 |

- Radius: 16 default (`Radius.*`, `CardTokens.radius`, `InputTokens.radius`, `ButtonTokens.radius`)
- Button height: 52 (`ButtonTokens.height.*`)

## Layout Rules (Required)

| Rule | Value |
| --- | --- |
| Screen horizontal padding | 16 |
| Card padding | 16–20 |
| Section spacing | 32 |
| Between icon + text | 8 |
| Between cards | 16 |
| Button height | 52 |
| Border radius | 16 |

Use `LayoutRules` from `constants/theme.ts` as the source of truth.

## Component Rules

### Buttons

- Use `components/ui/Button` only.
- Default to medium emphasis and avoid overuse of gradients.
- Pressed state should feel physical but restrained (small scale + opacity).
- Trigger light haptic feedback on intentional taps.

### Cards

- Use `components/ui/Card` only.
- Prefer clear content blocks with stable spacing and minimal decoration.
- Keep shadows subtle; rely more on contrast and border definition.
- Pressable cards should provide gentle tactile and visual feedback.

### Inputs

- Use `components/ui/Input` only.
- Keep labels concise and sentence case.
- Preserve generous inner spacing and readable placeholder contrast.
- For right-side actions, use outline icons and large tap targets.

### Badges/Chips

- Avoid shouting UI: prefer sentence case over all-caps unless semantic.
- Use outline icons and token colors only.
- Keep paddings aligned to the shared spacing scale.

## Motion + Interaction

- Animation should support comprehension, not decoration.
- Keep transitions fast and smooth.
- Avoid exaggerated bounce.
- Honor reduced-motion preferences where possible.

## Copy + Information Design

- Prefer short, actionable text.
- Use clear labels over clever wording.
- Surface primary action once per section; secondary actions should be quiet.

## Implementation Checklist

Before shipping any screen:

- Uses Inter via shared font family keys.
- Uses tokenized spacing/radius (no ad hoc layout numbers for major structure).
- Uses outline Ionicons for actions and states.
- Uses shared UI primitives (`Button`, `Card`, `Input`, `Badge`).
- Has clear text contrast in both dark and light mode.
- Provides subtle feedback on press where interaction is critical.
