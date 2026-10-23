# Create, Update and Delete Issues

Request shapes and side effects for `create_issue`, `update_issue`, `move_issue`, `clone_issue`, `delete_issue` and `schedule_issues_export`.

## create_issue

- `path_variables`: `portal_id`, `project_id`.
- `body`: only `name` is required.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "name": "Session token not invalidated on timeout",
    "description": "Steps to reproduce:\n1. Sign in\n2. Wait 30 minutes\n3. Reload the page",
    "flag": "Internal",
    "assignee": {"zpuid": "1752587000000097003"},
    "severity": {"id": "1752587000000007153"},
    "classification": {"id": "1752587000000007177"},
    "due_date": "2026-11-20T18:00:00+05:30"
  }
}
```

Omit `status` on create to accept the layout default, normally "Open". The reporter is the signed-in user; the issue tool schema has no reporter field, so do not try to set one.

The response is the new issue. Read `id` from it and use that as `issue_id` from then on.

## Reference Fields

Every picklist-like field is an object with an `id`. Names are rejected or ignored.

| Field | Where the ID comes from |
|-------|-------------------------|
| `status` | Options of the issue `status` field |
| `severity` | Options of the `severity` field |
| `classification` | Options of the `classification` field |
| `is_it_reproducible` | Options of the `is_it_reproducible` field |
| `module` | Options of the issue `module` field (a project area, not a Zoho Projects module) |
| `assignee` | `zpuid`: the `id` from `get_all_users_in_a_project` |
| `associated_teams` | Team `id` |
| `release_milestone`, `affected_milestone` | Phase `id` from `get_project_phases` (see the `zoho-projects-phases` skill) |
| `tags[]` | Tag `id` |
| `followers[]` | `zpuid` of each user |

Resolve option IDs with `get_options_list_for_a_field_in_module`: module ID for issues from `get_modules`, field ID from `get_fields` (module `issues`), and `filter.project_id`. Options are custom per portal and layout; never reuse an ID from another portal or project without checking. Full steps are in the `zoho-projects` skill, `references/fields-and-options.md`.

## Assignee Rules

- The assignee must be a user of the project. If the issue has an associated team, the assignee must also belong to that team.
- Do not assign an `Internal` issue to a client user.
- `assignee.zpuid` takes the ZPUID, not the ZUID.

## Status

- Send `status: {"id": "<status_id>"}`. A status name is rejected.
- The project's issue workflow controls which statuses can follow the current one. A status that is not reachable returns `INVALID_STATUS_TRANSITION`. No issue tool lists the allowed next statuses; when this error comes back, tell the user which status was refused and ask which one to use instead, or have them move it through the intermediate status first.
- To decide whether an issue is closed, read the type of its status, not its name.
- Closing an issue through a resolution is covered in `issues-collaboration.md`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "issue_id": "1752587000000450013"},
  "body": {"status": {"id": "1752587000000007051"}}
}
```

## Dates

- `due_date` is ISO 8601 date-time, with `Z` or an offset: `2026-11-20T18:00:00Z` or `2026-11-20T18:00:00+05:30`.
- The due date cannot be earlier than the issue's creation date.
- Issue filters take dates without time values. Do not carry the write format into a filter (see `issues-filters.md`).
- When the user gives a relative date ("next Friday"), convert it to an explicit date and state it back before using it.

## Other Fields

| Field | Values |
|-------|--------|
| `flag` | `Internal` or `External`, capitalised. Phases use lowercase; do not mix them up |
| `description` | Long text, HTML supported, `\n` for line breaks |
| `attachments` | Array of attachment IDs already uploaded to the portal |
| `rate_per_hour`, `cost_rate_per_hour` | Numbers |
| `zoho_sprints`, `zoho_cliq`, `zoho_salesiq` | Create only: IDs of the Sprints item, Cliq message or SalesIQ chat to link the new issue to |

### Reminder

`reminder.type` is one of `daily`, `on_due_date`, `before_due_date` or `custom_date`. This is not the task reminder vocabulary (`none`, `daily`, `on`, `before`, `after`); do not carry one over to the other. `custom_date` also needs `reminder.custom_reminder_date` in ISO 8601.

```json
{"reminder": {"type": "custom_date", "custom_reminder_date": "2026-11-18T09:00:00+05:30"}}
```

