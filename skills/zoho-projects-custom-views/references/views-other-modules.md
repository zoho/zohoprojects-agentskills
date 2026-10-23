# Issue, Project and Phase Views

How to list views outside the task module, and how to save phase and project views with the generic view tool.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_project_issue_custom_views` | portal_id, project_id | Issue views for one project, grouped |
| `get_portal_issue_custom_views` | portal_id | Issue views across the portal, grouped |
| `get_project_issue_custom_view` | portal_id, project_id, view_id | One issue view with its filter fields |
| `get_portal_issue_custom_view` | portal_id, view_id | Same at portal level |
| `get_projects_custom_view_list` | portal_id | Views of the projects module; `project_type` `0` active, `1` archived, `2` template |
| `get_user_views_list` | portal_id | Views of one module for the current user; `module`, `page`, `per_page` required |
| `create_or_update_view` | portal_id | Creates a view, or updates one when `id` is in the body |

No tool here creates, updates or deletes issue views.

## Issue Views

The issue list response is grouped, not paged: `shared_views`, `favourites`, `default_views` and `custom_views`. Each row uses `custom_view_id` (not `id`), with `name`, `is_default`, `is_favourite`, `is_editable` and `is_deletable`. Predefined views such as "All Issues", "All Open" and "My Open" sit under `default_views`.

Pass a `custom_view_id` as `view_id` to the issue list tools (see the `zoho-projects-issues` skill). Read the view with `get_project_issue_custom_view` before treating its results as an answer.

## Projects Module Views

`get_projects_custom_view_list` returns `favourites`, `default_views` and `custom_views`, rows keyed by `custom_view_id`. Default view names come back as message keys such as `zp.search.allprojs`; describe them to the user by meaning ("All projects"), not by the key.

## get_user_views_list

```json
{"path_variables": {"portal_id": "60012345678"}, "query_params": {"module": "1752587000000047001", "page": 1, "per_page": 100}}
```

- `module` takes the module `id` from `get_modules`.
- It worked for the phases and projects modules. For tasks and issues it returned 501 `NOT_IMPLEMENTED` "View Configuration is not implemented for this module"; use the task and issue tools instead.
- Rows have `id`, `name`, `is_favorite` (this spelling), `is_default_view`, `is_editable` and `is_deletable`. Predefined names are message keys such as `zp.milestone.allopen`.
- This is the only tool that lists phase views. Its `id` values work as `view_id` on the phase list tools (see the `zoho-projects-phases` skill); that use is unverified.

## create_or_update_view

Supported for the phases and projects modules; tasks returned 501. Use the task view tools for tasks.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "module": "1752587000000047001",
    "name": "Phases ending soon",
    "view_access_type": "only_to_me",
    "project_access_type": "specific_project",
    "project": {"id": "1752587000000431001"},
    "determiner": {"criteria": [{"field_name": "name", "condition": "contains", "value": ["Beta"]}], "pattern": "1"}
  }
}
```

- `determiner` is a JSON object, not a string, and its condition key is `value` (singular). This differs from task views, which take a `criteria` string with `values`.
- The response is the saved view: `id`, `name`, `view_access_type`, `project_access_type`, `determiner`, `shared_projects`.
- To update, send the `id` with `module` and the changed fields. A rename sent without `determiner` kept the existing criteria.
- No tool in this set deletes these views. `delete_task_custom_view` returns 404 for them. Tell the user before creating one that removal has to be done in the Zoho Projects UI.

## Before Any Change

- For `create_or_update_view`, confirm the module, the scope (`view_access_type`, project) and the criteria in plain words.
- Warn that phase and project views cannot be deleted with these tools.
- Read the current view before an update and send only the fields the user changes.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 501 "View Configuration is not implemented for this module" | Task or issue module passed to `get_user_views_list` or `create_or_update_view` | Use the task or issue view tools |
| Issue view ID missing | Read `id` instead of `custom_view_id` | Use `custom_view_id` from the grouped lists |
| View name shows as `zp.` key | Predefined view name is a message key | Describe the view by meaning |
| 404 deleting a phase or project view | `delete_task_custom_view` covers task views only | Remove it in the Zoho Projects UI |
