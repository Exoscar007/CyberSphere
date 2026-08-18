---
name: CyberSphere
description: Palladian Coastal Command Intelligence & Tactical Operations Design System
colors:
  primary: "#285570"
  primary-hover: "#1f455c"
  secondary: "#1b2632"
  accent-critical: "#a35139"
  accent-warning: "#ffb162"
  accent-warning-deep: "#d97a26"
  accent-verified: "#2a6b65"
  neutral-bg: "#eee9df"
  neutral-surface: "#ffffff"
  neutral-alabaster: "#faf7f6"
  neutral-chalk: "#f4f0e8"
  neutral-oatmeal: "#e3ded7"
  neutral-oatmeal-deep: "#c9c1b1"
  neutral-charcoal: "#333333"
  neutral-border: "#d5cec2"
  neutral-border-subtle: "#e7e2d8"
  neutral-text-primary: "#333333"
  neutral-text-secondary: "#4e5d6a"
  neutral-text-muted: "#7e8b95"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  2xs: "3px"
  xs: "5px"
  sm: "8px"
  md: "10px"
  full: "9999px"
spacing:
  2xs: "3px"
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.xs}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.xs}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.accent-critical}"
    textColor: "#ffffff"
    rounded: "{rounded.xs}"
    padding: "8px 14px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-charcoal}"
    rounded: "{rounded.xs}"
    padding: "8px 14px"
  card-surface:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text-primary}"
    rounded: "{rounded.sm}"
    padding: "16px 18px"
---

# Design System: CyberSphere

## Overview

**Creative North Star: "Palladian Coastal Command"**

CyberSphere unifies institutional law enforcement authority with high-density architectural poise. Departing decisively from generic sci-fi dark modes or bland utilitarian dashboards, the visual identity anchors on a warm, organic Palladian canvas (`#EEE9DF` Ivory, `#FAF7F6` Alabaster) balanced by structural Abyssal Navy (`#1B2632`) navigation and Velasca Charcoal Slate (`#333333`) headers. Emergency operational triage is immediately commanded through purposeful Truffle Trouble Terracotta (`#A35139`), Burning Flame Amber (`#FFB162`), and Marine Green (`#2A6B65`) accents.

The interface prioritizes high cognitive scanability under operational stress. Interactive spatial maps sit on an expansive canvas layered with translucent glassmorphic HUD modules (`backdrop-filter: blur(10px)`), crisp hairline borders (`#D5CEC2`), and dedicated edge intelligence rails. Every pixel, badge, and telemetry read-out serves rapid situation triage without aesthetic fluff or generic AI tells.

**Key Characteristics:**
- Architectural Ivory & Alabaster foundation with Abyssal Navy structural contrast.
- Translucent floating HUD layers over full-bleed geospatial map canvases.
- Semantic multi-channel status encoding with mono-spaced telemetry readouts.
- Elimination of AI design anti-patterns (no thick side-tab borders, no generic purple gradients).

## Colors

The palette pairs historical architectural warmth with authoritative municipal command contrast and precise operational severity signaling.

### Primary
- **Coastal Blue** (`#285570`): Primary interactive elements, focused states, primary action triggers, and operational indicators.
- **Coastal Hover** (`#1F455C`): Interactive hover state for primary action buttons.

### Secondary
- **Abyssal Navy** (`#1B2632`): Structural navigation shell, persistent sidebar framing, and grounding anchors.
- **Charcoal Slate** (`#333333`): Section headers, data table headers, command telemetry bars, and dark badge fills.

### Tertiary
- **Truffle Trouble Terracotta** (`#A35139`): Critical incident triage, high-priority emergency alerts, and destructive actions.
- **Burning Flame** (`#FFB162` / Deep `#D97A26`): Active route highlighting, warning indicators, and active navigation indicators.
- **Crisp Marine Green** (`#2A6B65`): Verified statuses, active system health, and completed patrol operations.