The public API also documents `days_before`, `time` and `notify_users` on the reminder, but the issue tool schema does not list them. Treat them as unverified and confirm the saved reminder with `get_issue`.

### Custom Fields

Send custom fields as top-level body keys named by their API `field_name` from `get_fields` (module `issues`, `filter.project_id`). Display names, unknown fields, or fields absent from the project's layout are rejected. Multi-select custom fields accept at most 20 values.

## update_issue

- `path_variables`: `portal_id`, `project_id`, `issue_id`. Only fields in `body` change.
- Uses the same reference-field shapes as create.
- `tags` and `followers` in the body are plain arrays. Whether they replace the current list or add to it is not documented. Before changing them, read the current values with `get_issue`, send the full intended list, and verify afterwards. To add or remove a single follower, prefer the follower tools in `issues-collaboration.md`.
- The update validates every field and returns all failures together in `error.details`. Read every entry, not just the first, and fix them in one retry.

## move_issue

Moves an issue to another project in the same portal.

- `path_variables`: `portal_id`, `project_id` (the current project), `issue_id`.
- `body.to_project`: required, the destination project ID from `get_projects_list`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "issue_id": "1752587000000450013"},
  "body": {"to_project": "1752587000000431125"}
}
```

- The user needs permission to create issues in the destination project.
- Invoiced issues cannot be moved.
- Status, severity and other option IDs belong to the source layout. Check the issue with `get_issue` in the destination project afterwards and tell the user about any field that changed or was cleared.

## clone_issue

Creates one copy of an issue in the same project. It takes only `path_variables` (`portal_id`, `project_id`, `issue_id`) and no body. The copy cannot be renamed or retargeted at creation; tell the user it will share the original's details, and use `update_issue` on the new `id` afterwards to change it. To copy an issue into another project, clone it and then move the copy.

## Deleting an Issue

`delete_issue` (portal_id, project_id, issue_id) permanently deletes the issue and all its task associations. It cannot be undone. Prefer `move_entities_to_trash`, which can be restored:

```json
{"path_variables": {"portal_id": "60012345678"}, "body": {"module": "issues", "items": ["1752587000000450013"]}}
```

It accepts up to 100 IDs and returns 207 on partial success with per-record errors. Restore with `restore_entities_from_trash`. Use `delete_issue` only when the user explicitly asks for permanent deletion. Always confirm with the user first and list each issue by name and ID.

## schedule_issues_export

Starts an export of a project's issues to a file. It takes only `query_params`: `export_type` (`xlsx` or `csv`), `filter` with `apply_filter` true, `cview_id` for a custom view, `selected_columns` (field IDs, up to 500), `group_by` (`project` or `none`), `is_ascending`, `sort_by`, and `access_code` (6 to 50 characters) to protect the file. The export runs in the background; it does not return the rows. For answers in the conversation, use the list tools instead.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 INVALID_PARAMETER_VALUE on status, severity or classification | Name sent instead of `{"id": ...}`, or an ID from another layout | Resolve the option ID for this project |
| INVALID_STATUS_TRANSITION | Target status not reachable from the current one in the issue workflow | Tell the user and ask for a reachable status |
| Several errors in one response | Every invalid field is reported together | Read all of `error.details` and fix them in one retry |
| Assignee rejected | ZUID passed, user not in the project or the associated team, or client user on an Internal issue | Use a project user's ZPUID that fits the team and flag |
| Due date rejected | Earlier than the creation date, or date only | Send an ISO 8601 date-time on or after the creation date |
| Flag rejected | Lowercase `internal` / `external` | Use `Internal` or `External` |
| Reminder rejected | Task reminder value such as `on` or `before` | Use `daily`, `on_due_date`, `before_due_date` or `custom_date` |
| 400 on a custom field | Display name, unknown field, field not in the layout, or more than 20 multi-select values | Use the API `field_name` from `get_fields` for this project |
| Move fails | No create permission in the target project, or the issue is invoiced | Check permissions; invoiced issues stay where they are |
| Issue gone for good | `delete_issue` used | Use `move_entities_to_trash` unless permanent deletion was asked for |
| 207 from trash call | Some IDs invalid or not permitted | Read the per-record errors and retry only failed IDs after confirming |
