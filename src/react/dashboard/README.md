# React Dashboard overview

Stage 25 moves the overview project/task cards out of legacy string rendering.

The runtime still calls `render()` while `runtime-compatibility` exists, but the overview
containers are now populated through React islands:

- `overviewProjects` -> `DashboardProjects`
- `focusList` -> `DashboardFocusTasks`

This keeps the legacy dashboard DOM contract stable while removing `cardP()` and
`cardT()` from the old runtime core.
