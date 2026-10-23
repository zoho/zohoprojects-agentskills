# Create Projects

Request shapes for `create_a_project`, and where each optional value comes from.

The tool name follows the Zoho Projects REST operation ID. If the connected server lists project creation under another name, use that tool with the same `path_variables` and `body`.

## Before Creating

1. Get the project name from the user. Do not invent one.
2. Check for a duplicate: search every page of `get_projects_list` (and the template view if relevant) for the same name. If one exists, show it and ask whether to continue.
3. Check mandatory fields: call `get_fields` with `query_params.module` "projects" and `filter.is_mandatory` true (add `filter.layout_id` when a layout is chosen). Ask the user for any value not given.
4. Show the full request and wait for explicit confirmation.

## create_a_project

- `path_variables`: `portal_id`.
- `body`: only `name` is required.

Minimal:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {"name": "Website Redesign"}
}
```

Typical:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "name": "Website Redesign",
    "description": "Redesign the company website with new branding",
    "owner": {"zpuid": "1752587000000097003"},
    "start_date": "2026-11-02",
    "end_date": "2027-03-31",
    "is_public_project": false
  }
}
```

## Body Fields

| Field | Values | Where the value comes from |
|-------|--------|----------------------------|
| `name` | String, up to 200 characters. Required | The user |
| `description` | String, up to 80,000 characters | The user |
| `project_type` | `active` (a normal project) or `template` | Omit for a normal project |
| `owner.zpuid` | ZPUID | `id` of the user in `get_all_users_in_a_portal` |
| `start_date`, `end_date` | `YYYY-MM-DD` | The user; convert relative dates and state them back |
| `is_public_project` | `true` / `false` (boolean) | The user |
| `status.id` | Status option ID | See Status, Layout and Group |
| `layout.id` | Layout ID | See Status, Layout and Group |
| `project_group.id` | Project group ID | See Status, Layout and Group |
| `is_rollup_project` | `true` / `false` (boolean) | The user |
| `tags` | Array of `{"id": "<tag_id>"}` | Tag IDs from the user or a tool; names are not accepted |
| `business_hours_id` | Business hours ID | The user; omit for the portal default |
| `copy_from` | Template or project ID | See Create From a Template |
| `budget_info` | Object | See Budget |
| `<field_name>` | Custom field value | See Custom Fields |

Send booleans as JSON booleans on create. Responses return them as the strings "true" / "false".

## Owner

- `owner.zpuid` takes the ZPUID: the `id` of the user in `get_all_users_in_a_portal` (`type` 1, `view_type` "1"), not the `zuid`. See `users.md` in the `zoho-projects` skill. A ZUID here returns 500 `INTERNAL_SERVER_ERROR`, not a validation error.
- The project does not exist yet, so look the owner up in the portal, not in a project.
- When copying an owner from another project, take `owner.zpuid` from its row. `owner.id` in project rows is not the ZPUID.
- Omit `owner` to leave the default. Read the resulting owner back after the create and tell the user who it is.

## Dates

- `YYYY-MM-DD` only. A date-time such as `2026-11-02T00:00:00Z` returns 400 `PATTERN_NOT_MATCHED` on `start_date`.
- Check that `end_date` is not before `start_date` before sending. Otherwise the call returns 403 `START_END_CONSISTENCY`.
- Without dates, the project is created with no `start_date` or `end_date`.
- When the user gives "next Monday" or "end of Q1", convert to an explicit date and confirm it.

## Status, Layout and Group

Omit all three to accept the portal defaults: the default project layout, its default status, and no group ("Ungrouped").

- **Status**: resolve the option ID with `get_options_list_for_a_field_in_module` for module projects and field status (safe path in `fields-and-options.md`), filtered by the chosen layout's ID. Never send a status name: it returns 400 `UNABLE_TO_PARSE_DATA_TYPE`. A status ID from another layout returns 403 `STATUS_CHECK`.
- **Layout and group**: there is no lookup step for these in this plugin. Rows from `get_projects_list` carry `layout` (`id`, `name`), and `get_project_detail` carries `project_group` (`id`, `name`). When the user names a layout or group that an existing project already uses, take the ID from that project. Otherwise ask the user for the ID, or create without it.
- The layout decides which custom fields the project has. Choose the layout before resolving custom fields.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "name": "Client Portal Phase 2",
    "layout": {"id": "1752587000000000506"},
    "project_group": {"id": "1752587000000005369"},
    "status": {"id": "1752587000000000665"}
  }
}
```

## Create From a Template

1. Call `get_projects_custom_view_list` (portal_id) and take the `id` of the templates view.
2. Call `get_projects_list` with that `view_id`, match the template by name, and take its `id`.
3. Create with `copy_from` set to the template ID:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "name": "Acme Onboarding",
    "copy_from": "1752587000000418003",
    "owner": {"zpuid": "1752587000000097003"},
    "start_date": "2026-11-02"
  }
}
```

- Pass the ID as a digit string, like every other ID. The REST reference types `copy_from` as an integer; if the tool schema requires a number, follow it.
- Zoho decides what the template carries over. Do not promise specific task lists, tasks or users. After the create, list them with `get_all_project_task_lists` and `get_tasks_by_project` and show the user what came across. In testing, the copy took the template's tasks and custom field values, with `name`, `owner` and `start_date` from the body.

### Template gallery

