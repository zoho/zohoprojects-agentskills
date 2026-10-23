# Task Custom Views

How to list, read, create, update, clone and delete saved task views.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_portal_task_custom_views` | portal_id | Every task view, including My Tasks views |
| `get_project_task_custom_views` | portal_id, project_id | Views visible in one project |
| `get_task_custom_view_details` | portal_id, custom_view_id | One view with parsed `criteria` |
| `create_custom_view_in_project` | portal_id, project_id | Required: `name`, `module_id`, `criteria`, `criteria_pattern` |
| `create_custom_view_in_mytasks` | portal_id | Same body; stored with `project_accessibility_type` `none` |
| `update_custom_view_in_project` | portal_id, project_id, custom_view_id | `criteria` and `criteria_pattern` required on every update |
| `update_custom_view_in_mytasks` | portal_id, custom_view_id | Same rule |
| `clone_custom_view` | portal_id, custom_view_id | No body; copy is named `<name> (1)` |
| `delete_task_custom_view` | portal_id, custom_view_id | Permanent; returns 204 |

## Listing

- Both list tools take `view_type`: predefined_views, my_views, custom_views, favourite_views, default_view, i_created, shared_with_me. Pass `per_page` explicitly and follow `page_info.has_next_page`; `page_count` is unreliable (it reported 4 for a single page).
- List rows carry `id`, `name`, `view_type`, `is_favourite`, `is_default_view` and `created_by_user`. Most rows omit criteria. The `default_view` rows include `criteria` as a string in an internal column form; do not reuse it. Read criteria with `get_task_custom_view_details`, which returns a parsed array under `data.taskcustomviews[0]`.
- To apply a view, pass its `id` as `view_id` to the task list and count tools (see the `zoho-projects-tasks` skill).

## Criteria

`criteria` is a JSON-encoded string holding an array of conditions. Each condition is `{"field_name", "condition", "values", "module": "Task"}`. `criteria_pattern` is a sibling string with 1-based indices and uppercase `AND` / `OR`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "name": "Open release tasks",
    "module_id": "1752587000000018001",
    "criteria": "[{\"field_name\":\"name\",\"condition\":\"contains\",\"values\":[\"release\"],\"module\":\"Task\"},{\"field_name\":\"status\",\"condition\":\"is\",\"values\":[\"1752587000000016045\"],\"module\":\"Task\"}]",
    "criteria_pattern": "1 AND 2",
    "project_accessibility_type": "specific_projects",
    "project_ids": ["1752587000000431001"]
  }
}
```

Confirmed rules:
- `module_id` is the Task module `id` from `get_modules`, not the name `tasks`.
- `status` takes the status option ID. `priority` takes `high`, `medium`, `low` or `none`, and only one value per condition; two values return "Kindly provide a valid criteria" with "select one value".
- Dates must be `yyyy-MM-dd'T'HH:mm:ss.SSSZ`, for example `2026-12-01T00:00:00.000Z`. A plain `2026-12-01` is rejected. This is the opposite of task list filters, which only take `YYYY-MM-DD`.
- Lowercase `and` / `or` in `criteria_pattern` returns `PATTERN_NOT_MATCHED`.
- An empty array `"[]"` returns "Custom View criteria should not be empty".
- View names need not be unique; a second view with the same name was created. Check the list before creating.

Other operators (owner, `current_login_user`, between, number conditions) are listed in the tool description but were not tested.

## Project vs My Tasks Views

- A project view needs `project_accessibility_type` `specific_projects` with `project_ids`, or `all`. Left at the default `none`, the view is created but never shows in `get_project_task_custom_views`.
- `create_custom_view_in_mytasks` stores the view with `project_accessibility_type` `none` and `is_mytasks_view_enabled` true. It is listed by `get_portal_task_custom_views`, not by the project list.
- New views come back with `access_type` `me` (only the creator). Sharing through `access_type` `custom_users` and `accessed_by` is unverified.

## Updating

Send `criteria` and `criteria_pattern` on every update, even for a rename. For a `specific_projects` view, also resend `project_ids`, or the call returns `INPUT_PARAMETER_MISSING` on `project_ids`. Read the view first, re-encode its `criteria` array as a string, then change only what the user asked for.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "custom_view_id": "1752587000000520011"},
  "body": {
    "name": "Open release tasks (Q4)",
    "criteria": "[{\"field_name\":\"name\",\"condition\":\"contains\",\"values\":[\"release\"],\"module\":\"Task\"}]",
    "criteria_pattern": "1",
    "project_ids": ["1752587000000431001"]
  }
}
```

An empty string in `criteria` on update returned a 500 `INTERNAL_SERVER_ERROR`, not a validation error.

## Cloning and Deleting

- `clone_custom_view` returns `data.views` as a single object whose `criteria` is an internal string (`cfid`, `column_name`, `criteria_condition`, `value`). Do not feed it into an update; read the clone with `get_task_custom_view_details` first. A clone of a project view keeps its project scope.
- `delete_task_custom_view` returns 204 and cannot be undone. Predefined views cannot be deleted; do not try on views such as "All Open". It does not delete phase or project views made with `create_or_update_view` (404).

## Before Any Change

- Read the view with `get_task_custom_view_details` and show its name, criteria and scope.
- For a delete, confirm the view is not predefined and was created by the user (`created_by`).
- Translate the user's filter into criteria and show it in plain words before saving.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Kindly provide a valid criteria" on a date | Plain `YYYY-MM-DD` | Use `yyyy-MM-dd'T'HH:mm:ss.SSSZ` |
| "Kindly provide a valid criteria", "select one value" | Several values on a single-select field | One value per condition; add conditions joined by `OR` |
| "Custom View criteria should not be empty" | `criteria` is `"[]"` | Send at least one condition |
| 400 `PATTERN_NOT_MATCHED` on `criteria_pattern` | Lowercase `and` / `or` | Use uppercase `AND` / `OR` |
| 400 `INPUT_PARAMETER_MISSING` on `project_ids` | Update of a project view without `project_ids` | Resend the view's `project_ids` |
| 500 on update | Empty `criteria` string | Resend the existing criteria |
| View missing from the project list | `project_accessibility_type` left at `none` | Update it to `specific_projects` with `project_ids` |
| 404 `RESOURCE_NOT_FOUND` | Wrong or deleted view ID | Re-list views and use a current `id` |
