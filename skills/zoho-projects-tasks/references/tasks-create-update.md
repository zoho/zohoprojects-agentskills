# Create, Update and Delete Tasks

Request shapes and side effects for `create_a_task`, `update_a_task` and `delete_a_task`.

## create_a_task

- `path_variables`: `portal_id`, `project_id`.
- `body`: only `name` is required.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "name": "Prepare release notes",
    "description": "Summarise changes for v2.4",
    "tasklist": {"id": "1752587000000431107"},
    "priority": "high",
    "start_date": "2026-11-02",
    "end_date": "2026-11-06",
    "owners_and_work": {"owners": [{"zpuid": "1752587000000097003"}]}
  }
}
```

### Task List

- Optional. When omitted, the task falls back to the project's general task list. Do not ask the user for a task list ID when none was given.
- To target a named list, call `get_all_project_task_lists` and match by name, then pass `tasklist: {"id": "<id>"}`. `tasklist.name` is ignored.
- To make sure the default "General" list exists, call `create_default_tasklist` with `body.flag` "internal" (default) or "external". It is idempotent per flag.

### Phase

The phase is derived from the task list and reported back in `milestone`. Do not try to set it on the task; choose a list that belongs to the right phase.

## Status

- Send `status: {"id": "<status_id>"}`. A status name returns 400 INVALID_PARAMETER_VALUE because `status.name` is read-only.
- Get status option IDs for the project as described in the `zoho-projects` skill (`references/fields-and-options.md`), passing `filter.project_id`.
- Omit status on create to accept the layout default, normally "Open".
- Setting a closed-type status also sets `is_completed` true, `completion_percentage` 100 and a `completed_on` timestamp. Do not send those fields separately.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "task_id": "1752587000000440021"},
  "body": {"status": {"id": "1752587000000016071"}}
}
```

## Owners

`zpuid` is the ZPUID; resolve it as described in the `zoho-projects` skill (`references/users.md`). Never send the `zuid`.

On create, pass a plain array: `"owners": [{"zpuid": "1752587000000097003"}]`.

On update, only one shape is safe for adding an owner:

| Shape | Effect |
|-------|--------|
| `[{"add":[{"zpuid":"X"}]}]` | Additive. Existing owners and work allocation are kept. Use this. |
| `[{"add":[{"zpuid":"X"}],"remove":[]}]` | Destructive. An empty `remove` drops every owner not named in `add`. |
| `[{"zpuid":"X"}]` | Replaces the whole owner list, removing everyone else. |
| `{"add":[{"zpuid":"X"}]}` | 400 JSON_PARSE_ERROR (bare object, not an array). |

