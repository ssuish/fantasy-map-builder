---
version: alpha
name: Atlas Dark Archive
description: Shared visual language for the Creator editor and public Explorer.
colors:
  primary: "#D9B773"
  primary-hover: "#E8C883"
  on-primary: "#1C1B17"
  background: "#151716"
  surface: "#202320"
  surface-raised: "#2B302A"
  text: "#F1EBDD"
  text-muted: "#B8B6A9"
  border: "#575B50"
  focus: "#E9D59A"
  danger: "#E8A19A"
  on-danger: "#281411"
typography:
  display:
    fontFamily: "Literata, Georgia, serif"
    fontSize: 42px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  heading:
    fontFamily: "Literata, Georgia, serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.3
  map-data:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0.04em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px"
  caption:
    textColor: "{colors.text-muted}"
    typography: "{typography.body-small}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "24px"
  map-overlay:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-small}"
    rounded: "{rounded.sm}"
    padding: "12px"
---

# Atlas Dark Archive

## Overview

Atlas should feel like a carefully maintained archive of invented worlds: atmospheric, legible, and restrained. Dark surfaces recede so hand-drawn terrain and Lore lead. Brass marks primary actions and selected locations; it is not a decorative border on every panel. This is the target system for future Creator and Explorer screens. The Phase 0 preview uses an earlier prototype style and is not a token implementation.

Creator and Explorer share these tokens. Creator surfaces can be denser, with persistent tools and visible save state. Explorer surfaces should give more space to the Map and use fewer controls. Neither mode changes the meaning of a color or typography token.

## Colors

The UI uses charcoal and warm paper text rather than pure black and white. Brass is the interaction accent; muted sage and deep sea colors belong mostly to map content. Errors use the danger color with text, not color alone. The map artwork may use a broader fantasy palette, but controls over it must remain readable against a stable surface.

Normal text on the background, muted text on the surface, and dark text on the primary button exceed WCAG AA contrast in the defined pairings. Recheck contrast whenever a token or overlay opacity changes. Focus uses a visible outline in `focus`, never only a color shift.

## Typography

Literata gives titles and Lore headings an editorial, book-like voice. Source Sans 3 keeps controls, long reading, and dense editor labels clear. Reserve the serif for headings and short narrative moments; do not use it for coordinates, forms, or small tool labels. Long Lore passages use the `body` line height and a comfortable reading width.

## Layout

Use the spacing scale consistently. On desktop, the Creator editor gives the Map the largest region, with a compact tool rail and contextual inspector. Explorer pages keep navigation and Lore panels secondary to the Map. On phones, stack panels instead of shrinking controls; Explorer remains fully usable, while touch-first Creator editing is outside the MVP.

Target at least 44×44 px touch targets for Explorer controls. Preserve text zoom and keyboard access. Panels should not cover selected Hotspots or block the only exit from a Lore view.

## Elevation & Depth

Use tonal layers and thin borders to separate controls from the Map. `surface-raised` is for popovers, dialogs, and active inspectors. Shadows are subtle and reserved for overlays that float above the canvas; avoid heavy card shadows across the page.

## Shapes

Small radii make controls approachable without turning the archive into a playful dashboard. Buttons and inputs use `rounded.sm`, panels use `rounded.md`, and circular markers use `rounded.full`. Map markers may have hand-drawn silhouettes; their hit areas remain predictable and accessible.

## Components

Use one primary action per view. Secondary actions use surface treatment; destructive actions need explicit text and confirmation. Inputs always have visible labels and error/help text. Map overlays use opaque enough surfaces for contrast, show keyboard focus, and keep the selected location identifiable after the panel opens. Save status must be communicated by text as well as any indicator.

Component tokens set default surfaces and type. Implement hover, focus, disabled, loading, and error states with the same semantic palette before a component is considered complete. The map canvas and Lore panel require DOM alternatives for information that cannot be read from pixels alone.

## Do's and Don'ts

- Do keep fantasy detail in map art and editorial content; keep controls calm and direct.
- Do distinguish selected, hovered, focused, disabled, and dangerous states with more than color.
- Do keep Creator tools dense but labeled; give Explorer more map space and simpler navigation.
- Don't expose raw map coordinates as the only way to identify a Point of Interest.
- Don't place low-opacity text directly on variable map artwork.
- Don't copy Phase 0 prototype colors into new screens without mapping them to these tokens.
