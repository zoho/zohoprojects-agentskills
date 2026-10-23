---
name: zoho-projects-custom-modules
description: "Zoho Projects custom modules and their records: create, rename, activate, deactivate, trash, restore and delete custom modules; create, update, list, filter, count, trash and restore custom module records; record status history; record comments. Use for create a custom module, add a Vendors or Assets module, module stuck in draft, list records in a custom module, add a record, change a record's status, comment on a record, Cannot Update Inactive Module, PROJECT_CHECK Invalid project, module not associated with the project, 500 when creating a module, RESOURCE_TRASHED on a record. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then the module `api_name` (from `get_modules`), then project_id for project-level modules, then the record `id` (entity_id) and comment_id. IDs are digit strings; the module key is its `api_name`, never its display name. Only use IDs returned by a tool in this session or given by the user. Field API names and option IDs follow the `zoho-projects` skill, `references/fields-and-options.md`.
3. Route to the reference that matches the request:
   - Creating, renaming, activating, deactivating, trashing, restoring or deleting a module: `references/modules-manage.md`
   - Creating, updating, listing, filtering, counting, trashing or restoring records, record status history: `references/modules-records.md`
   - Record comments: `references/modules-record-comments.md`
   - Layouts, fields, sections and picklist options of a custom module: load the `zoho-projects-layouts-fields` skill.
4. Before any create, update, activate, deactivate, trash, restore, delete or comment, show the user exactly what will change (module or record, field, old value, new value) and wait for explicit confirmation. Deleting a module removes all its records; say so and give the record count from `get_record_count` before asking.
5. After a write, confirm the result with `get_a_module` or `get_record_details`. Several write tools return only an "Empty response received from API ... 204" message, which means success but carries no data.

## Triggers

Use this skill for:
- "create a custom module", "add a Vendors module", "rename the module", "make the module available in project X"
- "activate the module", "the module is still in draft", "deactivate the Assets module", "trash this module", "restore the module", "delete the module"
- "list records in the Risk module", "how many risks are open", "add a record", "change the record status", "update this record"
- "trash this record", "restore the deleted record", "when did this record change status"
- "comment on this record", "show the record comments", "edit or delete a record comment"
- 401 `UNAUTHORIZED_ACCESS` "Cannot Update Inactive Module", 403 `PROJECT_CHECK` "Invalid project", 403 "The module is not associated with the provided project(s)", 403 "Module Name already exists", 410 `RESOURCE_TRASHED`, `PATTERN_NOT_MATCHED` on a record filter, 500 `INTERNAL_SERVER_ERROR` when creating a module

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/modules-manage.md` | Module create and update bodies, global vs project-level modules, draft, active and inactive states, trash, restore, delete |
| `references/modules-records.md` | Record create and update bodies, status and custom field values, listing, filters, counts, status timeline, trash and restore |
| `references/modules-record-comments.md` | Listing, reading, adding, editing and deleting record comments |
