# React MaterialsPage

React Stage 7 migrates the owner-only workspace materials page to a React island.

Boundaries preserved:

- Supabase service calls remain in `src/services/materials.service.js`.
- Owner visibility is still decided by `src/core/permissions` and the existing permissions guard.
- The legacy runtime still owns global view switching.
- React owns only the Materials page presentation and local UI events.

Main files:

```text
src/react/materials/materialsModel.ts
src/react/materials/MaterialsPage.tsx
src/react/materials/mountMaterialsPage.tsx
src/features/materials/index.js
src/styles/materials-react.css
```
