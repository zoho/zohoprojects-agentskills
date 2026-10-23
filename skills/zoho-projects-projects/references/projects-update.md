# Update Projects

Request shapes and side effects for `update_project`: renaming, dates, owner, status, archiving, templates, visibility, group, layout, tags, budget and custom fields.

## update_project

- `path_variables`: `portal_id`, `project_id`.
- `body`: only the fields to change. Fields not in `body` are left as they are.
- Not changeable here: `id`, `key`, `created_by`, `created_time`, `copy_from`. Trash, restore and delete use `move_entities_to_trash` and `restore_entities_from_trash` (module `projects`), which this skill does not cover.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"name": "Website Redesign 2027", "end_date": "2027-04-30"}
}
```

## Before Any Update

1. Read the current values with `get_project_detail` (and the project's `get_projects_list` row for `owner`, which details may omit).
2. Show the user each field with its old and new value, and wait for explicit confirmation.
3. Never change dates, owner or status on inference alone.

## Body Fields

| Field | Values | Where the value comes from |
|-------|--------|----------------------------|
| `name` | String, up to 200 characters | The user |
| `description` | String, up to 80,000 characters | The user |
| `project_type` | `active`, `template` or `archived` | See Archive, Unarchive and Templates |
| `owner.zpuid` | ZPUID | `id` of the user in `get_all_users_in_a_project` |
| `start_date`, `end_date` | `YYYY-MM-DD` | The user |
| `completed_time` | ISO 8601, for example `2026-12-30T18:30:00.000Z` | The user |
| `status.id` | Status option ID | `get_options_list_for_a_field_in_module`, or a row with that status |
| `layout.id` | Layout ID | A project that already uses the layout, or the user |
| `project_group.id` | Project group ID | A project already in the group, or the user |
| `is_public_project` | `true` / `false` (boolean) | The user |
| `is_rollup_project` | `true` / `false` (boolean) | The user |
| `color` | Hex code, for example `#4573d2` | The user |
| `tags` | `[{"add": [...], "remove": [...]}]` | See Tags |
| `business_hours_id` | Business hours ID | The user |
| `budget_info` | Object | See Budget |
| `<field_name>` | Custom field value | See Custom Fields |

`completed_time` is the one timestamp field; every other date is `YYYY-MM-DD`. Set it only when the user gives a completion time.

## Name, Description, Dates and Visibility

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "description": "Scope now includes the client portal",
    "start_date": "2026-11-09",
    "end_date": "2027-04-30",
    "is_public_project": true,
    "color": "#4573d2"
  }
}
```

- Check that `end_date` is not before `start_date`, including against the current value when only one date changes.
- The API does not document moving task dates when project dates change. If the user expects tasks to shift, say they will not shift automatically and offer to review them with the `zoho-projects-tasks` skill.

## Owner

A project has one owner; sending `owner` replaces the current one.

- Take the ZPUID from `get_all_users_in_a_project` (`type` 1, `view_type` "1"): the user's `id`, not `zuid`. The new owner should already be a user in the project. If they are not, tell the user; adding project users is not covered here.
- Tell the user who the current owner is before replacing them.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"owner": {"zpuid": "1752587000000097011"}}
}
```

## Status

- Send `status: {"id": "<status_id>"}`. A status name is not accepted.
- Resolve the ID with `get_options_list_for_a_field_in_module` for module projects and field status (see `fields-and-options.md` in the `zoho-projects` skill), or take `status.id` from a project row that already has that status.
- To close a project, pick a status with `is_closed_type` true. Afterwards, read `is_completed` and `completed_time` back rather than assuming them.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"status": {"id": "1752587000000000671"}}
}
```

## Archive, Unarchive and Templates

`project_type` moves a project between the active, archived and template lists.

| Goal | Send |
|------|------|
| Archive | `"project_type": "archived"` |
| Unarchive | `"project_type": "active"` |
| Turn a project into a template | `"project_type": "template"` |
| Turn a template into a project | `"project_type": "active"` |

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"project_type": "archived"}
}
```

- An archived or template project leaves the default `get_projects_list`. Find it again through the matching view from `get_projects_custom_view_list` (see `projects-basics.md`).
- Archiving is a visible change for everyone in the project. Name the project and its ID in the confirmation.
- Archiving also sets the status to the closed status (Completed) and sets `completed_time`. Unarchiving sets the status to Active, not to the status the project had before. Tell the user, and offer to set the earlier status again (read it from `get_project_status_timeline`).

