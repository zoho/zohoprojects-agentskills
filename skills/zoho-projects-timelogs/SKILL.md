---
name: zoho-projects-timelogs
description: "Zoho Projects time logs (timesheets): log hours on a task, an issue or as a general entry, bulk-add logs, log time on behalf of a user, mark billable or non billable, edit a log, read logs by project or portal, day, week, month or custom date range, daily and weekly totals, my timesheet this week, remove a wrong log through the recycle bin. Use for log 2 hours on this task, add my timesheet, how many hours did I log this week, change this log to billable, delete a time log, duplicate log, Please enter time in the 24 hour format, Log name cannot be empty, Daily log hours are restricted to 24:00, Time log is allowed for 0 day(s) from current date, Time log cannot be added for unconfirmed users, JSON_PARSE_ERROR on log_object, TIMESHEET_ADD, TIMESHEET_BULK_ADD, RANGE_NOT_SATISFIABLE. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup, IDs, users and paging rules.
2. Resolve IDs in order: portal_id, then project_id, then the task_id or issue_id the time is logged against, then timelog_id for an existing log. Owners take the ZPUID (the `id` from `get_all_users_in_a_project`), never the ZUID. Only use IDs returned by a tool in this session or given by the user. Load `references/timelogs-basics.md` for reading logs, date ranges and totals.
3. Route to the reference that matches the request:
   - Reading logs, view_type, date ranges, totals, "my timesheet this week": `references/timelogs-basics.md`
   - Adding a single or bulk log, on behalf of a user, billable status, editing a log, avoiding duplicates, removing a log: `references/timelogs-create-update.md`
4. Before any add, bulk add, update or trash, show the user exactly what will be written (item, date, hours or start and end time, billable status, owner, notes) and wait for explicit confirmation. Never invent or round hours; if the hours are inferred, ask first. Read the existing logs for the same item and date first, because the server accepts exact duplicates without warning.
5. After a write, confirm the result with `get_time_logs_by_time_log_id` (pass the matching `type`) or by re-reading the day with `get_time_logs_by_project`.

## Triggers

Use this skill for:
- "log 2 hours on task X", "add 30 minutes to this bug", "log a general entry for the team meeting"
- "fill my timesheet for this week", "bulk log these hours", "log time for Priya"
- "how many hours did I log this week", "show time logs for this project in October", "billable hours this month"
- "change this log to billable", "fix the hours on yesterday's log", "rename the general log"
- "delete this time log", "I logged it twice", "restore the time log"
- `TIMESHEET_ADD`, `TIMESHEET_BULK_ADD`, "Please enter time in the 24 hour format", "Please enter duration in hours", "Log name cannot be empty", "Daily log hours are restricted to 24:00 hour(s)", "Time log is allowed for 0 day(s) from current date and time", "Time log cannot be added for unconfirmed users", `JSON_PARSE_ERROR` on `log_object`, `PATTERN_NOT_MATCHED` on date, hours or bill_status, `RANGE_NOT_SATISFIABLE`, 500 from a time log call

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/timelogs-basics.md` | Read tools, the `module` parameter, view_type and date ranges, response shape and totals, paging, filters, my timesheet, single log by ID |
| `references/timelogs-create-update.md` | `add_time_log`, `add_bulk_time_logs`, `update_single_time_log`, hours formats, start and end time, billable status, task, issue or general, on behalf of a user, duplicates, removing a log (no delete tool) |
