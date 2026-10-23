---
name: zoho-projects-layouts-fields
description: "Zoho Projects layouts, custom fields, sections and picklist options: list, read, create, rename and delete layouts; find the default layout and which projects use a layout; create, rename, move, disassociate and delete fields; create, rename and delete sections; add, rename, disassociate and delete picklist options; check field type limits. Use for add a custom field, add a picklist with options, new layout for a team, which layouts use this field, remove a field from a layout, rename a section, how many custom fields are left, ALREADY_NAME_EXISTS, OPTION_ALREADY_EXISTS, NOT_EMPTY_SECTION, 500 when creating a field, layout_id missing on options. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then the module (`api_name` or `id` from `get_modules`), then layout_id, then section_id, field_id and option IDs. IDs are digit strings, never names. Only use IDs returned by a tool in this session or given by the user. For reading fields and option IDs, see the `zoho-projects` skill, `references/fields-and-options.md`; this skill covers changing them.
3. Route to the reference that matches the request:
   - Listing, reading, creating, renaming or deleting layouts, default layout, projects using a layout: `references/layouts-manage.md`
   - Creating, renaming, moving, disassociating or deleting fields and sections, field type limits: `references/layouts-fields-sections.md`
   - Adding, renaming, disassociating or deleting picklist and status options: `references/layouts-picklist-options.md`
4. Layout, field, section and option changes affect every project and record that uses them. Before any write, show the user exactly what will change (module, layout, section, field or option, old value, new value) and which layouts and projects are affected (`get_associated_layouts`, `get_associated_entities_of_layout`), then wait for explicit confirmation. Never change a default layout or a default field unless the user names it and confirms.
5. After a write, confirm the result with `get_layout_details` or `get_fields`. Delete and disassociate tools return only an "Empty response received from API ... 204" message.

## Triggers

Use this skill for:
- "add a custom field to tasks", "create a dropdown field", "add options to the picklist", "rename the field", "make this field mandatory"
- "remove the field from this layout", "delete the custom field", "which layouts use this field"
- "create a layout for the support team", "copy the default layout", "rename the layout", "delete the layout", "which projects use this layout", "what is the default layout"
- "add a section", "rename the section", "move the section to the top", "delete the section"
- "rename the option", "remove an option", "how many picklist fields can I add"
- 403 `ALREADY_NAME_EXISTS`, 403 `OPTION_ALREADY_EXISTS`, 403 `NOT_EMPTY_SECTION`, 400 `INPUT_PARAMETER_MISSING` `layout_id`, 500 `INTERNAL_SERVER_ERROR` from `create_or_update_field` or `update_a_layout`

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/layouts-manage.md` | Layout list and details, default layout, creating by cloning, renaming, project associations, deleting layouts |
| `references/layouts-fields-sections.md` | Field create and update bodies, `field_property`, field types and limits, sections, disassociating and deleting fields |
| `references/layouts-picklist-options.md` | Creating, renaming, disassociating and deleting picklist and status options |
