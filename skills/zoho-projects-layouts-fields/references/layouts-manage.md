# Layouts

How to find, read, create, rename and delete layouts. A layout decides which sections and fields a record shows. Each project uses one layout per module, so a layout change reaches every project linked to it.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_layout_list` | portal_id | `query_params.module` required; `filter` optional |
| `get_layout_details` | portal_id, layout_id | `query_params.module` required; returns sections and their fields |
| `get_default_layout` | portal_id | `query_params.module` required; returns `id`, `name`, `type` only, no sections |
| `get_associated_entities_of_layout` | portal_id, layout_id | `query_params.module` required; projects linked to the layout |
| `get_associated_layouts` | portal_id, field_id | `query_params.module` required; layouts that contain a field |
| `create_a_layout` | portal_id | Clones an existing layout |
| `update_a_layout` | portal_id, layout_id | `module` and `name` always required |
| `delete_a_layout` | portal_id, layout_id | `query_params.module` required; permanent |

`module` takes the module `api_name` (for example `tasks` or a custom module's `api_name`) or its `id`.

## Reading Layouts

- `get_layout_list` returns `data.result`: `id`, `name`, `is_default`, `type` (`public` or `private`).
- With `filter.is_association_info_needed` true, each layout also carries `associated_entities` (projects with `id`, `name`, `status`) and `associated_entities_count`. For tasks, most projects have their own `private` layout named after the project.
- `filter.search_by` `project` with a project ID as `search_term` returned an empty list. Unverified whether it expects the project name. To find a project's layout, use `is_association_info_needed` and match the project `id`.
- `get_layout_details` returns `data.sections`; each section has `id`, `name` (the first default section has none), `is_default`, `is_removable` and `fields`. Each field shows `field_name`, `display_name`, `field_type` and `field_property.context_property.is_mandatory` for that layout.

## create_a_layout

Required: `module`, `name`, `reference.id`. The new layout is a copy of the reference layout, with new section IDs.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {
    "module": "asset",
    "name": "Field Team Layout",
    "type": "public",
    "reference": {"id": "1752587000000512077"}
  }
}
```

The response holds `id`, `name`, `is_default` (false) and `type`. A new layout is linked to no projects (`get_associated_entities_of_layout` returns an empty list), so records cannot use it yet: a record create with that `layout.id` fails with 403 `LAYOUT_CHECK` "Invalid layout".

## update_a_layout

`module` and `name` are required even when only one of them changes. Renaming works:

```json
{
  "path_variables": {"portal_id": "60012345678", "layout_id": "1752587000000512421"},
  "body": {"module": "asset", "name": "Field Team Layout v2"}
}
```

Linking projects with `associated_entities` (`[{"id": "<project_id>"}]`, with or without `name`) returned 500 `INTERNAL_SERVER_ERROR` on a custom module layout. Unverified on other modules. If it fails, tell the user to link the layout to projects in the Zoho Projects web app.

## delete_a_layout

```json
{"path_variables": {"portal_id": "60012345678", "layout_id": "1752587000000512421"}, "query_params": {"module": "asset"}}
```

A layout with no linked projects deleted cleanly. Behaviour for a layout still linked to projects, or for the default layout, was not tested; never try either without the user's explicit request.

## Before Any Change

- Show the layout name, `is_default` and its linked projects (`get_associated_entities_of_layout`) before renaming or deleting.
- Never rename, change or delete a default layout (`is_default` true) or another team's layout unless the user names it and confirms.
- Prefer creating a new layout by cloning over editing a shared one.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 `INVALID_PARAMETER_VALUE` "Invalid module" | Wrong module `api_name` or ID | Recheck with `get_modules` |
| 500 on `update_a_layout` | `associated_entities` sent | Rename separately; link projects in the web app |
| 403 `LAYOUT_CHECK` "Invalid layout" on a record write | Layout not linked to the record's project | Use the project's layout, or omit `layout` |
| Empty list from `search_by` `project` | Project ID used as `search_term` | Use `is_association_info_needed` and match by project `id` |
| `get_default_layout` shows no sections | It returns only the layout header | Call `get_layout_details` with the returned `id` |
