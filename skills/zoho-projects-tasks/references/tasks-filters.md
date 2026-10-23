# Task Filters

Rules for the `filter` query parameter on `get_tasks_by_project`, `get_tasks_by_portal` and `get_task_count`. Issue filters follow different rules and are not covered here.

## Structure

`filter` is a JSON string (escaped inside the tool arguments), not a nested object:

```json
{"criteria":[{"field_name":"priority","criteria_condition":"is","value":["high"]}],"pattern":"1"}
```

Each criterion has `field_name`, `criteria_condition` and `value`. `value` is always an array:
- one item for a single match
- several items for an OR match within one criterion
- exactly 2 items for `between` and `not_between` (the count is not server validated, so get it right)

At most 10 criteria. The same `field_name` may appear in more than one criterion.

## Pattern

- Reference criteria by 1-based index joined with uppercase `AND` or `OR`. Group with parentheses, for example `(1 AND 2) OR 3`.
- Lowercase `and` / `or` is rejected with `PATTERN_NOT_MATCHED`.
- Required when there is more than one criterion. Whitespace alone between indices (`1 2 3`) is treated as implicit AND; prefer explicit `AND`.
- Reference every index exactly once. An out-of-range index returns 400.

## Conditions by Field Type

| Field type | Conditions |
|------------|------------|
| Text, email, phone, url, multiline | is, is_not, contains, not_contains, starts_with, ends_with, is_empty, is_not_empty |
| Picklist, multipicklist, checkbox | is, is_not, is_empty, is_not_empty |
| User (owner, userpicklist, multiuserpicklist) | is, is_not, direct_reports_of, subordinates_of |
| Date, dateandtime | is, less_than, less_than_or_equal, greater_than, greater_than_or_equal, between, not_between |
| Number | equal, not_equal, less_than, greater_than, less_than_or_equal, greater_than_or_equal |

`direct_reports_of` and `subordinates_of` work only on the native `owner` field; on a custom user field they return 500.

## Conditions That Look Valid but Fail

- `is_empty` / `is_not_empty` return 400 on: name, status, followers, checkbox, every date and dateandtime field, and every number, currency and percentage field (task_actual_hours, planned_cost, actual_cost, forecasted_hours, forecasted_cost, the bcy_* fields, cost_budget, bcy_budget, cost_per_hour, hourly_budget, rate_per_hour).
- `is_not_empty` also returns 400 on owner and added_by_zpuid.
- They do work on description and other multiline fields, email, phone, url, picklist, multipicklist, custom user fields, tags, teams, tasklist_id, is_completed and completion_percentage.
- For "no date set" use the `unscheduled` macro. For "name is set" use `contains`.
- `current_login_user` returns 200 with zero rows on owner and added_by_zpuid. It resolves correctly on created_by and on custom user fields. For "my tasks" resolve the ZPUID and use `is` (see `tasks-basics.md`).
- `deactivated_users` / `deleted_users` return 400 when `value` is an empty array.

## Fields That Always Fail

| Field | Result | Use instead |
|-------|--------|-------------|
| tasklist (the list name) | 500 on every condition | tasklist_id |
| milestone, milestone_id | 500 | none documented |
| balance, age_since_created, age_since_due | 500 | none documented |
| flag, planned_hours, hours_remaining, last_modified_by | 400 "predefined custom field id is not supported" | none documented |
| last_modified_time | 400 "predefined custom field id is not supported" | last_updated_time |
| followers | 400 on every condition | none documented |

## Value Encoding

| Field | Value |
|-------|-------|
| status, picklist, multipicklist, tags | Option ID, never the display name |
| priority | high, medium, low, none |
| billing_type | 0 (none), 1 (billable), 2 (non-billable) |
| is_completed | "1" / "0" (or "true" / "false"), not open / closed |
| checkbox | "1" / "0" |
| dependency_status | Numeric code, not a label such as "blocking tasks" |
| Dates | YYYY-MM-DD only, on every date field and both values of between |
| owner, added_by_zpuid, multiuserpicklist | ZPUID |
| created_by, custom userpicklist | ZUID |

