# Favourite and Default Views

How to favourite task views and choose the default view for a project or the portal.

## Tools

| Tool | Path variables | Body |
|------|----------------|------|
| `mark_project_custom_view_favourite` | portal_id, project_id, custom_view_id | None |
| `unmark_project_custom_view_favourite` | portal_id, project_id, custom_view_id | None |
| `mark_portal_custom_view_favourite` | portal_id, custom_view_id | None |
| `unmark_portal_custom_view_favourite` | portal_id, custom_view_id | None |
| `set_project_default_view` | portal_id, project_id, custom_view_id | `{}` or `{"for_all_users": true}` |
| `set_portal_default_view` | portal_id, custom_view_id | `{}` or `{"for_all_users": true}` |

All six return an empty 204. Verify with a list call.

## Favourites

The project and portal favourite flags are separate:
- A view favourited in a project appears under `view_type` `favourite_views` in `get_project_task_custom_views` for that project, with `is_favourite` true. It does not appear in the portal favourites.
- A view favourited at portal level appears under `favourite_views` in `get_portal_task_custom_views`.
- Favourite a view in both places if the user wants it in both.

Marking a view that is already a favourite returns 204 again, and unmarking a view that is not a favourite also returns 204. An unknown view ID returns 404 `RESOURCE_NOT_FOUND`.

```json
{"path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "custom_view_id": "1752587000000520011"}}
```

A project favourite only shows if the view is scoped to that project (`project_accessibility_type` `specific_projects` or `all`).

## Project Default View

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "custom_view_id": "1752587000000520011"},
  "body": {}
}
```

- With an empty body, only the current user's default changes.
- Read the current default first with `get_project_task_custom_views` and `view_type` `default_view`. It returns one row with `is_default_view` true. Record its `id` so the user can switch back.
- To switch back, call `set_project_default_view` with the recorded ID. Restoring a predefined view such as "All Open" this way worked.
- `for_all_users: true` sets the default for every project member and is not undone by later calls that omit it. It was not tested; treat it as a shared setting and confirm separately.

## Portal Default View

- `set_portal_default_view` takes the same body. `for_all_users: true` affects every user in every project.
- `get_portal_task_custom_views` with `view_type` `default_view` returned a row whose `is_default_view` was false. Do not take that row as proof of the current default; check `is_default_view` on each row.
- The portal default call itself was not exercised during verification. Treat its behavior as unverified and read the default back after any change.

## Before Any Change

- Record the current default view ID and name, and tell the user how to revert.
- Say whether the change is for the user only or for everyone. Never send `for_all_users: true` unless the user asked for everyone.
- Favourites are personal; no extra warning is needed beyond naming the view.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Favourite not in the portal list | Marked at project level only | Also call `mark_portal_custom_view_favourite` |
| Favourite not in the project list | Marked at portal level only, or view not scoped to the project | Call the project variant; scope the view to the project |
| 404 `RESOURCE_NOT_FOUND` | Wrong or deleted view ID | Re-list views and use a current `id` |
| Default changed for everyone | `for_all_users: true` sent | Set the previous default again with `for_all_users: true`, after confirming |
| Unsure which view was the default | Default not recorded before the change | Read `default_view` before every default change |
