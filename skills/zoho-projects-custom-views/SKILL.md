---
name: zoho-projects-custom-views
description: "Zoho Projects saved custom views: list, inspect, create, update, clone and delete task views in a project or My Tasks; favourite and unfavourite views; set the default view; list issue views, project views and phase views; save phase and project views. Use for saved filters, my task views, create a view of high priority tasks, rename a view, change view criteria, clone a view, delete a view, favourite views, make this my default view, which issue views exist, view not showing in the project, Kindly provide a valid criteria, PATTERN_NOT_MATCHED on criteria_pattern, View Configuration is not implemented for this module. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then project_id (for project views), then the module ID from `get_modules` (the Task module `id` for task views), then the view ID from a list call. View IDs are portal-wide digit strings; never pass a view name. Only use IDs returned by a tool in this session or given by the user.
3. Route to the reference that matches the request:
   - Listing, reading, creating, updating, cloning or deleting task views, and building view criteria: `references/views-tasks.md`
   - Favourites and default views: `references/views-favourites-defaults.md`
   - Issue views, project views, phase views and `create_or_update_view`: `references/views-other-modules.md`
4. Before any create, update, clone, delete, favourite or default change, show the user exactly what will change (view, field, old value, new value) and wait for explicit confirmation. Setting a default with `for_all_users: true` changes what every member sees; confirm that scope separately. Never edit or delete a view the user did not create unless they ask for it by name.
5. After a write, verify it: read the view with `get_task_custom_view_details`, or list views with the matching `view_type`. Favourite, default and delete calls return only an empty 204.

## Triggers

Use this skill for:
- "list my task views", "which saved views does this project have", "show the criteria of this view"
- "create a view of my high priority tasks", "save this filter as a view", "add a My Tasks view"
- "rename the view", "change the view's filter", "clone this view", "delete this view"
- "favourite this view", "unfavourite it", "make this my default view", "set the default view for everyone"
- "which issue views exist", "list project views", "phase views", "create a phase view"
- view created but not visible in the project, update fails after a rename only, clone criteria look different
- "Kindly provide a valid criteria", "Custom View criteria should not be empty", `PATTERN_NOT_MATCHED` on `criteria_pattern`, `INPUT_PARAMETER_MISSING` on `project_ids`, 501 "View Configuration is not implemented for this module"

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/views-tasks.md` | Task view list and detail tools, `view_type`, criteria string shape, conditions and value formats, project vs My Tasks create, updates, cloning, deleting |
| `references/views-favourites-defaults.md` | Project vs portal favourite flags, project and portal default views, `for_all_users`, restoring a previous default |
| `references/views-other-modules.md` | Issue view lists and details, projects module views, `get_user_views_list`, `create_or_update_view` for phase and project views |
