---
name: Coding Agent 2
description: Liquid glass over a quiet workspace, adapted from glisse (MIT).
colors:
  action-blue: '#0071e3'
  control-blue-light: '#0088ff'
  control-blue-dark: '#0091ff'
  switch-green-light: '#34c759'
  switch-green-dark: '#30d158'
  canvas-light: '#ffffff'
  canvas-dark: '#121214'
  surface-dark: '#1c1c1f'
  popover-light: '#fafafc'
  ink-light: '#1f1f1f'
  ink-dark: '#f5f5f7'
  secondary-ink-light: '#6d6d72'
  secondary-ink-dark: '#98989f'
  fill-light: '#efeff0'
  fill-dark: '#2c2c2e'
  hover-light: '#ededee'
  hover-dark: '#3a3a3c'
  separator-light: '#e2e2e3'
  grouped-light: '#f2f2f7'
  focus-gray: '#8e8e93'
  glass-tint-light: 'rgb(250 250 252 / 0.72)'
  glass-tint-dark: 'rgb(36 36 38 / 0.68)'
typography:
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
  code:
    fontFamily: "'SF Mono', SFMono-Regular, ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace"
rounded:
  base: '12px'
  menu: '14px'
  popover: '16.8px'
  dialog: '22px'
  pill: '9999px'
components:
  button-primary:
    backgroundColor: '{colors.action-blue}'
    textColor: '#ffffff'
    rounded: '{rounded.pill}'
    height: '36px'
  switch-on:
    backgroundColor: '{colors.switch-green-light}'
    rounded: '{rounded.pill}'
  menu:
    backgroundColor: '{colors.glass-tint-light}'
    textColor: '{colors.ink-light}'
    rounded: '{rounded.menu}'
    padding: '4px'
---

# Design System: Coding Agent 2

## Overview

