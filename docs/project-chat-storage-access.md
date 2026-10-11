# Project-chat Storage access — 2026-10-11

## Purpose and current behavior

Supabase Storage bucket `project-chat-files` is private. Existing objects are named `<project_uuid>/<filename>`, and all 17 production objects found in the initial audit match real, active projects. The new RLS rules enforce exactly that path shape.

* SELECT and INSERT require an active `app_users` profile with `auth_user_id = auth.uid()` and visibility of the project identified by the file path. This matches the existing project-chat message visibility. A member with viewer rights can still upload a chat attachment.
* UPDATE and DELETE additionally require original file ownership or project edit rights, while preserving project membership and active-account requirements.
* Other-project paths, unknown projects, inactive/unlinked accounts and invalid paths fail closed.
* No existing objects or message rows are modified by the migration.

## Root cause and legacy-file recovery verification (2026-10-11)

The previous uploader persisted 30-day Supabase signed URLs directly in chat message bodies. A read-only production audit found 9 such stored URL references: **8 signed tokens already expired, 1 still valid**. All 9 URL paths resolve to real existing Storage objects under the correct project. Expiration is the historical cause of failed old-link downloads; it is not loss of file bytes.

The new chat renderer extracts the file path from legacy URLs and requests it using the current authenticated user, bypassing expired URL tokens **without bypassing project RLS**. Browser asset query versions were bumped to `20261011-chat-legacy-fix-v2` so cached old runtime code is refreshed. No mass edits to historical messages or Storage objects were needed.

Verification: in the live workspace, as an authorized user, open old chat messages and download any archived file. Clicking its button must issue a `/storage/v1/object/authenticated/` download, not follow a `/storage/v1/object/sign/` link. If this fails, capture the network response code and message; a successful policy SELECT check alone is not an end-to-end Storage API test.

## Frontend

New messages contain `storage://project-chat-files/<project_uuid>/<filename>` file references, not 30-day signed URLs. The chat renders images and files by calling `storage.from('project-chat-files').download(path)` with the current user's JWT. It parses legacy Storage URLs but never navigates to their previously signed `token` URLs. Image preview uses a browser-local blob URL which is released when the chat re-renders or the user signs out.

IMPORTANT: previously issued 30-day signed links remain valid as bearer tokens until they expire, even after RLS is tightened. The update prevents new long-lived links but does not revoke copies distributed outside the application. Immediate revocation requires a separately tested move/rename of the affected objects and reconciliation of message references, with a careful migration plan. Do not rotate Auth keys casually to achieve this.

## Deployment

1. First merge and deploy the frontend update, and ensure GitHub Actions security regression passes. Its new file-path format works with existing policies.
2. Apply migration `20261011_project_chat_storage_acl.sql` to the live Supabase project.
3. Verify four project-specific Storage policies exist and there is no old bucket-only policy. The bucket must remain Private.
4. Test storage access as two real users (one project member; one unrelated non-admin), not just as the dashboard service role.
5. Verify files and project messages were not deleted or rewritten.

## Detailed manual tests with two users

Use browser profile A (active non-admin member of project P) and independent browser profile B (active non-admin user with no membership in P). Workspace admins can view every project, therefore cannot serve as negative controls. Prepare only non-sensitive disposable test files.

1. **Read, upload and preview.** In A, open P → Chat. Upload a tiny text file and a PNG with unique names; send the chat message. Refresh. Confirm both appear, the PNG displays inline, and clicking both downloads valid bytes. Check Network: downloads use authenticated `/storage/v1/object/authenticated/project-chat-files/` endpoints, not `/object/sign/`.
2. **Legacy attachments.** In A, open an older chat message containing a previously uploaded image or file. Its preview/download must work. Inspect DOM: the stored 30-day signed URL's `token` parameter must not be used as an `img.src` or `href`.
3. **Unauthorized read.** In B, P should be absent from available projects. Obtain only the pathname of A's *disposable test file* (not a signed URL). With B's authenticated Supabase client in DevTools, call `await sb.storage.from('project-chat-files').download('PROJECT_UUID/FILENAME')`; `data` must be null and `error` non-null. `createSignedUrl(path, 60)` must likewise fail. Do not treat opening an old signed link as a valid RLS test.
4. **Unauthorized write.** From B attempt to upload a harmless new filename under P's prefix. It must fail. Also try a bogus path `not-a-project/bogus.txt` from A; it must fail. Do not overwrite existing production files.
5. **Owner vs viewer vs editor delete.** In a test project, A as uploader can remove only their disposable file. Another viewer cannot delete A's file. Project editor can delete. Use fresh files for each test; deletes are irreversible.
6. **Revoked membership.** In a test project, remove A's membership, reload A, then verify that `download(path)` and `createSignedUrl(path, 60)` fail. Reinstate A's membership and confirm both work again. Pre-issued signed URLs are *not* revoked by this check.
7. **Regression.** Confirm message send, text-only messages, switching between projects, search, owner/reader chat navigation, desktop and iOS/PWA presentation, and logout/login. Confirm no new `storage://` path is incorrectly made into a browser navigation link.
8. **Database verification.** Dashboard → Storage: bucket Private. Dashboard → SQL Editor: review `pg_policies` for four `project_chat_files_*` entries; SELECT/INSERT must use project membership and UPDATE/DELETE must also require ownership or edit rights. Re-check counts of `storage.objects` and `project_messages`. No production files should be removed.
9. **Deployment verification.** Review the final commit and GitHub Actions run; verify the website loads the new attachment controller before `app-runtime.js`.

### Safe rollback

Do NOT revert the database to the original bucket-wide policies; that would reintroduce unauthorized access. In case of client regressions, keep the stricter RLS and fix or revert only the affected frontend handling. Legacy signed links can remain valid until their original expiry; do not claim that the migration invalidates them.
