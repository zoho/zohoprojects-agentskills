# Trash, Restore and Delete Projects

How a project moves to the recycle bin, comes back, and is removed for good.

## Tools

| Tool | Path variables | Response |
|------|----------------|----------|
| `trash_project` | portal_id, project_id | 204 with no body ("Empty response received from API") |
| `restore_project` | portal_id, project_id | 204 with no body |
| `delete_project` | portal_id, project_id | 204 with no body. Only works on a project already in the trash |

None of these take a body. Each acts on one project per call.

## Lifecycle

1. Active or archived project: `trash_project` moves it to the recycle bin. It keeps its tasks, issues and settings.
2. Trashed project: `restore_project` brings it back; `delete_project` removes it permanently.
3. Deletion runs in the background. Right after a 204 from `delete_project`, `get_project_detail` can still return 410 `RESOURCE_TRASHED` for a short time. Later it returns `{"error":{"code":6404,"message":"Resource Not Found"}}`. Check again before telling the user it is gone.

```json
{"path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"}}
```

## Finding Trashed Projects

- `get_project_detail` on a trashed project returns 410 `RESOURCE_TRASHED` with `details[0].resources[0].title` (the name) and `has_restore_permission`. Use this to confirm the state of a known ID.
- To list trashed projects, call `get_projects_custom_view_list` (portal_id), take the default view named `zp.project.trashprojects`, and pass its `custom_view_id` as `view_id` to `get_projects_list`. The view list returns `custom_view_id`, not `id`. Trashed rows show `project_type: "10"`.
- `get_trashed_records` returned no projects in testing even with a `module` filter of `projects`. Use the trash view above instead.

Other default views follow the same pattern: `zp.tpmenu.archivedprojects` (archived), `zp.projtemp.projtemp` (templates), `zp.projects.completedprojects` (completed). `project_type` on `get_projects_custom_view_list` (`"0"` active, `"1"` archived, `"2"` template) narrows the view list.

## Before Any Change

- Trash: show the project name, ID, owner and open task and issue counts (`tasks.open_count`, `issues.open_count` from `get_project_detail`). Say that everyone in the project loses access until it is restored.
- Restore: confirm the project name from the 410 error or the trash view.
- Permanent delete: ask as its own step, after trashing, with the name and ID. State that it cannot be undone and removes the project together with its tasks, issues and other records. Never delete a project the user did not name explicitly.
- Never chain trash and delete behind one confirmation unless the user asked for permanent deletion in the same request and confirmed the exact project.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 404 RESOURCE_NOT_FOUND (`zp.scheduler.error14`) from `delete_project` | Project is not in the trash | Trash it first, after confirming, or stop if the user only wanted it hidden |
| 404 RESOURCE_NOT_FOUND from `restore_project` | Project is not in the trash (active or archived) | Nothing to restore; to unarchive use `update_project` with `project_type: "active"` |
| 410 RESOURCE_TRASHED from `trash_project` | Project is already trashed | No action needed; tell the user |
| 410 RESOURCE_TRASHED from `get_project_detail` or `update_project` | Project is in the trash | Restore it first if the user wants to edit it |
| 410 RESOURCE_TRASHED right after a delete | Deletion still in progress | Wait and check again |
| `code 6404` "Resource Not Found" | Project was permanently deleted, or the ID is wrong | Recheck the ID; a deleted project cannot be recovered |
| Trashed project missing from `get_trashed_records` | That tool did not list projects in testing | Use the `zp.project.trashprojects` view with `get_projects_list` |

Note the error shape: the delete and restore 404s come back as an `error` array with `details[].resources[].id`, while 410 errors come back as a single `error` object.
