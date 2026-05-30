# shared/ui

Stage 24 design-system boundary. New React UI should import reusable primitives from this folder instead of creating one-off buttons, badges, cards, fields and empty states.

Rules:

- components are presentational only;
- no Supabase calls;
- no direct runtime-core imports;
- no direct `window.__WorkspaceApp` access;
- keep classes compatible with the legacy CSS while adding `ds-*` design-system classes.
