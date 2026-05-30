# React Projects island

React Stage 6 moves the Projects page presentation layer to React without changing the existing project save/delete/access business logic.

Boundaries:

- `src/react/projects/projectModel.ts` builds typed view models.
- `src/react/projects/ProjectsPage.tsx` renders the project grid.
- `src/react/projects/ProjectCard.tsx` renders one project card.
- `src/features/projects/render.js` remains the legacy integration adapter and preserves `data-action` compatibility.

The project modal and access modal still use the existing compatibility layer. They will be migrated in later stages only after the Projects page is stable.