`get_template_gallery` (portal_id) lists Zoho's gallery templates plus the portal's own templates: `data.templates[]` with `id`, `name`, `category` and `plan` (`Free` or `paid`). For a gallery template, call `create_project_from_template` with path variable `project_template_gallery_id` and `query_params.is_start: false`. The body takes no name or owner, so the project is named after the template; find it in `get_projects_list` afterwards and rename it with `update_project` if the user wants. Unverified: this call was not run during testing. Paid gallery entries may need a paid edition. For the portal's own templates (category `Project Templates`), prefer `copy_from` above so the name and owner are set at creation.

## Copy an Existing Project

Same as a template, with `copy_from` set to the source project's `id` from `get_projects_list`. Confirm the source by name and ID before sending, and check its content afterwards as above.

## Create a Template

Set `project_type` to `template`:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {"name": "Client Onboarding Template", "project_type": "template"}
}
```

Templates do not appear in the default `get_projects_list`; find them through the templates view.

## Budget

Send `budget_info` only when the user asks for a budget. Ask for the billing method and budget type; do not choose them.

| Field | Values |
|-------|--------|
| `billing_method` | project_hours, staff_hours, fixed_cost, issue_hours, task_or_issue_hours |
| `budget_type` | none, based_on_project, based_on_milestone, based_on_task, based_on_user |
| `tracking_method` | project_hours, staff_hours, issue_hours, task_or_issue_hours |
| `currency` | Currency code, for example "USD" |
| `hourly_budget`, `hourly_budget_threshold` | "HH:MM" strings, for example "120:00" |
| `cost_budget`, `cost_budget_threshold`, `rate_per_hour`, `cost_per_hour`, `fixed_cost`, `revenue_budget`, `budget_threshold` | Objects with a numeric `amount`, for example `{"amount": 50000.0}` |

Send only the amounts the user gave, as numbers, not formatted strings such as "$ 50,000".

Hours-based budget for the whole project:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "name": "Website Redesign",
    "budget_info": {
      "billing_method": "project_hours",
      "budget_type": "based_on_project",
      "currency": "USD",
      "hourly_budget": "400:00",
      "rate_per_hour": {"amount": 95.0},
      "hourly_budget_threshold": "350:00"
    }
  }
}
```

Fixed-cost project:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "name": "Brand Refresh",
    "budget_info": {
      "billing_method": "fixed_cost",
      "budget_type": "based_on_project",
      "currency": "USD",
      "fixed_cost": {"amount": 25000.0},
      "cost_budget": {"amount": 20000.0},
      "cost_budget_threshold": {"amount": 18000.0}
    }
  }
}
```

## Tags

On create, pass a plain array of tag IDs: `"tags": [{"id": "1752587000000015084"}]`. Do not send tag names or mix in `add` / `remove` objects.

## Custom Fields

1. Call `get_fields` with `query_params.module` "projects", `filter.is_default` false, and `filter.layout_id` when a layout is chosen.
2. Send each value as a top-level body key named by the field's API `field_name`. There is no `custom_fields` wrapper.
3. Project custom field names are the snake_case names chosen when the field was made (for example `client_region`), not a `*_cf_*` pattern. Always read them from `get_fields`.
4. For picklist fields, send the option ID from `get_options_list_for_a_field_in_module`, never the label.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "name": "Website Redesign",
    "client_region": "1752587000000512003",
    "contract_reference": "ACME-2026-114"
  }
}
```

## After Creating

1. Take the new project's `id` from the response.
2. Call `get_project_detail` and confirm name, dates, status, layout, group, budget and custom fields with the user. Read the owner from the project's `get_projects_list` row if the detail response omits it.
3. Keep the new project_id as the session's project context.
4. Common next steps, each confirmed separately: create the default task list with `create_default_tasklist`, then add task lists or tasks with the `zoho-projects-tasks` skill.

If the response is unclear or the call times out, search `get_projects_list` for the name before retrying. A blind retry can create a second project with the same name.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 on create with no name | `name` missing, or over 200 characters | Ask the user for a name; shorten it |
| Create fails for a missing value | A mandatory field was not sent | Check `get_fields` with `is_mandatory` true and ask the user |
| Owner not accepted, or 500 INTERNAL_SERVER_ERROR | ZUID, email or `owner.id` from a project row sent | Send the ZPUID: `id` from `get_all_users_in_a_portal`, or `owner.zpuid` from a row |
| 400 PATTERN_NOT_MATCHED on `start_date` | Timestamp or another format sent | Use `YYYY-MM-DD` |
| 403 START_END_CONSISTENCY | `end_date` before `start_date` | Fix the dates and confirm them with the user |
| 400 UNABLE_TO_PARSE_DATA_TYPE on status | Status name sent instead of an option ID | Resolve the option ID |
| 403 STATUS_CHECK | Status ID not in the project's layout | Use options filtered by the layout ID |
| 400 INVALID_PARAMETER_VALUE on layout or group | Name sent instead of an ID | Send `{"id": "<id>"}` from the lookups above |
| 400 on a custom field | Display name used, field not in the chosen layout, or label sent for a picklist | Use `field_name` from `get_fields` with that layout, and option IDs |
| Budget rejected | Value outside the enums, or an amount sent as a formatted string | Use the enum values and numeric `amount` objects |
| Template content missing | `copy_from` held a name or a wrong ID | Resolve the template `id` from the templates view |
| New project not in the list | Created as a template, or the list was read before paging finished | Look in the templates view; page through the list |
| Two projects with the same name | Create retried after an unclear response | Search by name before retrying; offer to trash the duplicate only if the user asks |
| Group shows as `zp.projset.ungroupproj` | No group sent; this is the ungrouped label | Show "Ungrouped"; send `project_group.id` to set one |
