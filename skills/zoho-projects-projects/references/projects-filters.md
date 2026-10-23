# Project Filters

Rules for the `filter` query parameter on `get_projects_list`. Project filters differ from task filters; do not carry a task filter over.

## Structure

`filter` is a JSON object (not a string, unlike task filters):

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {
    "filter": {
      "criteria": [
        {"field_name": "status", "criteria_condition": "all_open", "value": []},
        {"field_name": "end_date", "criteria_condition": "this_month", "value": []}
      ],
      "pattern": "1 AND 2"
    },
    "per_page": 100
  }
}
```

Each criterion has `field_name` (or `cfid`, the field's digit ID), `criteria_condition` and `value`.

- `value` is always an array: one item for a single match, two for `between` and `not_between`, empty `[]` for macros such as `today`, `this_month`, `is_empty` or `all_open`.
- Use the API `field_name` from `get_fields` with `query_params.module` "projects". Never a display name.
- If the tool schema types `filter` as a string, send the same object serialized as a JSON string.

## Pattern

- Reference criteria by 1-based index joined with uppercase `AND` or `OR`. Group with parentheses, for example `(1 OR 2) AND 3`.
- Required when there is more than one criterion. Reference every index exactly once.

## Conditions by Field Type

| Field type | Conditions |
|------------|------------|
| Text | is, is_not, contains, not_contains, starts_with, ends_with, is_empty, is_not_empty |
| Date | is, is_not, between, not_between, less_than, greater_than, is_empty, is_not_empty, and the macros below |
| Picklist (including status) | is, is_not, all_open, all_closed |
| User | is, is_not, current_login_user, direct_reports_of, subordinates_of |
| Number | equal, not_equal, less_than, greater_than, less_than_or_equal, greater_than_or_equal, between, not_between |

## Value Encoding

| Field | Value |
|-------|-------|
| status, picklist | Option ID, never the display name |
| Open / closed projects | `criteria_condition` `all_open` or `all_closed` on status, with `value` `[]` |
| Dates | `YYYY-MM-DD` |
| User fields | Check the field's ID space; see below |

Resolve status and picklist option IDs with `get_options_list_for_a_field_in_module` (see `fields-and-options.md` in the `zoho-projects` skill).

### User Fields

The REST reference does not say which ID space (ZPUID or ZUID) each project user field takes, and a wrong ID space usually returns 200 with zero rows. For "projects owned by X", prefer listing and matching `owner.zpuid` in the rows (see `projects-basics.md`). If you do filter on a user field, test the filter with a project you know the user owns before trusting an empty result.

## Date Macros

Put the macro in `criteria_condition` and send `value` as `[]`:

today, yesterday, tomorrow, this_week, last_week, next_week, this_month, last_month, next_month.

For a date relative to today with an offset ("ending in the next 10 days"), convert it to explicit dates and use `between`, and state the dates back to the user.

## Examples

Field names below follow the response keys. Confirm each one with `get_fields` (module "projects") before the first filtered call in a session; the project name field in particular may not be `name`.

Open projects whose end date has passed (overdue), with today as 2026-10-23:

```json
{"criteria":[{"field_name":"status","criteria_condition":"all_open","value":[]},{"field_name":"end_date","criteria_condition":"less_than","value":["2026-10-23"]}],"pattern":"1 AND 2"}
```

Projects starting between two dates:

```json
{"criteria":[{"field_name":"start_date","criteria_condition":"between","value":["2026-11-01","2026-11-30"]}],"pattern":"1"}
```

Projects whose name contains "Website" or "Portal":

```json
{"criteria":[{"field_name":"name","criteria_condition":"contains","value":["Website"]},{"field_name":"name","criteria_condition":"contains","value":["Portal"]}],"pattern":"1 OR 2"}
```

## Filter With a View

When `view_id` is also sent, the filter is combined with the view's own criteria using AND. To filter archived or template projects, pass that view's `id` with the filter.

## When a Filter Fails

If the call rejects the filter, or returns zero rows where the user expects results, drop the filter, list the projects with paging, and match the rows yourself. Tell the user the filter was applied locally.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Filter rejected on shape | Task-style JSON string sent where an object is expected, or the reverse | Follow the tool schema; projects take an object by default |
| 400 on pattern | Index out of range, or several criteria with no pattern | Reference each index 1..n exactly once |
| Rejected status macro | Task syntax `${ALL_OPEN}` used | Use `"criteria_condition":"all_open","value":[]` |
| 400 on a field | Display name used as `field_name` | Use the API `field_name` from `get_fields` (module "projects") |
| Status or picklist returns zero rows | Display label sent | Send the option ID |
| Date value rejected | Timestamp or epoch millis sent | Use `YYYY-MM-DD` |
| User filter returns zero rows | Wrong ID space for that field | Match `owner.zpuid` in the rows instead |
| Fewer rows than expected with a view | Filter and view criteria are combined with AND | Remove the view, or loosen the filter |
