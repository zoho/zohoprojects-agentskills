---
name: zoho-projects
description: "Zoho Projects entry skill: connect the Zoho Projects MCP server, pick the data center, sign in, choose the portal and project, resolve user IDs (ZPUID vs ZUID), field API names and option IDs, then route to module skills. Use when ZohoProjects_* tools are missing, no portals are returned, wrong data center, sign-in loops, session expired, zero rows from a user filter, INVALID_PARAMETER_VALUE on an ID or field, or which portal or project to use."
metadata:
  version: "1.1.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available (hosts may add a prefix; match on `ZohoProjects_`). If they are not, load `references/mcp-setup.md`, stop and help the user connect. Do not call any other step until the tools are visible.
2. Set context: call `get_portals` and take the portal `id` (ask if there are several), then `get_projects_list` with that portal_id and take the project `id` (ask if several match). Load `references/portals-and-projects.md` for the full resolution order and for finding the project of a known task or issue.
3. Only use IDs returned by a tool in this session or given by the user. IDs are digit strings, never names; never guess or reuse an ID from memory. Load `references/users.md` for user IDs and `references/fields-and-options.md` for field names and option IDs.
4. Before any create, update, trash or delete, show the user exactly what will change and wait for explicit confirmation. Load `references/api-conventions.md` for paging, filters, dates, writes and limits.
5. Route the request to the module skill below. This skill itself covers connection, portal and project context, users, and fields.

## Module Skills

| Skill | Load when the request is about... |
|-------|-----------------------------------|
| `zoho-projects-projects` | Listing, finding, filtering and counting projects, project details and status summaries, archived and template projects, creating and updating projects, archiving and unarchiving, trashing, restoring and deleting projects, status and edit history, project activity and comments |
| `zoho-projects-tasks` | Tasks, subtasks, task filters and counts, assigning, status changes, dependencies, cloning, moving, deleting tasks |
| `zoho-projects-issues` | Issues (bugs), issue filters, assigning, severity and status changes, moving and cloning issues, linked issues, issue-task associations, issue comments, followers and resolutions |
| `zoho-projects-phases` | Phases (milestones), phase filters, creating and updating phases, owners, dates, closing and deleting phases, phase comments |
| `zoho-projects-tasklists` | Task lists, creating, renaming, cloning and deleting task lists, task list templates, task list comments and followers |
| `zoho-projects-timelogs` | Time logs and timesheets, logging hours on tasks, issues or general work, bulk logs, editing logs, billable vs non billable |
| `zoho-projects-users-groups` | Adding users and client users to a project, portal profiles and roles, project groups and their users and teams |
| `zoho-projects-tags` | Creating, renaming and deleting tags, tagging and untagging tasks, issues, phases and projects |
| `zoho-projects-custom-views` | Saved views for tasks, issues and projects, favourite and default views |
| `zoho-projects-custom-modules` | Custom modules and their records, record comments, trashing and restoring modules or records |
| `zoho-projects-layouts-fields` | Layouts, creating and editing fields, sections and picklist options |
| `zoho-projects-blueprints` | Blueprints, next transitions, data required during a transition, executing a transition |

For portal, project selection, user lookup and field questions, stay in this skill. Load `references/followers-attachments-trash.md` for trash and restore across modules, edit history, portal activity, and the generic follower and attachment tools (custom module records only; tasks and issues use their own module tools).

## Triggers

Use this skill for:
- "connect Zoho Projects", "set up the Zoho Projects MCP server", "which data center", "sign in to Zoho Projects"
- "list my portals", "which projects do I have", "switch portal", "use the sandbox portal"
- "which project is this task in", "find the project for this bug"
- "who am I in this portal", "list users in the project", "what is my user ID", "ZPUID or ZUID"
- "what fields does this module have", "custom field API name", "status options", "picklist values"
- ZohoProjects_* tools missing, no portals returned, no projects visible, sign-in loop, session expired, wrong account
- `INVALID_PARAMETER_VALUE` on an ID or field, filter on a user field returns zero rows, display name rejected as a field key

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/mcp-setup.md` | Server URL, data centers, adding the server to a client, sign-in, connection errors, revoking access |
| `references/portals-and-projects.md` | Portal and project selection, sandbox portals, archived or template projects, parent project of a task or issue |
| `references/users.md` | ZPUID vs ZUID, current user, portal and project user lookups |
| `references/fields-and-options.md` | Modules, field API names vs IDs, custom fields, mandatory fields, option IDs for status and picklists |
| `references/api-conventions.md` | Digit-only IDs and field keys, pagination styles, filter dialects, date formats, confirming writes, trash and restore, API limits, untrusted record text |
| `references/followers-attachments-trash.md` | Generic followers, attachments and counts on custom module records, trash and restore across modules, project edit history and portal activity |
