# Project Basics

How to resolve IDs, list and page through projects, use views for archived and template projects, find "my projects", read a single project and summarise status.

## ID Resolution Order

Every project tool takes `path_variables`. Each ID must match `^\d+$`; names, URL slugs or project keys fail.

1. `portal_id`: call `get_portals` and take the `id` of the chosen portal. If there is more than one, ask the user which one.
2. `project_id`: take the `id` from a `get_projects_list` row, or from a create response.

Each project also has a `key` (for example "54"), the short number shown in the UI. It is not the project ID; never pass it as `project_id`.

When the user gives only a task or issue ID, resolve its project with `get_project_id_from_entity_id` (see `portals-and-projects.md` in the `zoho-projects` skill).

## Listing Projects

`get_projects_list` (portal_id) returns active projects by default.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"page": 1, "per_page": 100}
}
```

Optional `query_params`: `filter` (see `projects-filters.md`), `view_id`, `sort_by`, and paging. Use `page` + `per_page`, or `index` + `range`, never both in one call.

### Pagination

- `page` starts at 1. `per_page` is capped at 200 and defaults to 100.
- When the response has `page_info.has_next_page`, follow it. When it does not, keep requesting pages until one returns fewer rows than `per_page`.
- Never answer "how many" or "all projects" from the first page alone.

### Sorting

`sort_by` takes `ASC(<field>)` or `DESC(<field>)`. The tool sorts on last updated time; for any other order, sort the rows yourself after reading every page.

## Finding a Project by Name

1. List projects and match the user's name against each row's `name`, case-insensitively.
2. One match: use it and tell the user which project (name and ID).
3. Several matches: show the candidates with name, owner, status and ID, and ask.
4. No match: check the archived and template views below before telling the user the project does not exist.

## Views: Archived, Template and Other Lists

Archived, template and trashed projects are not in the default list. Use a project view:

1. Call `get_projects_custom_view_list` (portal_id) and pick the view whose name matches the need (for example archived projects, templates, or my projects).
2. Pass its `id` as `view_id` to `get_projects_list`.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"view_id": "1752587000000210005", "page": 1, "per_page": 100}
}
```

When `view_id` and `filter` are both sent, the filter is combined with the view's own criteria using AND.

## My Projects

- "Projects I am in": `get_projects_list` already returns only the projects the signed-in user can see. For an admin that can be every project in the portal; use a "my projects" view from `get_projects_custom_view_list` when one exists.
- "Projects I own":
  1. Call `get_current_user_details` with the portal_id.
  2. Find the same user (by email or zuid) in `get_all_users_in_a_portal` (`type` 1, `view_type` "1") and take its `id`. That is the ZPUID.
  3. Keep the rows whose `owner.zpuid` equals that ZPUID, across every page.
- Use the same steps with another person's ZPUID for "projects owned by X".

In project rows, `owner.id` and `created_by.id` are not the ZPUID. Compare on `owner.zpuid`.

## Counting Projects

There is no project count tool. Count rows across every page of `get_projects_list`, with the same `view_id` or `filter` the user's question implies. Say which view the count covers (active only, by default).

## Project Details

`get_project_detail` (portal_id, project_id) returns the full record.

```json
{"path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"}}
```

Call it for budget, project group, tags, custom fields or the latest state after a write. For portfolio questions, the list rows already hold most of what is needed (see below); avoid one detail call per project.

### Reading a Project

