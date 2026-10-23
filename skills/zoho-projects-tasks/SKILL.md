---
name: zoho-projects-tasks
description: "Zoho Projects tasks: list, filter, count, create, assign, update, close, clone, move, reorder and delete tasks, subtasks, dependencies and status history. Use for my tasks, overdue tasks, due date changes, task assignment, blocked by or dependency links, task count, task filter errors such as PATTERN_NOT_MATCHED, status name rejected, owners removed after update. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.1.0"
---

## How It Works

1. Load the `zoho-projects` skill first. It checks the MCP connection, sets portal_id and project_id, and holds the shared rules for IDs, users (ZPUID vs ZUID), field API names, option IDs, paging and confirming writes. Do not repeat that setup here.
2. Resolve the task_id from a task list call or a create or clone response; only use IDs returned by a tool in this session or given by the user. Load `references/tasks-basics.md` for listing, paging, sorting and "my tasks".
3. Route to the reference that matches the request:
   - Filtering, counting by criteria, overdue, filter errors: `references/tasks-filters.md`
   - Creating, assigning, editing, closing or deleting a task: `references/tasks-create-update.md`
   - Predecessors, successors, blocked tasks: `references/tasks-dependencies.md`
   - Subtasks, cloning, moving between lists, ordering, status history: `references/tasks-structure.md`
   - Comments, followers, attachments, forums, linked issues: `references/tasks-collaboration.md`
4. Before any create, update, delete, clone, move, reorder or dependency change, show the user exactly what will change (task, field, old value, new value) and wait for explicit confirmation. Never batch several writes behind one confirmation unless the user approved the full list.
5. After a write, confirm the result with `get_task_details`, because several write tools return only IDs or a bare acknowledgement.

## Triggers

Use this skill for:
- "show my tasks", "what is overdue", "tasks due this week", "open tasks in project X"
- "create a task", "assign this task to", "add an owner", "change the due date", "close the task", "mark as done"
- "make this a subtask", "clone this task", "move task to another list", "put this task first"
- "task A is blocked by task B", "add a dependency", "which tasks are blocked"
- "how many tasks", "task count does not match the list", "when did this task change status"
- "comment on the task", "follow this task", "add Priya as a follower", "attach the file to the task", "link this bug to the task", `zp.followers.alreadyexist`, `zp.followers.projectuser`
- `PATTERN_NOT_MATCHED`, `INVALID_PARAMETER_VALUE`, `JSON_PARSE_ERROR`, `CANT_COPY_SUBTASK`, "Time values are not supported", filter returns zero rows, co-owners removed after update

Not covered: issue (bug) filters and issue linking, which use different rules (use `zoho-projects-issues`), phase records (use `zoho-projects-phases`), task list records and templates (use `zoho-projects-tasklists`), logging time on a task (use `zoho-projects-timelogs`), tagging tasks (use `zoho-projects-tags`) and saved task views (use `zoho-projects-custom-views`).

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/tasks-basics.md` | Listing tasks, project vs portal scope, pagination, sorting, custom views, my tasks, task details, task forums |
| `references/tasks-filters.md` | Building the `filter` JSON, conditions per field type, value encoding, date macros, overdue, custom field filters, filter errors |
| `references/tasks-create-update.md` | Creating, updating, assigning owners, status, dates, priority, billing, recurrence, reminders, custom fields, deleting |
| `references/tasks-dependencies.md` | Adding, changing or removing dependencies, reading dependency_info, finding blocked tasks |
| `references/tasks-structure.md` | Subtasks, clone_a_task, move_task, reorder_tasks, get_status_timeline |
| `references/tasks-collaboration.md` | Task comments, followers, attachments, forum links, linked issues (bugs) |