The array holds at most one add/remove object, and user objects and instruction objects must not be mixed. The schema documents a `remove` list but does not spell out remove-only behavior; before removing an owner, read the current owners with `get_task_details`, confirm the exact result with the user, and verify with `get_task_details` afterwards.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "task_id": "1752587000000440021"},
  "body": {"owners_and_work": {"owners": [{"add": [{"zpuid": "1752587000000097011"}]}]}}
}
```

### Work Allocation Side Effects

Any shape that replaces owners resets `unit` to hours, `copy_task_duration` to false, and recalculates `total_work` from the incoming owners (00:00 when they carry no `work_values`). The additive `add` shape leaves all three untouched. Warn the user before a replace.

Other `owners_and_work` fields:
- `work_type`: standard or flexible.
- `unit`: hours_per_day, %_per_day or hours for standard; hours or % for flexible.
- `work_values` per owner: "HH:MM" for hour units, a digit string 0 to 100 for %_per_day, or for flexible an array of `{"day": 1, "value": "04:00"}` or `{"date": "2026-11-02", "value": "04:00"}`.
- `copy_task_duration`: standard work type only; when true, owner work values are ignored.

## Dates

- `start_date` and `end_date` are ISO 8601: `yyyy-MM-dd'T'HH:mm:ss'Z'` for UTC or with an offset such as `2026-11-06T17:00:00+05:30`.
- A portal in date-only mode expects `yyyy-MM-dd`. Check the portal settings (`get_portal_details`) before choosing the format.
- `duration` is derived from the two dates.

## Other Fields

| Field | Values |
|-------|--------|
| `priority` | none, low, medium, high (lowercase) |
| `billing_type` | none, billable, non_billable (body strings; filters use 0/1/2) |
| `completion_percentage` | Integer 0 to 100 |
| `description` | Up to 64K characters, HTML supported, `\n` for line breaks |
| `parental_info.parent_task_id` | Makes the task a subtask (see `tasks-structure.md`) |
| `tags` | Plain array of tag objects, or one `{"add":[...],"remove":[...]}` object; do not mix |

### Custom Fields

Send custom fields as top-level body keys named by their API `field_name` from `get_fields` (module tasks, `filter.project_id`). There is no `custom_fields` wrapper. Display names, unknown fields, or fields absent from the project's layout return 400. On update, a field the user cannot write also errors.

```json
{"name": "Vendor review", "task_cf_0006": "https://example.com/contract"}
```

### Recurrence

`recurrence.frequency`: none, daily, weekly, monthly, yearly. `interval`: 1 to 15. Optional: `end_after_occurrences`, `retain_comments`, `retain_subtasks`. `next_recurrence_after_close` and `set_to_previous_businessday` are required whenever recurrence is sent; omitting either causes a server error.

```json
{"recurrence": {"frequency": "weekly", "interval": 1, "next_recurrence_after_close": true, "set_to_previous_businessday": false}}
```

### Reminder

`reminder.reminder_criteria` (lowercase): none, daily, on, before, after. Never "on_due_date" or a boolean.
- `on`: use `custom_date` (YYYY-MM-DD) with `field_type` empty, or a date `field_type`.
- `before` / `after`: require `field_type` (start_date, end_date or a date custom field), `duration_type` and `no_of_duration` (positive integer as a string).
- `reminder_notify_users`: items of `{"type": "user", "values": ["<zuid>"]}` (ZUID here), or type teams, reporting_manager, fields.

## update_a_task

- `path_variables`: `portal_id`, `project_id`, `task_id`. Only fields in `body` change.
- Ignored if sent: id, project.id, created_time, last_modified_time, created_by, log_hours, evm_budget_info.earned_value.
- Cannot change `tasklist` or `project`. Use `move_task` (see `tasks-structure.md`).

## Deleting a Task

`delete_a_task` (portal_id, project_id, task_id) is deprecated. It soft-deletes the task to the recycle bin with its subtasks, reminders, dependencies and time logs; comments are removed and come back on restore. Prefer `move_entities_to_trash`:

```json
{"path_variables": {"portal_id": "60012345678"}, "body": {"module": "tasks", "items": ["1752587000000440021"]}}
```

It accepts up to 100 IDs and returns 207 on partial success with per-record errors. Restore with `restore_entities_from_trash`. Always confirm with the user first and list each task by name and ID.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 INVALID_PARAMETER_VALUE on status | Status name sent | Send `status: {"id": "<id>"}` with the option ID (see `zoho-projects`, `references/fields-and-options.md`) |
| 400 JSON_PARSE_ERROR on owners | `{"add":[...]}` sent as a bare object | Wrap it in an array: `[{"add":[...]}]` |
| Co-owners removed after update | Plain owner array or `"remove": []` used on update | Use `[{"add":[...]}]` with no remove key |
| total_work reset to 00:00, unit back to hours | Owners were replaced | Use the additive add shape, or resend work values |
| Owner ID not accepted | ZUID passed instead of ZPUID | Resolve the ZPUID (see `zoho-projects`, `references/users.md`) |
| 400 on a custom field | Display name, unknown field, or field not in the layout | Use the API `field_name` from `get_fields` for this project |
| Server error with recurrence | `next_recurrence_after_close` or `set_to_previous_businessday` missing | Send both whenever recurrence is set |
| Task list or project did not change | `update_a_task` cannot move tasks | Use `move_task` |
| Task landed in "General" | No `tasklist` passed on create | Pass `tasklist.id` from `get_all_project_task_lists` |
| 207 from trash call | Some IDs invalid or not permitted | Read the per-record errors and retry only failed IDs after confirming |
