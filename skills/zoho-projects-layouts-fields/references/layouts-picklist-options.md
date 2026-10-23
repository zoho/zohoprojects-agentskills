# Picklist Options

How to add, rename, remove and disassociate options on picklist, multipicklist and status fields. To read option IDs, use `get_options_list_for_a_field_in_module` as described in the `zoho-projects` skill, `references/fields-and-options.md`.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `create_bulk_options` | portal_id | Adds several options in one call |
| `update_bulk_options` | portal_id | Renames or repositions existing options by `id` |
| `delete_or_disassociate_bulk_options` | portal_id | With `layout_id`: disassociates from that layout. Without: deletes |
| `get_options_list_for_a_field_in_module` | portal_id | Read options; `module` and `field` as IDs |

All three write tools take `module` (API name or ID) and `field` (the field ID, not its `field_name`) in the body, plus one option group: `custom_options` for ordinary picklists, `statuses` for status fields, `users` (ZPUIDs) for user lists, `roles` for role lists.

## create_bulk_options

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "module": "asset",
    "field": "1752587000000512428",
    "layout_id": "1752587000000512421",
    "custom_options": [{"value": "Gold"}, {"value": "Silver"}]
  }
}
```

- The response is `data.custom_options` with the new `id` and `value` of each option.
- An option whose value already exists on the field fails with 403 `OPTION_ALREADY_EXISTS` "An option with this name already exists". The error body is an array of errors.
- `position` places the new options (`known_position` `first` or `last`, `after_id`, `before_id`, `exact_position`).

## update_bulk_options

Send each option's `id` with its new `value`. The response lists only the options changed.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "module": "asset",
    "field": "1752587000000512428",
    "layout_id": "1752587000000512421",
    "custom_options": [{"id": "1752587000000512432", "value": "Silver Plus"}]
  }
}
```

Renaming an option changes the label on every record that uses it; the option ID stays the same.

## Removing Options

- With `layout_id`, `delete_or_disassociate_bulk_options` only removes the option from that layout. The option still exists and appears in `get_options_list_for_a_field_in_module` with `filter.is_unassociated` true and the same `layout_id`.
- Without `layout_id`, the same call deletes the option from the field.
- The response is `data.custom_options` with the affected IDs.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {"module": "asset", "field": "1752587000000512428", "custom_options": [{"id": "1752587000000512432"}]}
}
```

- `get_options_list_for_a_field_in_module` with `filter.is_unassociated` true requires `filter.layout_id`; without it the call fails with 400 `INPUT_PARAMETER_MISSING` on `layout_id`.

## Status Options

Status fields use the `statuses` group (`name`, `color`, `is_closed_type`, `transitions`). Unverified: creating, renaming or deleting statuses was not tested live. Status changes affect every record in that status and any blueprint built on it; check with the `zoho-projects-blueprints` skill before changing one.

## Before Any Change

- List the current options and show the user the before and after list.
- Before deleting an option, warn that records holding it may lose the value. Prefer disassociating it from one layout.
- Never change options on a field the user did not name, and never on a default status field without explicit confirmation.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 403 `OPTION_ALREADY_EXISTS` | Value already used on the field | Reuse the existing option ID, or pick another value |
| 400 `INPUT_PARAMETER_MISSING` `layout_id` | `is_unassociated` used without `layout_id` | Add `filter.layout_id` |
| Option still listed after removal | `layout_id` sent, so it was only disassociated | Call again without `layout_id` to delete it, after confirming |
| Options call rejected (unverified) | `field` sent as `field_name` | Send the field `id` from `get_fields` |
