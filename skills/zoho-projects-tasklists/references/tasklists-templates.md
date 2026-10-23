# Task List Templates and Cloning

How to save a task list as a template, browse templates, and create a list by cloning a live list or a template.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `make_task_list_as_template` | portal_id, project_id, tasklists_id | No body. Copies the list and its tasks into a portal-level template |
| `get_task_lists_from_template` | portal_id | All task list templates in the portal. No `page_info` |
| `get_tasks_from_task_list_template` | portal_id, tasklist_template_id | The task blueprints inside one template |
| `clone_task_list` | portal_id, project_id | Body `source_tasklist.id` (required): a live list or a template |

## Saving a Template

- The template takes the list's current name; there is no name parameter. Rename the list first if the template needs another name.
- The source list is not changed.
- Response: `{"id", "name", "created_time", "created_by"}`. The `id` is the template ID, different from the list ID.
- Templates are visible to every project in the portal, and no tool in this set deletes a template. Tell the user this before asking for confirmation.

## Browsing Templates

`get_task_lists_from_template` returns `data.task_list_templates`, each with `id`, `name`, `sequence` and `created_time`. `page` and `per_page` have no effect. Several templates can share a name; show `created_time` to tell them apart.

`get_tasks_from_task_list_template` returns `data.task_templates`. Each item has:
- `id`, `title` (not `name`), `sequence`, `depth`, `is_parent` (the string `"true"` or `"false"`).
- Relative scheduling: `duration`, `duration_type` (for example `days`), `start_after`, `start_after_frequency`. Templates hold no fixed dates.

```json
{"path_variables": {"portal_id": "60012345678", "tasklist_template_id": "1752587000000431311"}}
```

Passing a live task list ID instead of a template ID returned 200 with an empty `task_templates` array, not an error. An empty result can mean "wrong kind of ID" as well as "empty template"; check the ID against `get_task_lists_from_template`.

## Cloning a Live List

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"source_tasklist": {"id": "1752587000000431107"}, "milestone": {"id": "1752587000000431205"}}
}
```

Confirmed live:
- The clone reuses the source name, so the project then has two lists with the same name. Offer to rename the clone with `update_task_list`.
- Tasks are copied with new task IDs, and the list's comments are copied with new comment IDs.
- The phase is not inherited. Omit `milestone` to leave the clone unassigned, or pass `milestone.id`.
- `shift_date` is optional for a live source.
- The response has the new list, but `last_updated_time` is copied from the source and `project.name` is missing.
- Cloning an external list into an internal phase returns 403 "External task list cannot be associated with an internal Milestone."

The source may live in another project of the same portal (documented, not exercised live). `include_dependent_tasklists`, `status_mapping` and `tags` were not exercised live.

## Applying a Template

`shift_date` is mandatory when the source is a template.
- Omitted: 400 `INPUT_PARAMETER_MISSING` on `shift_date`.
- Date only (`2026-11-02`): 400 `INVALID_PARAMETER_VALUE` "input format mismatch".
- ISO 8601 date-time (`2026-11-02T00:00:00Z` or with `.000Z`): accepted by validation.

On the test portal every template clone with a valid `shift_date` returned 500 `INTERNAL_SERVER_ERROR`, yet each call created a new, empty list named after the template (placed in the requested phase when `milestone` was sent). The cause was not confirmed; the project layout had a mandatory task custom field, which the template tasks may not satisfy.

So after any template clone, success or error:
1. Call `get_all_project_task_lists` with `sort_by: "DESC(created_time)"` and look for a new list with the template's name.
2. Compare its `count_info.open_task_count` with the number of `task_templates`.
3. If the clone failed, do not retry blindly; each retry leaves another empty list. Report the empty list and ask whether to trash it.

## Before Any Change

- Show the source (list or template, name, ID, task count) and the destination project and phase, and wait for confirmation.
- Remind the user that a saved template is portal-wide and cannot be deleted with these tools.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 `INPUT_PARAMETER_MISSING` on `shift_date` | Template source without `shift_date` | Send an ISO 8601 date-time |
| 400 `INVALID_PARAMETER_VALUE` "input format mismatch" on `shift_date` | Date without time | Use `YYYY-MM-DDTHH:MM:SSZ` |
| 400 `INVALID_PARAMETER_VALUE` "Task list should belong to a project, project template, or task template." | Unknown `source_tasklist.id` | Take the ID from a list call or `get_task_lists_from_template` |
| 403 "External task list cannot be associated with an internal Milestone." | External source cloned into an internal phase | Clone without `milestone`, or use an internal source |
| 500 `INTERNAL_SERVER_ERROR`, empty list created | Template clone failed partway (cause unconfirmed) | Check for the new empty list, report it, do not retry blindly |
| Template tasks list is empty | Live list ID passed as `tasklist_template_id` | Use an ID from `get_task_lists_from_template` |
| Template has the wrong name | Name is copied from the list | Rename the list before saving the template |
