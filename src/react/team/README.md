# React Stage 8 — TeamPage / Users / Permissions UI

The team page is now rendered by a React island.

Boundary:

- `src/features/team/render.js` remains the integration adapter used by the legacy runtime.
- `src/react/team/teamModel.ts` owns pure view-model and permission-summary rules.
- `src/react/team/TeamPage.tsx` and `UserCard.tsx` own presentation.
- User editing still goes through the existing legacy modal and `data-action="open-user"`.
- Supabase writes remain in the existing service/action layer.

No Supabase configuration, RLS or business persistence logic is changed in this stage.
