# Portals and Projects

How to resolve the portal, the project and the parent project of a record before calling any module tool.

## Resolution Order

1. `portal_id`: call `get_portals` and take the `id` of the chosen portal.
2. `project_id`: call `get_projects_list` with the portal_id and take the project `id`.
3. Entity ID (task, issue, record): take it from a list call or a create response in the module skill.

Every tool except `get_portals` needs `portal_id`. Keep the chosen portal_id and project_id for the rest of the session and reuse them; do not resolve them again for every call.

## Portals

`get_portals` takes no path variables. By default it returns production portals only. Set `filter_user_portal` to true to include sandbox portals:

```json
{"query_params": {"filter_user_portal": true}}
```

- One portal: use it and tell the user which one.
- Several portals: list them by name and ask which one. Do not pick one silently.
- No portals: the account or data center is wrong. See `mcp-setup.md`.

`get_portal_details` (portal_id) returns the configuration and metadata of one portal. Call it only when the user asks about portal settings.

## Projects

`get_projects_list` returns active projects by default.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"page": 1, "per_page": 100}
}
```

- Match the user's project name against the `name` of each row. If more than one row matches, show the candidates with their IDs and ask.
- Archived, template or trashed projects are not in the default list. Call `get_projects_custom_view_list` (portal_id), pick the view of the needed type, and pass its `id` as `view_id`.
- `sort_by` sorts on last updated time, ascending or descending.
- Paging accepts `page` and `per_page`, or `index` and `range`. See `api-conventions.md`.

`get_project_detail` returns one project when its full record is needed.

## Parent Project of a Record

When the user gives only a task or issue ID, resolve its project with `get_project_id_from_entity_id`. It needs `portal_id`, the `module_id` of the record's module, and the `entity_id`.

1. Call `get_modules` (portal_id) and take the `id` of the module the record belongs to.
2. Call `get_project_id_from_entity_id` with `dependent_module` set to `task` for tasks, `bug` for issues, or `general` otherwise.

```json
{
  "path_variables": {
    "portal_id": "60012345678",
    "module_id": "1752587000000005001",
    "entity_id": "1752587000000440021"
  },
  "query_params": {"dependent_module": "task"}
}
```

`module_id` must be the digit ID from `get_modules`, not the API name such as `tasks`.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on portal_id | Portal name or URL slug passed | Use the `id` from `get_portals` |
| Sandbox portal not listed | `filter_user_portal` not set | Call `get_portals` with `filter_user_portal` true |
| Project not found by name | Project is archived, a template or trashed | Get a `view_id` from `get_projects_custom_view_list` and pass it to `get_projects_list` |
| Several projects match a name | Similar names in the portal | Show candidates with IDs and ask the user |
| Request fails on module_id | Module API name passed instead of its ID | Use the `id` from `get_modules` |
| Parent lookup fails for a record | `module_id` or `dependent_module` does not match the record type | Take `module_id` from `get_modules` for that module; use `task` for tasks, `bug` for issues |
| Project list stops early | Only the first page was read | Follow `page_info.has_next_page` when present; otherwise request the next page until a page returns fewer rows than `per_page` |
