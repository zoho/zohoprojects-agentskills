# Issue Filters

Rules for the `filter` query parameter on `get_all_issues` and `get_project_issues`. `get_issue_activities` and `get_issue_comments` take the same shape. Task filters follow different rules; do not carry a task filter over.

## Structure

`filter` is a JSON object inside `query_params`, not a JSON string:

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {
    "page": 1,
    "per_page": 100,
    "filter": {
      "criteria": [
        {"field_name": "severity", "criteria_condition": "is", "value": ["1752587000000007153"]},
        {"field_name": "assignee", "criteria_condition": "is", "value": ["1752587000000097003"]}
      ],
      "pattern": "1 and 2"
    }
  }
}
```

Each criterion has a field reference, `criteria_condition` and `value`. `value` is always an array:
- one item for a single match
- several items to match any of them (`is`) or none of them (`is_not`)
- exactly 2 items for `between` and `not_between`

## Field References

A criterion names its field with one of:
- `field_name`: the field's API `field_name` from `get_fields` with `query_params.module` "issues".
- `api_name`: the field's API name, for example `status`.
- `cfid`: the field's digit ID from `get_fields`. Use it for custom fields when the name is ambiguous.

Never use the display label ("Severity Level") as a field reference. Get the names once per session:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"module": "issues", "filter": {"project_id": "1752587000000431001"}, "per_page": 200}
}
```

The type of each field decides the conditions and value format. Field and option lookup rules are in the `zoho-projects` skill, `references/fields-and-options.md`.

## Pattern

- Reference criteria by 1-based index joined with lowercase `and` or `or`, for example `1 and (2 or 3)`.
- Uppercase `AND` / `OR`, which task and custom module filters need, is the wrong dialect for issues.
- Required when there is more than one criterion. Reference every index exactly once.

## Conditions

Conditions depend on the field type. Common ones: `is`, `is_not`, `contains`, `not_contains`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty` for text and picklists; `is`, `less_than`, `greater_than`, `between`, `not_between` for dates; `equals`, `not_equals`, `less_than`, `greater_than` for numbers. The issue tools do not publish a full condition list per type, so when a condition is rejected, check the field type and try the closest standard condition rather than guessing a new one.

## Value Encoding

| Field | Value |
|-------|-------|
| status, severity, classification, is_it_reproducible, module, picklist and multipicklist custom fields | Option ID, never the display label |
| assignee and other user fields | ZPUID (the `id` from `get_all_users_in_a_project`) |
| release_milestone, affected_milestone | Phase ID from the `zoho-projects-phases` skill |
| Dates | ISO 8601 date strings, for example `2026-11-30`. Date-time values are not supported |
| Numbers | Numeric strings, for example `"100"` |

- Resolve option IDs with `get_options_list_for_a_field_in_module` (module ID for issues from `get_modules`, field ID from `get_fields`, `filter.project_id`).
- Status options are custom per portal and layout. Do not reuse a status ID from another project without checking it in that project's options.
- A user filter that returns 200 with zero rows usually means the wrong ID space. Recheck that the value is a ZPUID before telling the user there are no matches.

## Relative Dates

For "due in the next 7 days" style questions on a custom date field, add `relative_columns` to the criterion. Each item has `cfid` (the custom date field ID), `offset` (integer) and `unit` (`days` or `hours`). When the date is a fixed range instead, convert it to two explicit dates, state them back to the user, and use `between`.

```json
{"criteria": [{"field_name": "due_date", "criteria_condition": "between", "value": ["2026-11-02", "2026-11-08"]}], "pattern": "1"}
```

## Examples

Open critical issues in one project, assigned to one user. Take the severity and status option IDs from the options tool first:

```json
{
  "criteria": [
    {"field_name": "severity", "criteria_condition": "is", "value": ["1752587000000007153"]},
    {"field_name": "status", "criteria_condition": "is_not", "value": ["1752587000000007045", "1752587000000007051"]},
    {"field_name": "assignee", "criteria_condition": "is", "value": ["1752587000000097003"]}
  ],
  "pattern": "1 and 2 and 3"
}
```

Issues matching a keyword in the title, or targeted at one release phase:

```json
{
  "criteria": [
    {"field_name": "name", "criteria_condition": "contains", "value": ["login"]},
    {"field_name": "release_milestone", "criteria_condition": "is", "value": ["1752587000000431205"]}
  ],
  "pattern": "1 or 2"
}
```

Whether `is_empty` / `is_not_empty` need an empty `value` array or no `value` key is not documented for issues. If one form is rejected, try the other.

When the user wants a saved view's results, pass its `view_id` instead of rebuilding its criteria (see `issues-basics.md`).

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Filter rejected on pattern | Uppercase `AND` / `OR` carried over from a task filter | Use lowercase `and` / `or` |
| Filter rejected on shape | Filter sent as an escaped JSON string, as tasks need | Send a JSON object |
| 400 on pattern | Index out of range, or several criteria with no pattern | Reference each index 1..n exactly once |
| Filter rejected on a date | Date-time value such as `2026-11-30T10:00:00Z` | Send a date only |
| 400 INVALID_PARAMETER_VALUE on a field | Display label used as the field reference | Use `field_name`, `api_name` or `cfid` from `get_fields` |
| Zero rows on status, severity or a picklist | Label sent instead of option ID, or option ID from another layout | Resolve the option ID for this project |
| Zero rows on assignee | ZUID sent instead of ZPUID | Use the `id` from `get_all_users_in_a_project` |
| Condition rejected for a field | Condition does not fit the field type | Check the type with `get_fields` and pick a condition for that type |
