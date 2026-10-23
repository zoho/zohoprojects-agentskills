# Create, Update and Delete Phases

Request shapes and side effects for `create_phase`, `update_phase` and `delete_phase`.

## Field Shape

The phase tools take flat fields: `owner_zpuid`, `status_id` and `tagIds` as plain strings. They do not take the nested `owner: {"zpuid": ...}` or `status: {"id": ...}` objects that tasks, issues and the newer public phase API use. Do not carry those shapes over, and do not send nested and flat forms together.

## create_phase

- `path_variables`: `portal_id`, `project_id`.
- `body`: only `name` is required.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "name": "Beta release",
    "start_date": "2026-11-02",
    "end_date": "2026-11-27",
    "owner_zpuid": "1752587000000097003",
    "flag": "internal"
  }
}
```

Read the new phase `id` from the response and confirm with `get_phase_details`.

## Body Fields

| Field | Values |
|-------|--------|
| `name` | Up to 100 characters. Longer names are rejected even though the schema shows no limit |
| `start_date`, `end_date` | See Dates below. `end_date` must not be earlier than `start_date` |
| `owner_zpuid` | ZPUID of a project user: the `id` from `get_all_users_in_a_project`, not the `zuid` |
| `status_id` | Status option ID (see Status) |
| `flag` | `internal` or `external` (see Flag) |
| `tagIds` | Comma-separated tag IDs in one string, for example `"1752587000000480001,1752587000000480003"` |
| `previous`, `next` | ID of the phase this one should follow or precede in the project's order |
| `start_after`, `start_after_freq`, `duration` | Template projects only: start offset (digits), its unit (`days`, `weeks` or `months`) and the duration |
| `budget`, `threshold`, `hourly_budget`, `hourly_budget_threshold`, `revenue_budget` | Strings of digits, optionally with one `.` or `:` and up to 3 decimals. Applied only when budgeting is on for the portal and the project |

Do not send `milestone_id` or `project_id` in the body; the path already carries them.

### Dates

Send `YYYY-MM-DD`, the format the phase API documents. The tool schema labels the dates as ISO 8601 date-time; if a date-only value is rejected, retry with a full ISO 8601 date-time and tell the user. When the user gives a relative date ("end of next month"), convert it to an explicit date and state it back first.

### Flag

Phases use lowercase `internal` / `external`. Issues use capitalised `Internal` / `External`; do not mix the two up. The tool schema's pattern hints at capitalised values, so if lowercase is rejected, retry once with the capitalised form.

### Status

- Get status IDs with `get_options_list_for_a_field_in_module` for the phase module's status field, scoped with `filter.project_id`. Module and field IDs come from `get_modules` and `get_fields`; see the `zoho-projects` skill, `references/fields-and-options.md`.
- Omit `status_id` on create to accept the layout default.
- Status IDs are custom per portal and layout. Never reuse one from another portal.

## update_phase

- `path_variables`: `portal_id`, `project_id`, `phase_id`. Only fields in `body` change.
- Uses the same flat fields as create.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "phase_id": "1752587000000431205"},
  "body": {"name": "Beta release (extended)", "end_date": "2026-12-04"}
}
```

- Whether changing a phase's dates shifts its tasks is not documented. If the user expects the tasks to move too, check a few task dates with `get_task_details` afterwards and report what changed.
- Every invalid field may be reported together in `error.details`. Read all of them and fix them in one retry.

## Reordering

Set `previous` (the phase this one comes after) or `next` (the phase this one comes before) with `update_phase`. Send only one of the two. Read the current order first with `get_project_phases` and `sort_by` `ASC(sequence)`, and check the order again afterwards.

## Closing a Phase

Close a phase by setting `status_id` to a status of closed type.

- The portal's phase completion rule decides what happens when the phase still has open tasks or issues. Under "restrict" the call fails with 403. Under "warn", the public API accepts the close only with the request header `X-SKIP-OPEN-ITEMS: true`, and the phase tools have no way to send that header.
- When a close returns 403, do not treat it as a permission problem. Tell the user how many tasks and issues under the phase are still open, and offer to close those first, or to have the user close the phase in the Zoho Projects web app. Never delete the open items to get around the rule.
- Closing the last open task does not close the phase automatically.

## Editing a Closed Phase

On a closed phase only the name, the status and the completion date can change. Any other field fails. To change dates, owner or other fields, reopen the phase (set a status of open type) first, make the change, and close it again if the user wants. Confirm each step.

## Deleting a Phase

- `delete_phase` (portal_id, project_id, phase_id) removes the phase. The tool describes the removal as permanent, together with its associations.
- Prefer `move_entities_to_trash`, which can be restored:

```json
{"path_variables": {"portal_id": "60012345678"}, "body": {"module": "phases", "items": ["1752587000000431205"]}}
```

- Trashing a phase also sends its task lists and their tasks to the recycle bin. Before asking for confirmation, list the phase's task lists (`get_all_project_task_lists`, matched by phase) and tell the user how many lists and tasks go with it. Restore with `restore_entities_from_trash`.
- Use `delete_phase` only when the user explicitly asks for permanent deletion, after listing the phase by name and ID.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 INVALID_PARAMETER_VALUE on owner or status | Nested `owner` / `status` object sent, or a name instead of an ID | Send flat `owner_zpuid` and `status_id` with IDs |
| Owner rejected | ZUID passed, or the user is not in the project | Use the `id` from `get_all_users_in_a_project` |
| Name rejected | More than 100 characters | Shorten the name to 100 characters or fewer |
| Date rejected | Wrong format, or `end_date` before `start_date` | Use `YYYY-MM-DD` with end on or after start; retry with ISO date-time if needed |
| Flag rejected | Casing does not match | Try `internal` / `external`, then `Internal` / `External` |
| Tags not applied | `tagIds` sent as an array | Send one comma-separated string |
| Budget fields ignored | Budgeting is off for the portal or project | Tell the user; do not resend |
| 403 when closing | Completion rule blocks closing with open tasks or issues | Close the open items first, or have the user close the phase in the web app |
| Edit of a closed phase fails | Only name, status and completion date can change | Reopen, edit, then close again |
| Task lists and tasks gone with the phase | Trashing a phase trashes its contents | Restore with `restore_entities_from_trash`; warn before trashing |
| 207 from trash call | Some IDs invalid or not permitted | Read the per-record errors and retry only failed IDs after confirming |
