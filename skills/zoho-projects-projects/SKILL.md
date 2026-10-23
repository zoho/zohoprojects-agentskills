---
name: zoho-projects-projects
description: "Zoho Projects projects: list, find, filter, count, read, create and update projects, project details, status, owner, dates, progress, task, issue and milestone counts, budget, archived and template projects; trash, restore and permanently delete projects; status history, edit history, activity feed and project comments. Create from scratch, from a template, as a copy or as a template; rename, reschedule, change owner or status, close, archive or unarchive, convert to template, move group, change layout, tags, budget and custom fields. Use for which projects do I have, find project X, project status summary, overdue projects, create a project, new project from template, archive this project, change the project owner, extend the end date, owner not accepted, project not found in list, template missing, tags lost after update, delete a project, restore a trashed project, who changed the project status, comment on the project, START_END_CONSISTENCY, STATUS_CHECK, RESOURCE_NOT_FOUND on delete or restore. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.1.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then project_id. IDs are digit strings, never names. A project's `key` is its display number, not its ID. Only use IDs returned by a tool in this session or given by the user; never guess or reuse an ID from memory. Load `references/projects-basics.md` for the resolution steps, listing, paging, views and project details.
3. Route to the reference that matches the request:
   - Listing, finding by name, counting, archived or template projects, my projects, project details, status summary: `references/projects-basics.md`
   - Filtering projects by status, dates, owner or custom fields: `references/projects-filters.md`
   - Creating a project, from a template, as a copy, as a template, with owner, budget, tags or custom fields: `references/projects-create.md`
   - Renaming, rescheduling, changing owner or status, closing, archiving, unarchiving, converting to a template, moving group, changing layout, tags, budget or custom fields: `references/projects-update.md`
   - Trashing, restoring and permanently deleting projects: `references/projects-trash-restore.md`
   - Status history, edit history, activity feed and project comments: `references/projects-history-comments.md`
4. Before any create, update, trash, restore, delete or comment, show the user exactly what will change (project, field, old value, new value) and wait for explicit confirmation. Never create or change a project on inference, and never fill a field the user did not give. Project names are not unique, so confirm by ID. Permanent delete cannot be undone; ask for it separately from the trash step.
5. After a create or update, confirm the result with `get_project_detail`. After a create, keep the new project_id as the session's project context.

## Triggers

Use this skill for:
- "list my projects", "which projects do I have", "find the project called X", "how many projects are active"
- "show archived projects", "list project templates", "projects I own", "projects owned by Y"
- "project details", "how is project X doing", "status summary of all projects", "which projects are overdue", "projects ending this month"
- "budget of project X", "planned vs actual cost", "open tasks and issues in project X"
- "create a project", "new project from the onboarding template", "copy project X", "save this as a template"
- "rename the project", "extend the end date", "change the project owner", "mark the project completed", "archive this project", "unarchive", "make it private", "move it to the Clients group", "add a tag", "increase the budget"
- "delete the project", "trash this project", "restore the deleted project", "when did the project status change", "who edited this project", "project activity", "comment on the project"
- Owner not accepted, project missing from the list, template not found, "zp.projset.ungroupproj" shown as a group name, custom field rejected, tags lost after update, `START_END_CONSISTENCY`, `STATUS_CHECK`, `UNABLE_TO_PARSE_DATA_TYPE` on status, 410 `RESOURCE_TRASHED`, 404 `RESOURCE_NOT_FOUND` from delete or restore

Not covered: project users and project groups (use `zoho-projects-users-groups`), task lists (use `zoho-projects-tasklists`) and tasks (use `zoho-projects-tasks`) inside a project.

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/projects-basics.md` | ID resolution, listing projects, pagination, sorting, archived and template views, my projects, finding a project by name, counting, project details, reading the response, status and budget summaries |
| `references/projects-filters.md` | Building the `filter` object for `get_projects_list`, conditions per field type, date macros, open and closed status, filter errors |
| `references/projects-create.md` | Creating a project, required and optional fields, owner, dates, status, layout, group, tags, templates, copying, budget, custom fields, verifying the result |
| `references/projects-update.md` | Updating a project: name, description, dates, owner, status, archive and unarchive, template conversion, visibility, group, layout, tags, budget, custom fields, verifying the result |
| `references/projects-trash-restore.md` | `trash_project`, `restore_project`, `delete_project`, finding trashed projects, 410 and 404 errors |
| `references/projects-history-comments.md` | `get_project_status_timeline`, `get_edits`, `get_project_edit_details`, `get_project_activity`, project comment tools |
