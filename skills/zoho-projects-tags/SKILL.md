---
name: zoho-projects-tags
description: "Zoho Projects tags: list portal tags and the tags used in a project, create, rename, recolor and delete tags, tag and untag tasks and other records. Use for which tags exist, tags used in this project, create a tag, rename or change a tag color, delete a tag, tag this task, remove a tag, tagging wiped the other tags, EXISTING_TAGS, DUPLICATE_TAG, INVALID_TAG_COLOR, LESS_THAN_MIN_LENGTH, 6404 Resource Not Found or 6500 General Error on associate. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then project_id (only for associating, untagging and project tag lists), then tag_id and the entity ID. Tags are portal-wide; a tag ID comes from `get_all_tags`, `get_project_tags` or a create response, never from the tag name. IDs are digit strings; only use IDs returned by a tool in this session or given by the user.
3. Route to the reference that matches the request:
   - Listing, creating, renaming, recoloring or deleting tags: `references/tags-manage.md`
   - Tagging or untagging a task or other record: `references/tags-associate.md`
4. Before any create, update, associate, disassociate or delete, show the user exactly what will change (tag, record, old tags, new tags) and wait for explicit confirmation. `associate_tags_to_entity` replaces the record's whole tag list, and `delete_tag` removes the tag from every record that uses it; say so before asking.
5. After a write, verify it: read the record back (for a task, `get_task_details` and its `tags` array) or list tags again. The associate, disassociate and delete tools return only an empty 204 acknowledgement, and an unknown tag ID is accepted without an error.

## Triggers

Use this skill for:
- "list all tags", "which tags are used in this project", "find the tag called X"
- "create a tag", "add tags red and urgent", "rename this tag", "change the tag color"
- "delete this tag", "remove the tag from the portal"
- "tag this task as urgent", "add a tag to these tasks", "remove the tag from this task", "replace the task's tags"
- tagging removed the other tags, tag created but `tags` array empty, untag does nothing
- `EXISTING_TAGS`, `DUPLICATE_TAG`, `INVALID_TAG_COLOR`, `LESS_THAN_MIN_LENGTH`, error code 6404 or 6500 on associate or disassociate, 404 `RESOURCE_NOT_FOUND` on untag

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/tags-manage.md` | Portal vs project tag lists, filters, paging, creating tags, color classes, renaming, recoloring, deleting, tag errors |
| `references/tags-associate.md` | Tagging and untagging records, `entityType` codes, replace semantics, one entity per call, ID encoding, the add/remove alternative on task updates |
