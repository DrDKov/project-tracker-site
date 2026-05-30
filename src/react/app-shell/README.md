# React Stage 11: AppShell

This folder contains the React shell chrome introduced in Stage 11.

Scope:

- Sidebar brand and navigation.
- Topbar title, subtitle and global actions.
- Shell status block using the existing `sideStatusTitle` / `sideStatusText` ids.

The main page sections are still owned by the existing runtime and React page islands. The AppShell intentionally preserves legacy ids and `data-view` attributes so the compatibility layer remains operational during migration.
