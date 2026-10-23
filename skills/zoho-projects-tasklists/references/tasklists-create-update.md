# Create, Update and Trash Task Lists

Request shapes and side effects for `create_task_list`, `update_task_list`, `create_default_tasklist`, `delete_task_list` and trashing.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `create_task_list` | portal_id, project_id | Only `name` is required. Returns the full list object |
| `update_task_list` | portal_id, project_id, tasklists_id | Only fields sent change. Returns the full list object |
| `create_default_tasklist` | portal_id, project_id | Body `flag`: `internal` (default) or `external`. Returns a short object |
| `delete_task_list` | portal_id, project_id, tasklists_id | Moves the list to trash; 204 with no body |
| `move_entities_to_trash` | portal_id | Body `module: "tasklists"`, `items`: up to 100 IDs. Preferred over `delete_task_list` |

## Writable Fields

The server reads only `name`, `milestone`, `flag`, `status` and `tags`. Every other key is accepted and silently dropped, including `sequence` (confirmed live: a sent `project_sequence` was ignored).

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"name": "Release 2.4 checklist", "milestone": {"id": "1752587000000431205"}, "status": "active"}
}
```

- `name`: required on create, must be non-empty. Names are not unique.
- `status`: only the literals `active` or `completed`. Anything else, such as `Open` or a status ID, returns 400 `PATTERN_NOT_MATCHED` on `status`. Setting `completed` sets `meta_info.is_completed` true. This is not a task status.
- `milestone.id`: the phase ID from `get_project_phases` (see the `zoho-projects-phases` skill). A flat `milestone_id` or a top-level `phase` key is silently ignored and the list stays where it was. An unknown ID returns 400 `INVALID_PARAMETER_VALUE` "Please send valid milestone id".
- `tags`: either tag objects or one `{"add": [...], "remove": [...]}` object; do not mix the two forms. Not exercised live.

## Phase

- Omit `milestone` on create to leave the list unassigned (`is_none_milestone_tasklist: true`).
- To move a list into a phase, update with `milestone.id`. `sequence.milestone_sequence` did not change when this was done live.
- To take a list out of its phase, send the unassigned sentinel as `milestone.id`. Read the sentinel from any unassigned list row (its `milestone.name` is `None`); do not hard-code it. Confirmed live: the server returns 200 and sets `is_none_milestone_tasklist` to true.
- Tasks take their phase from their list, so moving a list moves the phase of every task in it. Say so before asking.

## Flag (Internal vs External)

The tool descriptions say `flag` is fixed after creation. On the test portal that was not the case:
- `create_task_list` with `flag: "external"` produced an external list.
- `update_task_list` changed `flag` both ways (internal to external and back) with 200.
- `update_task_list` on an external list that sent only `milestone.id` (an internal phase) silently switched the list to `internal`.

So `flag` can change as a side effect. Before any update to an external list, read it, and after the update, compare `flag` with the old value and report any change. If the portal returns 403 `TASKLIST_TYPE_ERROR` (documented, not seen live), the flag cannot be changed there; create an external list with `create_default_tasklist` instead.

## Default General List

Every project starts with an internal list named General (`meta_info.is_general: true`). Tasks created without a `tasklist` land there.

```json
{"path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"}, "body": {"flag": "external"}}
```

- Idempotent per flag: with `internal` it returned the existing General list unchanged; with `external` it created a second list, also named General, with `flag: "external"`.
- The response is a short object, not the full list: `{"id", "name", "flag", "sequence": <integer>, "is_default": true}`. Call `get_task_list_details` for the full record.

## Trash and Restore

- Prefer `move_entities_to_trash` with `module: "tasklists"`. `delete_task_list` also trashes (it is not a permanent delete) and returns 204.
- Comments on the list are trashed and restored with it.
- Trashing the external General list worked like any other list.
- Whether trashing a list also trashes its tasks was not checked live; tasks were trashed separately first. Before trashing a non-empty list, report its `count_info` and ask.
- Restore with `restore_entities_from_trash`; see the `zoho-projects` skill (`references/api-conventions.md`).

## Before Any Change

- Read the list with `get_task_list_details` and show the current name, phase, flag and status next to the new values.
- For phase moves, state how many tasks will change phase (from `count_info`).
- After the write, read the list back and check `flag`, `milestone.id` and `status`. A 200 response does not prove that a dropped key, such as `milestone_id`, took effect.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 `INVALID_PARAMETER_VALUE` "name cannot be empty" | `name` is "" | Send a non-empty name |
| 400 `PATTERN_NOT_MATCHED` on `status` | Task status name or ID sent | Use `active` or `completed` |
| 400 `INVALID_PARAMETER_VALUE` "Please send valid milestone id" | Unknown phase ID | Take the ID from `get_project_phases` |
| Phase did not change, no error | `milestone_id` or `phase` key used | Send `milestone: {"id": "..."}` |
| Order did not change, no error | `sequence` is read-only here | Do not send `sequence`; there is no reorder tool for lists in this set |
| List became internal after a phase change | Assigning an internal phase switches an external list | Check `flag` after every update; report the change |
| 403 `TASKLIST_TYPE_ERROR` | Portal blocks flag changes (documented, not seen live) | Use `create_default_tasklist` with `flag: "external"` |
| 400 `URL_RULE_NOT_CONFIGURED` | Name in `tasklists_id` | Resolve the digit ID |
| Two General lists | Internal and external defaults coexist | Tell them apart by `flag` |
