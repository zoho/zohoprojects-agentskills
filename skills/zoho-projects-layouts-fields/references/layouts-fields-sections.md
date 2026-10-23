# Fields and Sections

How to create, change and remove custom fields and the sections that hold them. To read fields and their API names, see the `zoho-projects` skill, `references/fields-and-options.md`.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_configuration` | portal_id | `query_params.module` required; supported types and per-type limits |
| `create_or_update_section` | portal_id, layout_id | Body needs `module`, `name`; send `id` to update |
| `delete_section` | portal_id, layout_id, section_id | `query_params.module` required; section must be empty |
| `create_or_update_field` | portal_id | Body needs `module`, `layout_id`, `section_id`; send `id` to update |
| `disassociate_field_from_layout` | portal_id, layout_id, field_api_name | `query_params.module` required; field stays in the module |
| `delete_field` | portal_id, field_id | `query_params.module` required; permanent, values are lost |

## Field Type Limits

`get_configuration` returns `data.supported_field_types` and `data.datatype_limitations`. Each limitation has a `data_type`, `allowed_fields`, `used_fields` and the field types that share the quota. For example `singleline`, `picklist`, `email`, `phone` and `url` share the CHAR quota (15 per module seen), and `auto_number` has its own cap of 5. Check the quota before creating a field.

Field types are the exact strings in `supported_field_types`, with their casing: `singleline`, `multiline`, `picklist`, `multipicklist`, `userpicklist`, `Date`, `dateandtime`, `checkbox`, `currency`, `percentage`, `Numeric`, `Double` and others. `single_line` is not valid.

## Sections

```json
{
  "path_variables": {"portal_id": "60012345678", "layout_id": "1752587000000512421"},
  "body": {"module": "asset", "name": "Warranty", "position": {"known_position": "last"}}
}
```

- The response holds the new section `id`, `name`, `is_removable` and other flags.
- To rename or move, send the section `id` with `module` and `name`. Position takes one of `known_position` (`first`, `last`), `after_id`, `before_id` or `exact_position`.
- `delete_section` fails with 403 `NOT_EMPTY_SECTION` while any field is in it, although the tool description says the fields are disassociated. Move, disassociate or delete the fields first.

## create_or_update_field

Create: send `module`, `layout_id`, `section_id`, `display_name`, `field_type` and a `field_property` object. Leaving out `field_property` returns 500, even on create.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "module": "asset",
    "layout_id": "1752587000000512421",
    "section_id": "1752587000000512425",
    "display_name": "Warranty Tier",
    "field_type": "picklist",
    "field_property": {"is_pii": false, "is_encrypted": false, "context_property": {"is_mandatory": false}}
  }
}
```

- The response holds the field `id` and its `field_name`. For a custom module the `field_name` was derived from the display name, lowercased with hyphens turned into underscores (`x-Tier` became `x_tier`), not a `_cf_` code. Default modules such as tasks use `_cf_` codes. Always read it back from the response.
- A new picklist has no options. Add them with `create_bulk_options` (see `layouts-picklist-options.md`).
- Rename: send `id`, `module`, `layout_id`, `section_id` and the new `display_name`; `field_property` may be left out for a rename only. The `field_name` does not change.
- Other property changes need `field_property`. Setting `is_mandatory` true, `default_value`, `permission` and PII or encryption flags were not tested live.

## Removing Fields

- `disassociate_field_from_layout` takes the field's `field_name` (not its ID) in the path. The field remains in the module and shows up in `get_fields` with `filter.is_unassociated` true.
- `delete_field` removes the field from the module and every layout, with all stored values. It worked on a field still placed in a layout.

```json
{"path_variables": {"portal_id": "60012345678", "field_id": "1752587000000512428"}, "query_params": {"module": "asset"}}
```

## Before Any Change

- Run `get_associated_layouts` for the field and `get_associated_entities_of_layout` for each layout; tell the user how many layouts and projects will see the change.
- Never rename, disassociate or delete a default field (`is_default` true) or a field the user did not name.
- Deleting a field loses its data in every record. Offer disassociating it from one layout instead.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 500 `INTERNAL_SERVER_ERROR` on create | `field_property` missing, or an invalid `field_type` such as `single_line` | Send `field_property` and a type from `get_configuration` |
| 403 `ALREADY_NAME_EXISTS` "A field with this name already exists" | Display name already used in the module | Choose another name, or update the existing field by `id` |
| 403 `NOT_EMPTY_SECTION` | Section still holds fields | Remove or move its fields first |
| Field missing from a record write | Field not in the record's layout | Check `get_layout_details`; record writes silently skip such fields |
| Create refused near the quota (error text unverified) | `used_fields` equals `allowed_fields` for the data type | Check `get_configuration` first; reuse or remove an unused field |
