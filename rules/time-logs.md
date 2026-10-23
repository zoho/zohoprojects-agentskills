---
trigger: model_decision
description: Guardrails for creating, editing and removing Zoho Projects time logs (add_time_log, add_bulk_time_logs, update_single_time_log, get_time_logs_by_portal, get_time_logs_by_project)
alwaysApply: false
---

# Time log guardrails

Load the `zoho-projects-timelogs` skill for request shapes and errors.

- Never invent or round hours. Confirm the item, date, hours, billable status and owner before writing.
- Read that day's logs for the item first. The server accepts exact duplicates without warning.
- Send `hours` as `HH:MM`. A decimal such as `"1.45"` means 1.45 hours (01:27), not 1 hour 45 minutes.
- `start_time` and `end_time` are 24-hour `HH:MM` and override `hours`.
- Bulk logs: `log_object` is plain JSON, every item needs `owner_zpuid`, and one bad item fails the whole batch.
- Owners are ZPUIDs, never ZUIDs.
- There is no delete tool. Remove a log with `move_entities_to_trash` (module `timelogs`).
- Trashing or deleting a task or issue also removes its time logs. Warn the user first.
