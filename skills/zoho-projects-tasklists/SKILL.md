---
name: zoho-projects-tasklists
description: "Zoho Projects task lists: list, find, create, rename, complete, reopen, move to a phase, detach from a phase, clone and trash task lists; the default General list; internal vs external lists; task list comments and followers; task list templates (save a list as a template, browse templates and their tasks, apply a template to a project). Use for which task lists are in project X, create a task list, put this list under a milestone, clone a list, mark the list completed, comment on a task list, follow a task list, save as template, create a list from a template, shift_date missing, status rejected with PATTERN_NOT_MATCHED, milestone id rejected, list flag changed, clone returned 500. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then project_id, then the task list ID (path variable `tasklists_id`, plural). For templates, resolve the template ID with `get_task_lists_from_template`; it is a different ID from the task list it was made from. IDs are digit strings, never names; only use IDs returned by a tool in this session or given by the user. Load `references/tasklists-basics.md` for listing, filtering, paging and details.
3. Route to the reference that matches the request:
   - Creating, renaming, completing, phase changes, flag, tags, the default General list, trashing: `references/tasklists-create-update.md`
   - Comments and followers on a task list: `references/tasklists-collaboration.md`
   - Saving as a template, browsing templates, cloning a list or applying a template: `references/tasklists-templates.md`
4. Before any create, update, clone, template, comment, follow or trash, show the user exactly what will change (task list, field, old value, new value) and wait for explicit confirmation. Saving a template is portal-wide and there is no tool to delete a template; say so before asking.
5. After a write, confirm the result with `get_task_list_details` or `get_all_project_task_lists`, because several write tools return 204 with no body, and a failed template clone can still leave a new empty list behind.

## Triggers

Use this skill for:
- "list the task lists in project X", "which lists are under this milestone", "find the Design list", "task lists across all projects"
- "create a task list", "rename the list", "mark the list as completed", "reopen the list", "move this list to phase Beta", "take the list out of its phase"
- "make an external list for the client", "create the General list", "delete this task list", "trash the list"
- "comment on the task list", "edit that comment", "follow this task list", "who follows this list"
- "save this list as a template", "which task list templates do we have", "what tasks are in the template", "clone this list", "create a list from the template"
- `PATTERN_NOT_MATCHED` on `status` or `pattern`, `INVALID_PARAMETER_VALUE` "Please send valid milestone id", `URL_RULE_NOT_CONFIGURED`, `INPUT_PARAMETER_MISSING` on `shift_date`, `LESS_THAN_MIN_OCCURANCE` on `comment`, 403 "External task list cannot be associated with an internal Milestone", 500 from `clone_task_list`

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/tasklists-basics.md` | ID resolution, project vs portal listing, filters, sorting, paging, task counts per list, task list details, the unassigned phase sentinel |
| `references/tasklists-create-update.md` | Creating and updating lists, name, status, phase, flag, tags, the default General list, trashing and restoring |
| `references/tasklists-collaboration.md` | Task list comments (add, read, edit, delete) and followers (follow, unfollow, list) |
| `references/tasklists-templates.md` | `make_task_list_as_template`, template listing, template tasks, `clone_task_list` from a live list or a template |
