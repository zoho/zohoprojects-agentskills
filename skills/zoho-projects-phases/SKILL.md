---
name: zoho-projects-phases
description: "Zoho Projects phases (formerly milestones): list, filter, create, update, close, reorder and delete phases; phase owner, status, start and end dates, flag, tags, budget; phase comments. Use for milestones in a project, upcoming or overdue phases, create a milestone, change the phase end date, close a phase, phase blocked from closing with 403, owner_zpuid or status_id rejected, phase deleted with its task lists. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Load the `zoho-projects` skill first. It checks the MCP connection, sets portal_id and project_id, and holds the shared rules for IDs, users (ZPUID vs ZUID), field API names, option IDs, paging and confirming writes. Do not repeat that setup here.
2. Resolve the phase_id from a phase list call or a create response; a "milestone ID" from the user is the phase ID. Only use IDs returned by a tool in this session or given by the user. Load `references/phases-basics.md` for listing, filtering and paging.
3. Route to the reference that matches the request:
   - Creating, editing, closing, reordering or deleting a phase: `references/phases-create-update.md`
   - Phase comments: `references/phases-comments.md`
4. Before any create, update, delete or comment, show the user exactly what will change (phase, field, old value, new value) and wait for explicit confirmation. Deleting a phase also affects its task lists and tasks; say so before asking.
5. After a write, confirm the result with `get_phase_details`, because the write tools return little beyond an acknowledgement.

## Triggers

Use this skill for:
- "list the milestones", "phases in project X", "which phases end this month", "overdue phases"
- "create a milestone", "add a phase", "rename the phase", "move the phase end date", "change the phase owner"
- "close this milestone", "reopen the phase", "put this phase first"
- "delete this phase", "trash the milestone"
- "comment on the phase", "show phase comments"
- 403 when closing a phase, `INVALID_PARAMETER_VALUE` on owner or status, editing a closed phase fails, name too long

Not covered: which phase a task belongs to and moving tasks between phases (use `zoho-projects-tasks`; a task's phase comes from its task list), issue release and affected phases (use `zoho-projects-issues`), task lists under a phase (use `zoho-projects-tasklists`), tagging phases (use `zoho-projects-tags`).

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/phases-basics.md` | Phase IDs, portal vs project listing, pagination, sorting, filters, custom views, phase details |
| `references/phases-create-update.md` | Creating and updating phases, owner, status, dates, flag, tags, order, template and budget fields, closing, deleting |
| `references/phases-comments.md` | Listing, adding, editing and deleting phase comments |
