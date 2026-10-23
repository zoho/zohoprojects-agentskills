# Managing Tags

How to list, create, rename, recolor and delete tags. Tags belong to the portal and are shared by every project and module.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_all_tags` | portal_id | Every tag in the portal. Optional `filter`, `page`, `per_page` |
| `get_project_tags` | portal_id, project_id | Only tags currently used by records in the project. Same query params |
| `create_new_tags` | portal_id | Tags go in `query_params.tags`, not in a body |
| `update_tag` | portal_id, tag_id | Body with `name` and/or `color_class` |
| `delete_tag` | portal_id, tag_id | Permanent; removes the tag from every record |

## Listing

- `get_project_tags` returns an empty list for a project whose records carry no tags, even when the portal has many tags. To offer tags for a project, list `get_all_tags`.
- Each row has `id`, `name`, `color_hexcode`, `usage_count` and `created_by`. `color_class` is often absent from list rows.
- `usage_count` counts tagged records. It was 0 in the create response and became 1 in the list after tagging one task.
- Follow `page_info.has_next_page`. `per_page` is capped at 200; the observed default was 100.

Filter by name (the schema shows only `cfid`, but `field_name` works):

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {
    "filter": {"criteria": [{"field_name": "name", "criteria_condition": "contains", "value": ["release"]}], "pattern": "1"},
    "per_page": 100
  }
}
```

## Creating

`name` (2 to 50 characters) and `color_class` are both required for each tag. Several tags can be created in one call.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"tags": [
    {"name": "release-blocker", "color_class": "bg-tag1"},
    {"name": "needs-review", "color_class": "bg-tag5"}
  ]}
}
```

The response is `data.tags`, an array of `{id, name, color_class, usage_count, color_hexcode}`.

- `color_class` takes a class code of the form `bg-tagN`. `bg-tag1`, `bg-tag5` and `bg-tag14` were accepted; the full valid range is unverified. A plain color word such as `purple` is rejected.
- Duplicate names and bad colors do not fail the call. The response has `"status": "success"`, an empty `data.tags` and a `data.error` object with `status_code` 207 and a title such as `EXISTING_TAGS` or `INVALID_TAG_COLOR`. Always check `data.tags` is non-empty and read `data.error`.
- Tag names are unique across the portal. Before creating, search `get_all_tags` for the name and reuse the existing tag.

## Renaming and Recoloring

```json
{"path_variables": {"portal_id": "60012345678", "tag_id": "1752587000000512003"}, "body": {"name": "release-blocker-q4", "color_class": "bg-tag1"}}
```

- The response is `data.tags`, a single object (not an array).
- Renaming without `color_class` changed the tag's `color_hexcode`. Always resend the current `color_class` with a rename. `color_hexcode` also differed between the create, update and list responses for the same tag, so do not compare colors by hex code.
- Errors on update come back as real errors with status 409, unlike create.

## Deleting

- `delete_tag` returns an empty 204. It cannot be undone.
- Deleting a tag that is still on records succeeds; the tag disappears from those records. Check `usage_count` and tell the user how many records will lose the tag before asking.
- A second delete of the same ID returns 404 `RESOURCE_NOT_FOUND`.

## Before Any Change

- Show the tag name, color and `usage_count`, and for a delete, that every tagged record loses the tag.
- Search for an existing tag with the same name before creating one.
- Only change tags the user names. Tags are shared by everyone in the portal.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `data.error` 207 `EXISTING_TAGS`, empty `tags` | Name already used in the portal | Reuse the existing tag from `get_all_tags` |
| `data.error` 207 `INVALID_TAG_COLOR` on create | `color_class` not a valid class code | Use a code such as `bg-tag1` |
| 403 `LESS_THAN_MIN_LENGTH` | Name shorter than 2 characters | Use 2 to 50 characters |
| 409 `DUPLICATE_TAG` on update | New name already used by another tag | Pick another name or reuse that tag |
| 409 `INVALID_TAG_COLOR` on update | Bad `color_class` | Use a `bg-tagN` code |
| Color changed after a rename | `color_class` omitted from the update | Send `color_class` with every update |
| 404 `RESOURCE_NOT_FOUND` on delete | Tag already deleted or wrong ID | Re-list tags and use a current `id` |
| Project tag list is empty | No record in the project is tagged yet | Use `get_all_tags` for the full list |
