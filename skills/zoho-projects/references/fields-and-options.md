# Fields and Options

How to find modules, field API names, field IDs and picklist option IDs before reading, filtering or writing records.

## Names vs IDs

| Item | API name | ID | Source |
|------|----------|----|--------|
| Module | `api_name`, for example `tasks` | `id`, digits | `get_modules` |
| Field | `field_name`, for example `task_cf_0006` | `id`, digits | `get_fields` |
| Option | display value, never sent | `id`, digits | `get_options_list_for_a_field_in_module` |

- Request bodies and filters use the field's `field_name`. Never use the display name as a key.
- Picklist, multipicklist and status values are sent as option IDs, never as display labels.
- Some tools take the module API name, others its ID. Follow each tool's schema.

## Modules

`get_modules` (portal_id) lists default and custom modules with their `api_name`, `id` and status. Narrow with `filter.is_default` or `filter.is_customized`.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"filter": {"is_customized": true}, "per_page": 100}
}
```

Default page size is 20 and `per_page` is capped at 200.

## Fields

`get_fields` (portal_id) requires `query_params.module`, which takes the module API name or its ID. Pass `filter.project_id` to get the fields in that project's layout.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {
    "module": "tasks",
    "filter": {"project_id": "1752587000000431001", "is_default": false},
    "per_page": 200
  }
}
```

Useful `filter` keys (a JSON object):
- `fields`: list of field API names, up to 50.
- `field_ids`: list of field IDs, up to 50.
- `search_term`: partial or full field name.
- `is_default`: true for default fields only, false for custom fields only.
- `is_mandatory`: true for fields required by the portal or layout. Check these before a create.
- `project_id` or `layout_id`: fields in that project or layout.
- `is_association_info_needed`: adds which layouts or projects each field is linked to.

Read each field's `field_name`, `id`, display name and type. The type decides the value format and the filter conditions.

## Field Configuration

`get_configuration` (portal_id, `query_params.module` as API name or ID) returns the supported field types for a module and the maximum number of fields per type. Use it only before creating custom fields.

## Option IDs

`get_options_list_for_a_field_in_module` (portal_id) lists the options of a picklist, multipicklist or status field. Its schema requires `module` as the module ID from `get_modules` and `field` as the field ID from `get_fields`. Scope with `filter.project_id` or `filter.layout_id`.

Safe path:
1. `get_modules` and take the module `id`.
2. `get_fields` with that module and the project, and take the field `id` (search with `filter.fields`, for example `["status"]`).
3. Call the options tool with both IDs.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {
    "module": "1752587000000005001",
    "field": "1752587000000005125",
    "filter": {"project_id": "1752587000000431001"},
    "per_page": 100
  }
}
```

Unverified shorthand: the task tool descriptions and the tool's own summary say to call it with module `tasks` and field `status` (API names). Try the safe path first. If the shorthand is used and the call is rejected, switch to the IDs.

Match the user's label against each option's display value, then send the option `id`. If no option matches, show the available options and ask. Never send the label.

## Custom Fields

1. `get_fields` with the module and `filter.project_id`, `is_default` false.
2. Use each field's `field_name` as the body key or filter `field_name`. Fields absent from the project's layout are rejected.
3. For picklist types, resolve option IDs as above.
4. Task responses omit fields with no value, so a missing key does not mean the field does not exist. Assume the same for other modules unless their skill says otherwise.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 INVALID_PARAMETER_VALUE on a field | Display name used as a key, or a label sent for a picklist or status | Use `field_name` from `get_fields` and the option `id` |
| 400 on a custom field in a write | Field not in the project's layout | Call `get_fields` with `filter.project_id` and use only listed fields |
| Options call rejected | `module` or `field` passed as API names | Pass the module `id` from `get_modules` and the field `id` from `get_fields` |
| Options list missing a value | Options scoped to another project or layout | Pass `filter.project_id` or `filter.layout_id` |
| `get_fields` rejected | `module` missing | Pass the module API name or ID |
| Create fails for a missing value | A mandatory field was not sent | Check `get_fields` with `is_mandatory` true and ask the user for the values |
| Field "not found" in a record response | Empty fields are omitted from responses | Check the layout with `get_fields` before concluding the field is absent |
