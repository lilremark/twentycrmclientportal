# Design System: Twenty CRM Client Portal

**Direction:** Quiet Operations  
**DFII:** 14/15 — impact 4, context fit 5, feasibility 4, performance 4, consistency risk 3

## 1. Visual Theme & Atmosphere

Quiet Operations is a dense, calm workspace for people who manage client access and for clients who need to understand shared CRM records quickly. It combines restrained minimalism with an operations-console rhythm: slim navigation, fine dividers, compact controls, clear status language, and content that stays visually anchored while data changes.

The recognizable anchor is the layered workspace frame: a pale navigation rail, a crisp contextual header, an inset tab rule, and compact white working surfaces on a neutral canvas. The interface should still read as this product with the logo removed.

Avoid decorative gradients, oversized dashboard cards, floating glass panels, and arbitrary shadows. Depth is communicated primarily through borders and background shifts.

## 2. Color Palette & Roles

The core palette is Tailwind Neutral. Tenant branding is an accent, not a replacement for accessible interface colors.

- **Canvas White — Neutral 0 (`#ffffff`):** primary light surfaces and inputs.
- **Quiet Canvas — Neutral 50 (`#fafafa`):** application background and sidebar.
- **Soft Division — Neutral 100 (`#f5f5f5`):** selected rows and subtle controls.
- **Working Border — Neutral 200 (`#e5e5e5`):** default separators and card outlines.
- **Muted Stroke — Neutral 300 (`#d4d4d4`):** stronger input and hover borders.
- **Secondary Copy — Neutral 500 (`#737373`):** descriptions and metadata.
- **Supporting Copy — Neutral 600 (`#525252`):** navigation and labels.
- **Primary Ink — Neutral 900 (`#171717`):** headings and primary actions.
- **Night Canvas — Neutral 950 (`#0a0a0a`):** dark-mode application background.
- **Tenant Accent (`--brand-primary`):** active rules, links, focus rings, and small identity details only.
- **Semantic colors:** red for destructive/error, amber for warning, emerald for success, and blue for informational states. Never rely on color alone.

In dark mode, Neutral 950/900 form the canvas and surfaces, Neutral 800 supplies borders, and Neutral 100/400 provide primary and secondary copy.

## 3. Typography Rules

- **Inter:** all interface and heading typography through `--font-sans` and `--font-heading`.
- **Geist Mono:** record IDs, object names, versions, URLs, and technical values through `--font-mono`.
- Page titles use 24–28px, 650–700 weight, and tight tracking.
- Section titles use 14–16px, 650 weight.
- Body copy uses 13–14px with a 1.5 line height.
- Labels and navigation use 12–13px, 550–650 weight.
- Uppercase eyebrow text is reserved for short context labels and uses increased tracking.

## 4. Geometry, Depth, and Spacing

- Use a 4px base spacing rhythm. Common gaps are 8, 12, 16, 20, 24, and 32px.
- Controls are 32–40px high depending on density and touch context.
- Controls use subtly rounded 8–10px corners; cards use 10–12px corners; badges are pill-shaped.
- Default surfaces are flat with a one-pixel border. Shadows are whisper-soft and reserved for overlays, sticky headers, and auth panels.
- Desktop content uses a 12-column grid and a readable maximum width where forms would otherwise become too wide.

## 5. Component Styling

- **Buttons:** neutral-black primary actions, bordered secondary actions, quiet ghost actions, and red destructive actions. Tenant accents may appear in links and active indicators.
- **Cards:** low-elevation working surfaces with compact headers and explicit section boundaries.
- **Inputs:** white or near-black surfaces, visible borders, concise labels, inline help, and a tenant-accent focus ring.
- **Tables:** compact rows, sticky-capable headers, tabular alignment, restrained hover states, and explicit empty/loading/error states.
- **Tabs:** text tabs on a shared baseline with a two-pixel active rule; no pill-shaped page navigation.
- **Dialogs and sheets:** use Base UI focus management. Destructive confirmation remains explicit and never relies on icon-only copy.
- **Status:** pair color with a readable label and, where useful, a Lucide icon.

## 6. Layout Principles

- The desktop sidebar is 232px expanded and 64px collapsed. It remains visually quiet so the working canvas dominates.
- The contextual header is sticky. Page-level tabs sit inside the header rather than becoming separate cards.
- Dense pages place the title, description, and primary action in one compact header row.
- Filters and secondary actions stay near the data they affect.
- Forms use clear sections and progressive disclosure. Long administrative forms provide a local section navigator without unmounting unsaved fields.
- Authentication uses a split composition: a product/brand narrative panel and a focused form panel. The narrative collapses on narrow screens.

## 7. Responsive Behavior

- **Below 640px:** single-column content, full-width actions, card-like table rows where necessary, and a navigation drawer.
- **640–1023px:** compact grids, horizontally scrollable data tables, and reduced page gutters.
- **1024px and above:** persistent collapsible navigation, two-column settings, and resizable record details.
- Never hide a required action solely because of viewport size.

## 8. Interaction, Motion, and Accessibility

- Motion is sparse and functional: 120–220ms for drawers, disclosure, hover, and state transitions.
- Respect `prefers-reduced-motion` and remove nonessential transforms.
- Every interactive control must have a visible keyboard focus state and a touch target of at least 40px where practical.
- Maintain WCAG AA text contrast, semantic headings, form labels, error association, focus trapping, and meaningful empty states.
- Icon-only buttons require accessible names and tooltips when their meaning is not universal.

## 9. Screen Archetypes

- **Workspace overview:** metric ribbon, active portal cards, recent activity, and system status.
- **Management list:** compact title/action row, filters, bordered table, and contextual row actions.
- **Builder:** General and Reports tabs; General contains Basics, Access, Fields, and Presentation stages while all fields remain mounted.
- **Settings:** anchored category navigation with independent save boundaries.
- **Client records:** table-first layout with filters and a desktop resizable/mobile full-screen detail sheet.
- **Authentication and setup:** responsive split layout with brand context, clear invitation language, and a focused form.
