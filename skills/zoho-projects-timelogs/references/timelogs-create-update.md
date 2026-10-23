# Add, Update and Remove Time Logs

Request shapes and server rules for `add_time_log`, `add_bulk_time_logs` and `update_single_time_log`, and how to remove a log when there is no delete tool.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `add_time_log` | portal_id, project_id | One log. `date`, `module`, `bill_status` required, plus hours or start and end time |
| `add_bulk_time_logs` | portal_id | Many logs, any projects in the portal. `body.log_object` is a JSON array string |
| `update_single_time_log` | portal_id, project_id, timelog_id | Only fields sent change. `module.type` required and must match the log |
| `move_entities_to_trash` | portal_id | Removes logs (module `timelogs`); restorable |
| `restore_entities_from_trash` | portal_id | Brings a trashed log back |

## add_time_log

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "date": "2026-11-04",
    "module": {"type": "task", "id": "1752587000000512007"},
    "bill_status": "Billable",
    "hours": "02:30",
    "notes": "Fixed the login redirect"
  }
}
```

- `module.type` is `task`, `issue` or `general`. `id` is required for task and issue; leaving it out returns 500, not a validation error.
- General logs: `{"type": "general"}` plus `log_name` (400 "Log name cannot be empty" without it).
- `date` must be `YYYY-MM-DD`. Future dates were blocked by the portal setting in testing ("Time log is allowed for 0 day(s) from current date and time"); past dates were accepted.
- `bill_status`: `Billable` or `Non Billable`. Lowercase `billable` was accepted; any other value returns 400 `PATTERN_NOT_MATCHED`.
- The response returns the new log, including `id` and the stored `log_hour`. Keep the `id` for edits.

### Hours

| Input | Stored as |
|-------|-----------|
| `"02:30"` | 02:30 |
| `"1.5"` | 01:30 |
| `"1.45"` | 01:27 (decimal hours, not 1 h 45 min) |

The schema calls the second form `HH.MM`, but the server treats it as decimal hours. When the user says "1.45 hours" meaning 1 h 45 min, send `"01:45"`. Prefer `HH:MM` always.

### Start and End Time

- Send 24-hour `HH:MM`, for example `"start_time": "09:00", "end_time": "10:15"`. The schema example `09:00 AM` is rejected with "Please enter time in the 24 hour format."
- When start and end are sent, `hours` is ignored (`hours` `05:00` with 09:00 to 10:15 stored 01:15).
- Overlapping start and end times on the same day were accepted in this portal; the overlap rule depends on portal settings.

### Limits

- A user's logs for one day cannot exceed 24:00 across all items. The error states what is left: "Daily log hours are restricted to 24:00 hour(s). You are left with 21:33 hour(s) to log."
- Neither hours nor start and end: 400 "Please enter duration in hours."

## Logging on Behalf of a User

Set `owner_zpuid` to the user's ZPUID (the `id` from `get_all_users_in_a_project`). Logging for a user who has not confirmed their portal invitation fails with "Time log cannot be added for unconfirmed users" and "Unauthorized Access". A successful log for another confirmed user is unverified; it also depends on the caller's permissions.

## add_bulk_time_logs

- `log_object` must be a plain JSON array string. A URI-encoded string, as the schema suggests, returns 400 `JSON_PARSE_ERROR`.
- Each item: `project_id`, `date`, `type`, `bill_status`, `item_id` (task or issue) or `log_name` (general), `hours` or `start_time` and `end_time`, and `owner_zpuid`.
- `owner_zpuid` is required in practice. Without it every request returned 500. For your own logs, pass your own ZPUID.
- All or nothing: one invalid item fails the whole batch with `TIMESHEET_BULK_ADD`, and none are created. Do not rely on `input_position` to find the bad item; check each item yourself.
- The response has the same shape as a read (`time_logs` grouped by date, with totals).

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {"log_object": "[{\"project_id\":\"1752587000000431001\",\"date\":\"2026-11-03\",\"type\":\"task\",\"item_id\":\"1752587000000512007\",\"bill_status\":\"Billable\",\"hours\":\"00:45\",\"owner_zpuid\":\"1752587000000097003\"},{\"project_id\":\"1752587000000431001\",\"date\":\"2026-11-03\",\"type\":\"general\",\"log_name\":\"Sprint planning\",\"bill_status\":\"Non Billable\",\"start_time\":\"14:00\",\"end_time\":\"14:30\",\"owner_zpuid\":\"1752587000000097003\"}]"}
}
```

## update_single_time_log

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "timelog_id": "1752587000000600101"},
  "body": {"module": {"type": "task"}, "hours": "03:15", "bill_status": "Non Billable"}
}
```

- `module.type` must match the log's own type; a mismatch returns 500. `module.id` can be left out.
- Fields not sent keep their values (a notes-only update kept hours and bill status).
- `date`, `hours`, `start_time` and `end_time`, `bill_status`, `notes` and `log_name` (general) were all changed successfully.
- Approval fields (`approval_status`, `approver`) and `cost_rate_per_hour` are unverified.

## Avoiding Duplicates

The server accepts an identical second log (same item, date, hours) without warning. Before adding:
1. Read that day with `get_time_logs_by_project`, `view_type` `day`, the item's `module` and `id`.
2. If a log with the same owner and hours exists, show it and ask whether to add another or edit it.
3. If an add call times out or the connection drops, read the day again before retrying; in testing a dropped call had not created the log.

## Removing a Time Log

There is no delete tool for time logs. Use `move_entities_to_trash` with module `timelogs`:

```json
{"path_variables": {"portal_id": "60012345678"}, "body": {"module": "timelogs", "items": ["1752587000000600101"]}}
```

- Returns 204. The log then returns 404 by ID and appears in `get_trashed_records` as module "Time Log".
- Restore with `restore_entities_from_trash`, body `[{"module": "timelogs", "items": ["..."]}]`. The log comes back with its original values.
- If the user prefers, they can delete it in the Zoho Projects web app.
- Trashing a task or an issue takes its time logs with it: they disappear from reads and are not listed separately in the recycle bin. Warn before trashing an item with logged hours.

## Before Any Change

- Show the item, date, hours, billable status, owner and notes, and wait for explicit confirmation.
- Never invent hours or round them. Convert the user's wording to `HH:MM` and state it back.
- Check for an existing log on the same item and date first.
- Before trashing, read the log by ID and show it.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Please enter time in the 24 hour format." | `09:00 AM` style time | Send `09:00` |
| "Please enter duration in hours." | No `hours` and no start and end time | Add one of them |
| "Log name cannot be empty" | General log without `log_name` | Add `log_name` |
| "Daily log hours are restricted to 24:00 hour(s)..." | Day total over 24 h for that user | Lower the hours or check for duplicates |
| "Time log is allowed for 0 day(s) from current date and time" | Future date blocked by portal setting | Use today or a past date |
| "Time log cannot be added for unconfirmed users" | `owner_zpuid` user has not accepted the invite | Ask the user to confirm the invite, or log under another owner |
| 400 `PATTERN_NOT_MATCHED` | Bad `date`, `hours` or `bill_status` value | `YYYY-MM-DD`, `HH:MM`, `Billable` / `Non Billable` |
| 400 `JSON_PARSE_ERROR` on `log_object` | URI-encoded array | Send plain JSON text |
| 500 on bulk add | `owner_zpuid` missing from an item | Add `owner_zpuid` to every item |
| 500 on add or update | `module.id` missing, or update `type` does not match the log | Send the id; use the log's own type |
| Hours stored lower than expected | `1.45` read as decimal hours | Send `01:45` |