| Field | In list rows | In details | Notes |
|-------|:-:|:-:|-------|
| `id` | yes | yes | The project_id for every call |
| `key` | yes | yes | Display number, not an ID |
| `name`, `description` | yes | yes | |
| `project_type` | yes | yes | For example `active` or `template` |
| `status` | yes | yes | `id`, `name`, `is_closed_type` |
| `owner` | yes | | `zpuid`, `name`, `email`; `owner.id` is not the ZPUID. Details may omit it; read it from the list row |
| `start_date`, `end_date` | yes | yes | `YYYY-MM-DD` |
| `percent_complete` | yes | yes | Number in list rows, string in details |
| `tasks`, `issues`, `milestones` | yes | yes | Each has `open_count` and `closed_count` |
| `is_completed`, `is_public_project`, `is_strict_project`, `is_rollup_project` | yes | yes | The strings "true" / "false", not booleans |
| `layout` | yes | yes | `id`, `name`, `is_default`, `type` |
| `project_group` | | yes | `id`, `name`, `type` |
| `budget_info` | | yes | See Budget Summary |
| `tags` | | yes | Array of `id` and `color_hexcode` |
| `created_by`, `updated_by` | yes | yes | Details carry both `zpuid` and `zuid` |
| `created_time` | yes | yes | ISO 8601 |
| `modified_time` | yes | | ISO 8601 |
| `completed_time` | | yes | Epoch milliseconds as a string, on completed projects |
| Custom fields | | yes | Top-level snake_case keys such as `client_region` |

- Booleans arrive as strings. Compare against "true" / "false", not `true` / `false`.
- A `project_group.name` of `zp.projset.ungroupproj` is an untranslated label for "Ungrouped". Show it as "Ungrouped".
- Fields with no value are omitted, so a missing custom field key does not mean the field is absent from the layout. Check with `get_fields` (module "projects") before saying so.

## Status Summary

For "how is project X doing", one `get_project_detail` call is enough. Report:

- Status name, and whether it is a closed type.
- `percent_complete`.
- Open and closed counts for tasks, issues and milestones.
- Dates: if `end_date` is before today and `is_completed` is "false", say the end date has passed and by how many days.
- Budget lines from `budget_info`, when present.

For a portfolio ("status of all my projects", "which projects are overdue"), read every page of `get_projects_list` and use the rows: status, owner, dates, `percent_complete` and the open/closed counts are all there. Present a table sorted by end date. Call `get_project_detail` only for the projects the user then asks about.

Report what the records show. Mark anything derived (days overdue, completion trend) as derived, and any forecast as an estimate with its reason.

## Budget Summary

`budget_info` in `get_project_detail` holds the project's budget settings and totals:

- Settings: `billing_method`, `budget_type`.
- Hours as "HH:MM" strings: `hourly_budget`, `planned_hours`, `actual_hours`, `forecasted_hours`, `remaining_hours`.
- Money as objects with `amount`, `formatted_amount`, `currency_code`, `currency_id`: `cost_budget`, `planned_cost`, `actual_cost`, `forecasted_cost`.
- `bcy_*` money fields (`bcy_planned_cost`, `bcy_actual_cost`, `bcy_forecasted_cost`) repeat the values in the portal's base currency.

Show `formatted_amount` to the user and do arithmetic on `amount`. Do not mix project-currency and `bcy_*` amounts in one sum. If `budget_info` is missing, the project has no budget set; say so rather than reporting zero.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on portal_id or project_id | A name, slug or project `key` was passed | Use the `id` from `get_portals` or a `get_projects_list` row |
| Project not found by name | It is archived, a template or trashed | Get a `view_id` from `get_projects_custom_view_list` and list that view |
| Several projects match a name | Similar names in the portal | Show candidates with owner, status and ID, and ask |
| Count or list is too short | Only the first page was read | Follow `page_info.has_next_page`, or page until a short page |
| "Projects I own" returns nothing | Compared on `owner.id`, or on a ZUID | Compare `owner.zpuid` with the ZPUID from `get_all_users_in_a_portal` |
| Boolean check always false | Compared with `true` instead of "true" | Compare with the string values |
| Group shows as `zp.projset.ungroupproj` | Untranslated label for ungrouped projects | Show "Ungrouped" |
| Custom field seems missing in details | Empty fields are omitted | Check the layout with `get_fields` (module "projects") |
| Budget shows nothing | No budget set on the project | Say no budget is set; do not report zero |
