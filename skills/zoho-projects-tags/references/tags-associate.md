# Tagging and Untagging Records

How to put tags on a record and take them off.

## Tools

| Tool | Path variables | Query params | Notes |
|------|----------------|--------------|-------|
| `associate_tags_to_entity` | portal_id, project_id | `tag_id`, `entity_id`, `entityType` (all required) | Replaces the record's tags with the list sent |
| `disassociate_tags_from_entity` | portal_id, project_id | `tag_id`, `entity_id`, `entityType` (all required) | Removes one tag from one record |

Both return an empty 204 on success. Verify by reading the record back.

## entityType

`entityType` is an integer module code.

| Module | Code | Status |
|--------|------|--------|
| Task | 5 | Confirmed |
| Project 2, phase 3, task list 4, issue 6, forum 7 | As listed | Unverified. These match each module's `module_property.search_module_id` in `get_modules`, and the task code matched too |

A code that does not fit the record returns error code 6500 "General Error". If an unverified code fails, tag the record through its own update tool instead (see below).

## Associating

`tag_id` takes a comma-separated list of tag IDs. `entity_id` takes one record ID: a comma-separated list of records returned error code 6404 "Resource Not Found". Loop over records, one call each.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"tag_id": "1752587000000512003,1752587000000512007", "entity_id": "1752587000000440021", "entityType": 5}
}
```

- The call replaces the record's tags. Sending one tag to a task that had another left only the new tag. To add a tag, read the current tags first (for a task, `tags` in `get_task_details`) and send the current IDs plus the new one.
- An unknown tag ID returns 204 and changes nothing. A 204 alone does not prove the tag was applied.

## Disassociating

Send exactly one `tag_id` and one `entity_id`, as digit strings.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"tag_id": "1752587000000512003", "entity_id": "1752587000000440021", "entityType": 5}
}
```

- The schema types these as integers, but numeric IDs this long lose precision: sending them as JSON numbers returned 6404. Send strings.
- Removing a tag the record does not carry returns 404 `RESOURCE_NOT_FOUND`.

## Tags on Task Updates

Tasks also accept tags in the `update_a_task` body, which can add or remove without replacing:

```json
{"tags": [{"add": [{"id": "1752587000000512003"}], "remove": [{"id": "1752587000000512007"}]}]}
```

Send either a plain array of tag objects or one add/remove object, never both. Full task update rules are in the `zoho-projects-tasks` skill. Issues take a plain `tags` array on update (see the `zoho-projects-issues` skill).

## Before Any Change

- Read the record's current tags and show old and new lists side by side. Say that `associate_tags_to_entity` drops any tag not in the list.
- Resolve every tag ID with `get_all_tags`. If a tag the user names does not exist, offer to create it (see `tags-manage.md`) rather than guessing.
- For several records, list them and get one confirmation for the whole list before looping.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Other tags vanished after tagging | `associate_tags_to_entity` replaces the list | Resend the current tag IDs plus the new one |
| Code 6404 "Resource Not Found" on associate | Several entity IDs in `entity_id` | One record per call |
| Code 6404 on disassociate | IDs sent as JSON numbers and truncated | Send `tag_id` and `entity_id` as strings |
| Code 6500 "General Error" | `entityType` does not match the record | Use 5 for tasks; check the module code |
| 204 but no tag on the record | Unknown or deleted tag ID | Re-list tags and resend with a current ID |
| 404 `RESOURCE_NOT_FOUND` on untag | Tag is not on that record | Read the record's tags first |