### Neutral
- **Palladian Ivory** (`#EEE9DF`): Global canvas base and workspace background.
- **Alabaster** (`#FAF7F6`): Top institutional header base, floating HUD glass background, and row highlights.
- **Chalk** (`#F4F0E8`): Card header backgrounds, subtle secondary control surfaces, and badge fills.
- **Surface White** (`#FFFFFF`): Card interiors, input backgrounds, and crisp text contrast.
- **Oatmeal Border** (`#D5CEC2` / Subtle `#E7E2D8`): Structural dividing hairlines and container framing.
- **Text Charcoal** (`#333333`): Primary high-contrast typography.
- **Text Steel Slate** (`#4E5D6A`): Secondary descriptive text and form labels.
- **Text Muted Slate** (`#7E8B95`): Micro metadata, timestamps, and inactive iconography.

### Named Rules
**The Rarity-of-Red Rule.** Terracotta critical accents (`#A35139`) are strictly reserved for genuine emergency triage, high-severity crimes, and active danger states. When everything screams for attention, nothing is heard.
**The No-Slop Gradient Rule.** Never apply synthetic multi-color purple-to-blue gradients across headers or text. Depth is achieved strictly through tonal architectural layering and translucent blur.

## Typography

**Display Font:** Inter (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Body Font:** Inter (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Label/Mono Font:** JetBrains Mono (`'SF Mono', Consolas, monospace`)

**Character:** Crisp, highly legible sans-serif hierarchy engineered for variable viewing distances in control rooms, paired with high-precision tabular monospace for timestamps, coordinates, and telemetry badges.

### Hierarchy
- **Display** (800, `28px`, `1.2`): Page master headers and executive summary KPI counters.
- **Headline** (800, `22px`, `1.25`): Module titles, primary drawer section banners, and modal headers.
- **Title** (700, `16px`, `1.35`): Card titles, panel headings, and table group labels.
- **Body** (400, `14px`, `1.5`): Incident summaries, narrative logs, and form description copy.
- **Label / Micro** (700, `11px`, `1.2`, letter-spacing `0.05em`, uppercase): Badges, telemetry metrics, table column headers, and status pills.

### Named Rules
**The Telemetry-in-Mono Rule.** Every coordinate, incident identifier (e.g. `FIR-2026-089`), timestamp, and operational numeric metric must be rendered in `JetBrains Mono` to prevent layout jitter during live updates.

## Layout

The screen layout adapts between two primary archetypes:
1. **Full-Bleed Command Canvas:** Used for City Command and Map views. Map occupies 100% viewport width and height; floating HUDs and contextual rails overlay the map with absolute coordinate positioning.
2. **Structured Operational View:** Used for Station Consoles, FIR lists, and User Management. Standard 56px top header, persistent 220px / 60px collapsible sidebar, and responsive multi-column scrollable grid.

- **Header Height:** `56px` (`--header-height`)
- **Sidebar Width:** `220px` expanded, `60px` collapsed (`--sidebar-width`, `--sidebar-collapsed-width`)
- **Spacing Rhythm:** Based on a 4px/8px organic scale: 2xs (`3px`), xs (`6px`), sm (`10px`), md (`14px`), lg (`18px`), xl (`24px`), 2xl (`32px`).

## Elevation & Depth

**Philosophy: Layered Architectural Tonalism.**  
Surfaces rely primarily on warm tonal layering, crisp 1px structural hairline borders (`#D5CEC2`), and translucent Alabaster glass (`rgba(250, 247, 246, 0.95)` with `10px` backdrop blur). Shadows are ambient, restrained, and state-driven.

### Shadow Vocabulary
- **Ambient XS** (`box-shadow: 0 1px 2px rgba(51, 51, 51, 0.04)`): Baseline resting cards and subtle secondary buttons.
- **Ambient SM** (`box-shadow: 0 1px 3px rgba(51, 51, 51, 0.06), 0 1px 2px rgba(51, 51, 51, 0.04)`): Standard resting card containers.
- **Elevated MD** (`box-shadow: 0 4px 8px -1px rgba(51, 51, 51, 0.08)`): Interactive card hover states and active dropdown menus.
- **Glass HUD Float** (`box-shadow: 0 8px 24px -4px rgba(51, 51, 51, 0.12)`): Floating canvas HUD overlays over spatial maps.

### Named Rules
**The Flat-at-Rest Rule.** All cards, tables, and inspection panes rest flat against the canvas framed by subtle borders. Elevation is applied only as a functional response to hover, drag, or floating overlays.

## Shapes

- **Form Language:** Clean, architectural rectangles with restrained softened corners.
- **Corner Radii:**
  - Micro Badges & Tags: `3px` (`--radius-2xs`)
  - Buttons & Form Inputs: `5px` (`--radius-xs`)
  - Cards & Floating HUD Containers: `8px` (`--radius-sm`)
  - Modals & Drawers: `10px` (`--radius-md`)
  - Status Pills & Search Bar: `9999px` (`--radius-full`)
- **Borders:** Crisp 1px solid hairlines (`#D5CEC2` or `#E7E2D8`). No heavy 3px+ decorative border side-tabs.

## Components

### Buttons
- **Shape:** `5px` radius (`--radius-xs`).
- **Primary:** Background `#285570` (Coastal Blue), White text, 8px 14px padding. Hover: `#1F455C`.
- **Secondary:** Background `#FFFFFF`, `#333333` text, 1px `#D5CEC2` border, subtle shadow. Hover: `#F4F0E8`.
- **Danger / Critical:** Background `#A35139` (Terracotta), White text. Hover: `#8A412C`.
- **Dark / Command:** Background `#333333` (Charcoal Slate), White text. Hover: `#222222`.

### Badges & Status Indicators
- **Shape:** `3px` radius, uppercase JetBrains Mono, `11px`, `700` weight, 3px 8px padding.
- **Critical:** `#A35139` fill with White text or `#F8ECE8` subtle fill with `#A35139` text and `#E8C8BE` border.
- **High / Warning:** `#FEF4E8` fill with `#D97A26` text and `#FCDCB8` border.
- **Operational:** `#EBF2F6` fill with `#285570` text and `#C8DCE6` border.
- **Verified:** `#EBF5F3` fill with `#2A6B65` text and `#C5E3DC` border.

### Cards & HUD Containers
- **Corner Style:** `8px` radius (`--radius-sm`).
- **Background:** White `#FFFFFF` or warm translucent glass `rgba(250, 247, 246, 0.95)`.
- **Header:** `#F4F0E8` Chalk or `#333333` Charcoal Slate with 1px bottom border.
- **Internal Padding:** `16px 18px`.

### Inputs & Fields
- **Style:** Background `#FFFFFF`, border 1px `#D5CEC2`, radius `5px`, padding 8px 12px.
- **Focus State:** Border shifts to `#285570`, subtle focus ring `0 0 0 2px rgba(40, 85, 112, 0.2)`.

### Data Tables
- **Header:** Background `#333333` with `#E3DED7` uppercase monospace text.
- **Rows:** White background, 1px `#E7E2D8` bottom border, `#FAF7F6` hover tint.

### Floating HUD Overlays (Signature Component)
- **Style:** `canvas-glass` backdrop blur with 1px `#D5CEC2` border, floating search pill (`canvas-hud-search`), asymmetric status module (`canvas-hud-status`), and dark bottom telemetry strip (`canvas-hud-bottom`).

## Do's and Don'ts

### Do:
- **Do** format all timestamps, incident IDs, and coordinates in `JetBrains Mono`.
- **Do** maintain a strict 1px hairline border around cards, tables, and HUDs.
- **Do** use multi-channel status encoding (color + text label + icon) for critical states.
- **Do** keep floating canvas HUDs responsive and layered cleanly over the Leaflet map.

### Don't:
- **Don't** use thick 3px-4px colored side-tab accent borders on cards (generic AI slop tell).
- **Don't** use purple-to-blue gradients or glowing neon outlines.
- **Don't** animate `width`, `height`, or layout properties; use `transform` and `opacity` instead.
- **Don't** use bounce or elastic easing; use smooth cubic-bezier acceleration/deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Don't** crowd the screen with full-saturation alarm red when conditions are nominal.
