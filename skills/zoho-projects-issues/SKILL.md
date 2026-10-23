---
name: zoho-projects-issues
description: "Zoho Projects issues (bugs): list, filter, create, assign, update, close, move, clone and delete issues; severity, classification, status, due date, flag, reminders; linked issues; issue-task association; comments, followers, resolution, attachments, activities and status history. Use for my bugs, open issues by severity, log a bug, assign or close an issue, link duplicate issues, associate an issue with a task, issue filter errors, status or severity name rejected, issue lands in the wrong project. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Load the `zoho-projects` skill first. It checks the MCP connection, sets portal_id and project_id, and holds the shared rules for IDs, users (ZPUID vs ZUID), field API names, option IDs, paging and confirming writes. Do not repeat that setup here.
2. Resolve the issue_id from an issue list call or a create or clone response, never from a title or a display prefix such as `ZP-I12`; only use IDs returned by a tool in this session or given by the user. Load `references/issues-basics.md` for listing, paging, sorting and "my issues".
3. Route to the reference that matches the request:
   - Filtering issues, filter errors: `references/issues-filters.md`
   - Creating, assigning, editing, closing, moving, cloning or deleting an issue: `references/issues-create-update.md`
   - Linking issues to each other, associating issues with tasks: `references/issues-links-and-tasks.md`
   - Comments, followers, resolution, attachments: `references/issues-collaboration.md`
4. Before any create, update, move, clone, link, association, resolution, comment or delete, show the user exactly what will change (issue, field, old value, new value) and wait for explicit confirmation. Never batch several writes behind one confirmation unless the user approved the full list.
5. After a write, confirm the result with `get_issue`, because several write tools return only IDs or a bare acknowledgement.

## Triggers

Use this skill for:
- "show my bugs", "open issues in project X", "critical issues due this week", "issues assigned to Y"
- "log a bug", "create an issue", "assign this bug to", "change severity", "close the issue", "reopen this bug"
- "move this issue to another project", "clone this bug", "delete this issue"
- "link these issues as duplicates", "which issues are linked to this one", "associate this bug with a task", "which tasks fix this issue"
- "add a comment to the bug", "follow this issue", "add a resolution", "attach a file to the issue"
- "when did this issue change status", "issue activity", "who changed this bug"
- `PATTERN_NOT_MATCHED` or a rejected pattern on an issue filter, `INVALID_PARAMETER_VALUE` on status or severity, `INVALID_STATUS_TRANSITION`, filter on assignee returns zero rows

Not covered: task filters and task dependencies (use `zoho-projects-tasks`), phase records themselves (use `zoho-projects-phases`), logging time on an issue (use `zoho-projects-timelogs`), tagging issues (use `zoho-projects-tags`), saved issue views (use `zoho-projects-custom-views`) and blueprint transitions (use `zoho-projects-blueprints`).

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/issues-basics.md` | Issue IDs, portal vs project listing, pagination, sorting, custom views, my issues, issue details, description, activities, status history |
| `references/issues-filters.md` | Building the issue `filter` object, conditions, value encoding, dates, custom field filters, filter errors |
| `references/issues-create-update.md` | Creating and updating issues, status, severity, classification, assignee, reporter, due date, flag, reminders, tags, custom fields, move, clone, delete, export |
| `references/issues-links-and-tasks.md` | Issue-to-issue links and link types, issue-to-task associations |
| `references/issues-collaboration.md` | Comments, followers, follow and unfollow, resolution, attachments |
