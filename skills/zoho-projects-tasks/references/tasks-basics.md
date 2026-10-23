# Task Basics

How to list and page through tasks, sort them, apply views, answer "my tasks" and read a single task.

## Task IDs

Portal and project IDs come from the `zoho-projects` skill (`references/portals-and-projects.md`). Take `task_id` from a `get_tasks_by_project` or `get_tasks_by_portal` row, or from a create or clone response. If a task name matches more than one row, show the candidates and ask.

## Project vs Portal Listing

- `get_tasks_by_project` (needs `portal_id` and `project_id`): use whenever the project is known.
- `get_tasks_by_portal` (needs `portal_id`): returns tasks from every project in the portal and cannot be narrowed to one project. Each row identifies its project only through the nested `project.id`. Use it for cross-project questions such as "everything assigned to me".

Both accept the same `query_params`: `filter`, `view_id`, `page`, `per_page`, `sort_by`. Filter rules are in `tasks-filters.md`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"per_page": 100, "page": 1, "sort_by": "ASC(end_date)"}
}
```

## Open and Closed Defaults

- `get_tasks_by_project` with neither `view_id` nor `filter` returns open and closed tasks.
- `get_task_count` with neither `view_id` nor `filter` counts the project's default task view, which is open tasks only.

The same project can report 2 tasks from the list and a count of 1. When the two must agree, pass the same `filter` or `view_id` to both. To count every task including closed ones, pass the "All Tasks" view in `view_id`. For a freshly created project the unfiltered count may be empty until the task index is built; the `view_id` and `filter` paths are computed live.

## Pagination

- `page` defaults to 1. `per_page` is capped at 200.
- There is no single default page size; pass `per_page` explicitly whenever the page size matters.
- Keep requesting the next `page` while `page_info.has_next_page` is true. Never assume one response holds everything.

## Sorting

`sort_by` format: `ASC(field_name)` or `DESC(field_name)`, comma separated for multiple fields, for example `DESC(priority_sequence),ASC(end_date)`.

Supported fields: id, name, start_date, end_date, completion_percentage, sequence, subtask_sequence, status_sequence, global_status_sequence, priority_sequence, global_priority_sequence, percentage_sequence, global_percentage_sequence, created_time, last_modified_time, created_by.

## Custom Views

`view_id` applies the criteria of a saved task view.

- `get_portal_task_custom_views` (portal_id): all task views across projects and My Tasks.
- `get_project_task_custom_views` (portal_id, project_id): views for one project.
- Both accept `view_type`: predefined_views, my_views, custom_views, favourite_views, default_view, i_created, shared_with_me.
- `page_info.page_count` on these view lists can exceed the real page count; rely on `page_info.has_next_page`.

## My Tasks

Never use the `current_login_user` macro on `owner`: it returns 200 with zero rows, which looks like "you have no tasks".

1. Resolve the current user's ZPUID as described in the `zoho-projects` skill (`references/users.md`, Current User).
2. Filter on `owner` with `is` and the ZPUID. Add a status criterion for open tasks if the user means pending work.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {
    "filter": "{\"criteria\":[{\"field_name\":\"owner\",\"criteria_condition\":\"is\",\"value\":[\"1752587000000097003\"]},{\"field_name\":\"status\",\"criteria_condition\":\"is\",\"value\":[\"${ALL_OPEN}\"]}],\"pattern\":\"1 AND 2\"}",
    "per_page": 100
  }
}
```

## Task Details

`get_task_details` (portal_id, project_id, task_id) returns the full record. Fields worth reading:

- `status` (`id`, `name`, `is_closed_type`), `priority`, `start_date`, `end_date`, `completion_percentage`, `is_completed`, and `completed_on` on closed tasks.
- `owners_and_work` (owners, work_type, unit, total_work).
- `tasklist` and `milestone`. `milestone` is the phase, derived from the task list.
- `parental_info` (`parent_task_id`, `root_task_id`) for subtasks.
- `dependency_info` with `predecessor` and `successor` arrays. This is the only way to read dependencies.
- `association_info` flags: has_comments, has_attachments, has_forums, has_subtasks, has_reminder, has_recurrence, has_blueprint, plus `blueprint_id`. Call the related tool only when the flag is true.
- Custom fields as top-level keys named by API `field_name`, for example `task_cf_0006`. There is no `custom_fields` wrapper.

Fields with no value are omitted, so a missing key does not mean the field is absent from the layout. Comments, followers, forums and attachments are not included.

## Task Forums

`get_task_forums` (portal_id, project_id, task_id) lists forums linked to a task. It returns an empty array when none are linked and defaults to 100 per page. Because forum association accepts invalid IDs silently, this call is the only reliable way to confirm an association exists. `page_info` values are integers and booleans, not strings.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on task_id | A task title was passed instead of a digit ID | Resolve it from a task list call; for portal and project IDs see the `zoho-projects` skill |
| List shows more tasks than `get_task_count` | List defaults to open and closed, count defaults to open only | Pass the same `filter` or `view_id` to both, or the "All Tasks" view to the count |
| Count is empty for a new project | Task index not built yet for the default count path | Pass a `filter` or `view_id`, which are computed live |
| "My tasks" returns zero rows | `current_login_user` used on `owner`, or a ZUID passed to `owner` | Resolve the ZPUID (see `zoho-projects`, `references/users.md`) and filter with `is` |
| Results stop early | Only the first page was read | Follow `page_info.has_next_page` with increasing `page` |
| Portal-wide rows mixed across projects | `get_tasks_by_portal` cannot scope to one project | Use `get_tasks_by_project`, or group rows by `project.id` |
| Custom field seems missing in details | Empty fields are omitted from the response | Check the layout with `get_fields` before concluding the field is absent |
