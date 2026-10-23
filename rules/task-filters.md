---
trigger: model_decision
description: Guardrails for building the filter parameter on Zoho Projects task list tools (get_tasks_by_project, get_tasks_by_portal, get_task_count)
alwaysApply: false
---

# Task filter guardrails

Load the `zoho-projects-tasks` skill (`references/tasks-filters.md`) for the full filter rules and errors.

- `filter` is a JSON string. Combine criteria with uppercase `AND` / `OR`; lowercase is rejected with `PATTERN_NOT_MATCHED`. At most 10 criteria.
- Dates are `YYYY-MM-DD` only. ISO timestamps and epoch values are rejected.
- Status, picklist and tag values in a filter are option IDs, never display names.
- Never use `current_login_user` on `owner`: it returns zero rows. Filter `owner` with the user's ZPUID.
- Filter on `tasklist_id`, never the task list name, which returns 500.
- With no filter, `get_tasks_by_project` returns open and closed tasks while `get_task_count` counts open tasks only.
- Issue filters use different rules (lowercase `and` / `or`); see the `zoho-projects-issues` skill.