- Passing a human label where a code is expected (billing_type, is_completed, dependency_status) returns 500, not a validation error.
- A full ISO 8601 timestamp such as `2026-03-01T00:00:00.000Z` returns 400 "Time values are not supported as of now for the field". Epoch millis also return 400. Custom-view criteria accept ISO, but task filters do not; do not carry that format over.
- Each user field accepts one ID space. The wrong one returns 200 with zero rows, not an error.

Resolve status and picklist option IDs as described in the `zoho-projects` skill (`references/fields-and-options.md`), passing `filter.project_id`.

## Macros

Date macros go in `criteria_condition`, and `value` must carry the macro as `["${<macro>}"]`. An empty `value` returns 400.

Available: today, yesterday, till_yesterday, tomorrow, this_week, this_month, last_week, last_month, next_7_days, unscheduled, and `overdue` on `end_date` only.

```json
{"criteria":[{"field_name":"end_date","criteria_condition":"overdue","value":["${overdue}"]}],"pattern":"1"}
```

Status is the exception. For all open or all closed tasks, put an uppercase literal in `value`; `criteria_condition` is ignored:

```json
{"criteria":[{"field_name":"status","criteria_condition":"is","value":["${ALL_OPEN}"]}],"pattern":"1"}
```

Use `["${ALL_CLOSED}"]` for closed tasks. Lowercase `${all_open}`, `all_open` in `criteria_condition`, or the bare string `all_open` as a value all return 400.

## Examples

High priority open tasks due between two dates:

```json
{"criteria":[{"field_name":"priority","criteria_condition":"is","value":["high"]},{"field_name":"status","criteria_condition":"is","value":["${ALL_OPEN}"]},{"field_name":"end_date","criteria_condition":"between","value":["2026-11-01","2026-11-30"]}],"pattern":"1 AND 2 AND 3"}
```

Tasks owned by either of two users, or in one task list:

```json
{"criteria":[{"field_name":"owner","criteria_condition":"is","value":["1752587000000097003","1752587000000097011"]},{"field_name":"tasklist_id","criteria_condition":"is","value":["1752587000000431107"]}],"pattern":"1 OR 2"}
```

## Custom Fields

1. Call `get_fields` with `query_params.module` "tasks" and `filter.project_id` to get each custom field's API `field_name` and type.
2. Choose conditions by the field's type from the table above.
3. For picklist and multipicklist fields, resolve option IDs as described in the `zoho-projects` skill (`references/fields-and-options.md`).
4. If a value cannot be resolved to an ID, ask the user. Do not pass the display label.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 PATTERN_NOT_MATCHED | Lowercase `and` / `or` in pattern | Use uppercase `AND` / `OR` |
| 400 on pattern | Index out of range, or more than one criterion with no pattern | Reference each index 1..n exactly once |
| 400 "Time values are not supported as of now for the field" | ISO timestamp in a date value | Use YYYY-MM-DD |
| 400 on a date value | Epoch millis passed | Use YYYY-MM-DD |
| 400 on is_empty / is_not_empty | Used on name, status, followers, checkbox, dates or numbers | Use `unscheduled` for dates, `contains` for name |
| 400 on status macro | Lowercase `${all_open}` or macro in criteria_condition | `"criteria_condition":"is","value":["${ALL_OPEN}"]` |
| 400 on a date macro | Empty `value` array | Repeat the macro in `value` |
| 400 "predefined custom field id is not supported" | Filtered on flag, planned_hours, hours_remaining, last_modified_by or last_modified_time | Drop the field; use last_updated_time for last modified |
| 400 on deactivated_users / deleted_users | Empty `value` array | Supply at least one value |
| 500 on tasklist | Filtered on the task list name | Filter on tasklist_id |
| 500 on milestone, balance, age fields | Field is not filterable | Remove the criterion |
| 500 on billing_type, is_completed, dependency_status | Label passed instead of code | Use the numeric or "1"/"0" code |
| 500 on direct_reports_of / subordinates_of | Used on a custom user field | Use only on `owner` |
| 200 with zero rows on a user field | Wrong ID space (ZUID vs ZPUID) or `current_login_user` on owner | Match the ID space per field; resolve the user ID |