The visual world is liquid glass, adapted from [glisse](https://github.com/0kzh/glisse) (MIT), a web implementation of Apple's Liquid Glass. Coding Agent 2 is an Operate surface: the agents, terminals and diffs are the content, so the chrome stays neutral and quiet. Inspired by visionOS, the whole window sits on your blurred desktop wallpaper, with the sidebar, the workspace and the right panel floating over it as rounded glass panels, and menus, popovers, dialogs and toasts as a second, frostier layer above them. Controls take iOS shapes: pill buttons, oval switch thumbs, and system blue and green.

Token values live in `src/renderer/src/assets/main.css` (canonical). `docs/STYLEGUIDE.md` keeps the role rules.

## Colors

### Primary

- **Action blue** `#0071e3` is the single affirmative action in a flow, in both themes. glisse's `#0088ff` gives white labels only 3.5:1, so filled buttons use a deeper system blue that clears 4.5:1.
- **Control blue** `#0088ff` light / `#0091ff` dark (`--control-fill`) fills slider ranges and other non-text indicators, exactly as glisse does.

### Secondary

- **Switch green** `#34c759` light / `#30d158` dark (`--switch-on`) is the on state of switches and nothing else.

### Neutral

- Ink `#1f1f1f` (black at 88%) and `#f5f5f7`. Secondary ink `#6d6d72` / `#98989f` is iOS secondary label, deepened in light mode to clear 4.5:1.
- Canvas `#ffffff` / `#121214`; cards `#ffffff` / `#1c1c1f`; the worktree sidebar uses iOS grouped background `#f2f2f7` / `#1c1c1e`.
- Fills `#efeff0` / `#2c2c2e` for secondary and muted surfaces; hover `#ededee` / `#3a3a3c`; separators `#e2e2e3` / white at 8%.
- Destructive, status, git and diff colors are unchanged: they carry text, and their existing values already meet contrast.

### Named Rules

- **Hue earns its place.** Blue means "act", green means "on", red means "destroy". Chrome never borrows them for decoration.

## Typography

Inter (variable, self-hosted from `assets/fonts/InterVariable.woff2`, OFL) for all UI, falling back to the Apple system font (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`), then Segoe UI. Tracking 0. Every UI label uses Inter, including those styled `font-mono` (that utility now resolves to the app font). The code editor uses Inter too (`editorFontFamily` defaults to Inter). Only real code keeps the monospace stack (`--code-font-family`): terminals, `<code>`/`<pre>`, and renderers that opt in with the `font-code` utility (chat code blocks, diffs, tool output, logs, notebook outputs).

## Elevation & Depth

Three depths, back to front.

### Environment

The current Windows desktop wallpaper, blurred 40px under a veil (white 62% in light, black 50% in dark), so secondary text keeps contrast even over a dark wallpaper. The main process reads it (`src/main/appearance/desktop-wallpaper.ts`, `TranscodedWallpaper` first, then the registry), shrinks it to 960px and the renderer paints it as `body::before`; it refreshes when the window regains focus. Where it can't be read (macOS, Linux, a solid-color desktop), `--environment` is a solid neutral: `#e5e5ea` in light, `#0b0b0d` in dark. A window material or an app theme image replaces it.

### Panels

`[data-glass-stage]` holds the panels with an 8px gap (`--panel-gap`) and margin. Each `[data-glass-panel]` (sidebar, main, aside) has a 22px radius (`--panel-radius`), `--glass-shadow`, and a hairline edge plus lit rim drawn by `::after`. Inside a panel, `--background`, `--worktree-sidebar` and `--card` are re-tinted from their opaque bases (`--panel-base`, `--panel-sidebar-base`, `--panel-card-base`):

- Light: white at 40% (sidebar 28%, cards 55%).
- Dark: the base mixed 38% toward `#8e8e93` at 22% (sidebar 18%, cards 30%), so the glass reads lighter than the backdrop, as in visionOS. Hover and selection become white lifts (12–14%).

Panels do not use `backdrop-filter`: the backdrop is flat, and a full-window blur under live terminals would cost every frame. Terminals default to 45% background opacity (`terminalBackgroundOpacity`); inside a panel only xterm paints it (the pane host is cleared), so the backdrop shows through at 55%.

### Floating layers

**Glass** (`.glass-material` in `main.css`).

- Tint: `--floating-surface` (menus, popovers) or `--dialog-surface` (dialogs, sheets, command palette).
- `backdrop-filter: blur(24px) saturate(1.8)`.
- Edge: a hairline `--glass-edge` border (black 8% / white 13%).
- Rim: a lit top edge, `inset 0 1px 0 var(--glass-rim)`.
- Lift: `--glass-shadow`, a soft, offset shadow that `--shadow-floating` also points to.

Reduced effects (the setting or the OS) and browsers without `backdrop-filter` fall back to the solid `--popover` / `--background`. Plugin themes tint the glass through `--floating-surface`.

## Shapes

- Panels 22px.
- Base radius 12px (`--radius: 0.75rem`).
- Menus 14px, popovers / selects / hover cards `rounded-xl`, dialogs and the command palette 22px.
- Buttons are capsules (`rounded-full`) at every size except `chip`.
- Tooltips `rounded-lg`.

## Components

### Buttons

Pill-shaped. The primary fill lightens 12% toward white on hover and darkens 15% toward black on press, as glisse does. Secondary, outline and ghost keep their neutral fills.

### Switch

Green track when on, translucent gray (`--switch-track`) when off; the white oval thumb travels with a 200ms ease-out.

### Slider

Six-pixel rail at 10% ink, control-blue range, white pill thumb.

### Menus, popovers, dialogs

Glass material, as above. Behavior stays Radix (focus, keyboard, dismissal).

## Do's and Don'ts

### Do:

- Use `.glass-material` for anything that floats above the workspace.
- Tag a new top-level region with `data-glass-panel` so it joins the panel layer.
- Use tokens (`bg-primary`, `bg-switch-on`, `bg-control-fill`) instead of hex values.

### Don't:

- Paint opaque `bg-background` slabs inside a panel with hard-coded colors; use the tokens so the panel re-tint reaches them.
- Add `backdrop-filter` to panels or terminals.
- Use the glisse `#0088ff` behind white text.
- Add the glisse package or its refraction runtime without revisiting this document; the current port is CSS only.
