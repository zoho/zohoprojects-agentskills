# Custom Modules

How to create, change and remove custom modules. All module tools take `portal_id` and, except create and list, the module `api_name` as `module_api_name`.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_modules` | portal_id | `filter.is_customized` true lists custom modules only; `per_page` up to 200 |
| `get_a_module` | portal_id, module_api_name | Full module configuration, including `status` |
| `create_a_module` | portal_id | Body below. New modules start in `draft` |
| `update_a_module` | portal_id, module_api_name | Only fields sent change |
| `activate_a_module` | portal_id, module_api_name | Moves a `draft` or `inactive` module to `active` |
| `deactivate_a_module` | portal_id, module_api_name | Hides the module; records stay but cannot be read or written |
| `trash_a_module` | portal_id, module_api_name | Moves the module to the recycle bin |
| `restore_a_module` | portal_id, module_api_name | Brings a trashed module back as `active` |
| `delete_a_module` | portal_id, module_api_name | Permanent; removes the module and all its records |

## Response Shape

- `get_modules` returns `data.result` as an array. Each module has `id`, `api_name`, `singular_name`, `plural_name`, `icon_class`, `type` (`custom_module`), `status` (`draft`, `active` or `inactive`), `is_global_module`, `is_all_projects` and `module_property`.
- The `api_name` is derived from the singular name, lowercased with hyphens turned into underscores: `x-Asset` becomes `x_asset`. Always read it back from the create response.
- `activate_a_module`, `deactivate_a_module`, `trash_a_module` and `delete_a_module` return only an "Empty response received from API ... 204" message. Check the new state with `get_a_module`.
- `restore_a_module` returns the restored module inside `data.result`.
- Run module and record calls one at a time. Parallel calls sometimes failed with "mcp-remote: terminated", and one such `activate_a_module` call had still been applied. After a transport error, read the state back before retrying a write.

## create_a_module

Required: `singular_name`, `plural_name` (50 characters each). Always send `icon_class`: when it is omitted the call fails with 500 `INTERNAL_SERVER_ERROR`, even though the schema says a default is applied. `zoho-cm-action-1` and `zoho-cm-incident-3` were accepted.

Global module (records belong to no project):

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {"singular_name": "Vendor", "plural_name": "Vendors", "is_global_module": true, "icon_class": "zoho-cm-action-1"}
}
```

Project-level module (every record belongs to a project). List the projects that should use it:

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "singular_name": "Asset",
    "plural_name": "Assets",
    "is_global_module": false,
    "icon_class": "zoho-cm-action-1",
    "projects": [{"is_selected": true, "project": {"id": "1752587000000431001"}}]
  }
}
```

- A project-level module created with `is_all_projects` true and no `projects` list failed with 500. Send the `projects` list.
- The module is created in `draft`. Records cannot be added until it is activated: call `activate_a_module`, after confirming with the user.
- The module gets a default layout named "Standard Layout" and a default status set (Active, In Progress, Reopen, On Hold, Cancelled, Completed). Read status option IDs with `get_options_list_for_a_field_in_module`.

## update_a_module

Changes `singular_name`, `plural_name`, `icon_class`, `is_all_projects` or `is_overview_needed`. The `api_name` does not change when the module is renamed.

```json
{
  "path_variables": {"portal_id": "60012345678", "module_api_name": "asset"},
  "body": {"plural_name": "Company Assets", "is_overview_needed": true}
}
```

`module_property.default_layout_type` is rejected for custom modules with 403 "Default layout type can be set only for tasks, bugs, phases and timelogs modules."

## States and Removal

- `inactive`: the module and its records remain, but record list, create and update calls fail with 401 "Cannot Update Inactive Module". Reactivate with `activate_a_module`.
- Trashed: `get_a_module` returns 400 "Invalid module" until `restore_a_module` is called.
- `delete_a_module` worked on draft, active and inactive modules; it does not require trashing first, despite its description. Prefer `trash_a_module` unless the user explicitly asks for permanent deletion.

## Before Any Change

- Show the module by name and `api_name` before trashing, deactivating or deleting it, and state the record count from `get_record_count`.
- Never touch a module the user did not name. Default modules (tasks, issues, phases) are not managed with these tools.
- Deleting a module is permanent and takes every record, comment and layout of the module with it.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 500 `INTERNAL_SERVER_ERROR` on create | `icon_class` omitted, or a project-level module without a `projects` list | Send `icon_class` and, for project-level modules, the `projects` list |
| 403 "Module Name already exists" | Another module uses the same name | Choose a different singular name |
| 401 "Cannot Update Inactive Module" | Module is `draft` or `inactive` | Activate it with `activate_a_module` after confirming |
| 403 "Default layout type can be set only for tasks, bugs, phases and timelogs modules." | `module_property.default_layout_type` sent for a custom module | Leave it out |
| 400 `INVALID_PARAMETER_VALUE` "Invalid module" | Wrong `api_name`, or the module is trashed or deleted | Recheck with `get_modules`; restore if trashed |