## Project Group and Layout

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"project_group": {"id": "1752587000000005402"}}
}
```

- Take group and layout IDs from an existing project that already uses them (`project_group` in `get_project_detail`, `layout` in rows), or from the user.
- Changing `layout` changes which custom fields the project has. Values in fields that are not in the new layout may stop showing. List the fields in both layouts with `get_fields` (module "projects", `filter.layout_id`) and tell the user which ones are affected before sending.

## Tags

On update, send one add/remove object inside an array:

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"tags": [{"add": [{"id": "1752587000000015084"}], "remove": [{"id": "1752587000000015090"}]}]}
}
```

- Use tag IDs, never names.
- Omit `remove` when only adding, and `add` when only removing.
- Do not send a plain array of tag objects on update; it may replace the whole tag list. Read the current `tags` first, and verify afterwards.

## Budget

Uses the same `budget_info` fields and values as create (see `projects-create.md`).

- The API does not document whether budget keys left out of `budget_info` keep their values. Read the current `budget_info` first and send `billing_method`, `budget_type` and `currency` with their current values alongside the amounts that change.
- Send amounts as numbers in `{"amount": ...}` objects, hours as "HH:MM".

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "budget_info": {
      "billing_method": "project_hours",
      "budget_type": "based_on_project",
      "currency": "USD",
      "hourly_budget": "480:00",
      "hourly_budget_threshold": "420:00"
    }
  }
}
```

## Custom Fields

Send each value as a top-level key named by its API `field_name` from `get_fields` (module "projects", `filter.layout_id` of the project's layout). Picklist values are option IDs. Fields not in the project's layout, or fields the user cannot edit, are rejected.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"client_region": "1752587000000512007", "contract_reference": "ACME-2026-114-R1"}
}
```

## After Updating

1. The response returns the updated project. In it, booleans are JSON booleans and `owner` carries `zpuid` and `zuid`. `get_project_detail` returns booleans as strings, so compare carefully.
2. Call `get_project_detail` and show the user each changed field's new value.
3. If an archive or template change was made, tell the user which view now lists the project.
4. Portal workflow rules run after an update and can change fields again. In testing, a workflow rule reset `start_date` after every update. When a value does not stick, read `get_edits` and look for `activity_state: "updateviaworkflow"`; report the rule name from `extra_data` instead of retrying (see `projects-history-comments.md`).

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on project_id | Name or project `key` passed | Use the `id` from a `get_projects_list` row |
| Owner not accepted | ZUID, email, `owner.id` from a row, or a user not in the project | Send the ZPUID from `get_all_users_in_a_project` |
| 400 UNABLE_TO_PARSE_DATA_TYPE on status | Status name sent instead of an option ID | Resolve the option ID |
| 403 STATUS_CHECK | Status ID not in the project's layout | Use options filtered by the project's `layout.id` |
| 403 START_END_CONSISTENCY | `end_date` before `start_date` | Fix the dates and confirm them with the user |
| 400 INVALID_PARAMETER_VALUE on layout or group | Name sent instead of an ID | Send `{"id": "<id>"}` |
| Field reverted after a 200 | Portal workflow rule changed it | Check `get_edits` for `updateviaworkflow` and tell the user |
| Status is Active after unarchive | Unarchiving resets the status | Set the earlier status again after confirming |
| Date rejected | Timestamp sent for `start_date` / `end_date`, or a date-only value for `completed_time` | `YYYY-MM-DD` for dates; ISO 8601 for `completed_time` |
| Project disappeared from the list | `project_type` set to archived or template | List the archived or templates view |
| Tags lost after update | Plain tag array sent | Use `[{"add": [...], "remove": [...]}]`; re-add the lost tags after confirming |
| Budget settings changed unexpectedly | Partial `budget_info` sent | Resend with the current `billing_method`, `budget_type` and `currency` |
| 400 on a custom field | Display name, field not in the layout, label for a picklist, or field not editable | Use `field_name` and option IDs from `get_fields` for the project's layout |
| Custom field values missing after a layout change | New layout lacks those fields | Check both layouts before changing; switch back if needed |
| Tasks kept old dates after project dates changed | Project dates do not move tasks | Review task dates with the `zoho-projects-tasks` skill |
