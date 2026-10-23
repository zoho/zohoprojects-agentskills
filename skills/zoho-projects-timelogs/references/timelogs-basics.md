# Time Log Basics

How to read time logs for a project or a whole portal, pick a date range, read totals and answer "my timesheet this week".

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_time_logs_by_project` | portal_id, project_id | One project. `module` and `start_date` required. Also takes `view_id` |
| `get_time_logs_by_portal` | portal_id | Every project in the portal. Same params minus `view_id`. Rows also carry `cost` and `cost_rate_per_hour`, and the response adds `total_cost` |
| `get_time_logs_by_time_log_id` | portal_id, project_id, timelog_id | `query_params.type` required (`task`, `issue` or `general`) and must match the log |

## The module Parameter

`module` is a JSON string, not an object. It selects one log type per call:

- `{"type":"task"}` or `{"type":"issue"}` or `{"type":"general"}` returns every log of that type.
- Add `"id"` to narrow to one task or issue: `{"type":"issue","id":"1752587000000512001"}`.
- Plain (not URI-encoded) JSON text works.
- `get_time_logs_by_project` accepts `general` too, although its schema says task or issue only.
- A full timesheet needs three calls (task, issue, general). Merge the rows and add up the totals yourself.
- A `module` without `type`, such as `{}`, returns 500, not a validation error.

## view_type and Dates

`start_date` is required on every call and must be `YYYY-MM-DD`; other formats return 400 `PATTERN_NOT_MATCHED`.

| view_type | Range returned |
|-----------|----------------|
| `day` | Only `start_date` |
| `week` | The calendar week that contains `start_date`, not the 7 days after it. A Friday start date still returns that week's Monday |
| `month` | The month of `start_date` |
| `customdate` | `start_date` to `end_date`. `end_date` is required (400 `INPUT_PARAMETER_MISSING`), and an end before the start returns 416 `RANGE_NOT_SATISFIABLE` |
| `project_span` | All logs in the project's span |

- Omitting `view_type` behaved like `week` in testing.
- An unknown `view_type` (for example `year`) is ignored silently, not rejected. Use only the five values above.
- For an exact range ("1st to 15th"), use `customdate`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"module": "{\"type\":\"task\"}", "start_date": "2026-11-02", "view_type": "week", "per_page": 100}
}
```

## Response Shape

```json
{
  "page_info": {"per_page": 100, "has_next_page": false, "page": 1, "page_count": 1},
  "log_hours": {"billable_hours": "05:00", "non_billable_hours": "01:27", "total_hours": "06:27"},
  "time_logs": [
    {"date": "2026-11-04",
     "log_hours": {"billable_hours": "00:30", "non_billable_hours": "00:00", "total_hours": "00:30"},
     "log_details": [{"id": "1752587000000600101", "type": "task", "date": "2026-11-04", "log_hour": "00:30",
       "billing_status": "Billable", "approval": {"status": "Pending"},
       "module_detail": {"id": "1752587000000512007", "name": "Login page", "prefix": "PR-T12", "type": "task"},
       "owner": {"zpuid": "1752587000000097003", "name": "..."}, "start_time": "09:30", "end_time": "10:00", "notes": ""}]}
  ]
}
```

- Rows are grouped by date, newest date first. Each group has its own `log_hours`.
- Hours are always `HH:MM` strings, whatever format was sent on create.
- `billing_status` is `Billable` or `Non Billable` in responses (the request field is `bill_status`).
- Issue logs report `module_detail.type` as `bug` while the log `type` is `issue`.
- General logs have no `module_detail`; their title is in `name`.
- `start_time` and `end_time` appear only on logs created with them.
- When nothing matches, the response is just `{"time_logs": []}`, with no `page_info` or `log_hours`.

## Totals and Paging

- The top-level `log_hours` covers the whole requested range, not just the current page. Use it for "how many hours" answers instead of summing one page.
- `per_page` defaults to 100, maximum 200. Follow `page_info.has_next_page`; `page_count` was wrong in testing (5 for a single page, 1 while `has_next_page` was true).

## My Timesheet This Week

1. Get the current user's ZPUID (see `zoho-projects`, `references/users.md`).
2. Call `get_time_logs_by_portal` three times (task, issue, general) with `view_type` `week`, today as `start_date`, and a `user_zpuid` filter.
3. Merge by date and report per-day and weekly totals from `log_hours`.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {
    "module": "{\"type\":\"task\"}", "start_date": "2026-11-04", "view_type": "week",
    "filter": "{\"criteria\":[{\"field_name\":\"user_zpuid\",\"criteria_condition\":\"is\",\"value\":[\"1752587000000097003\"]}],\"pattern\":\"1\"}"
  }
}
```

## Filters

- `filter` is a JSON string with `criteria` and `pattern`. Plain JSON text works.
- `user_zpuid` with `is` and a ZPUID works. A ZUID returns an empty list, not an error.
- `billstatus` criteria returned 500 in testing (both `Billable` and `Non Billable`), and so did a two-criteria filter that included it. To split billable from non billable, read `log_hours.billable_hours` and `non_billable_hours`, or filter rows on `billing_status` yourself.
- Other filter keys listed in the tool schema (project, approvaltype, created_time macros, custom fields) are unverified.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 `INPUT_PARAMETER_MISSING` on `end_date` | `customdate` without `end_date` | Add `end_date` |
| 416 `RANGE_NOT_SATISFIABLE` | `end_date` earlier than `start_date` | Swap or correct the dates |
| 400 `PATTERN_NOT_MATCHED` on `start_date` | Not `YYYY-MM-DD` | Reformat the date |
| 500 on a read | `module` missing `type`, or a `billstatus` filter | Send `{"type":"..."}`; drop the bill status filter and use the totals |
| Empty list for a user | ZUID passed to `user_zpuid` | Use the ZPUID |
| 404 `RESOURCE_NOT_FOUND` by ID | `type` does not match the log, or the log was trashed | Pass the log's own `type`; check the recycle bin |
| Week looks wrong | `week` returns the calendar week of `start_date` | Use `customdate` for a rolling range |
| Hours missing from a timesheet | Only one `module` type read | Read task, issue and general |
