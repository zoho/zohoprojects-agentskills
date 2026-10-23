# Issue Links and Task Associations

How to link issues to each other and associate issues with tasks, read those links, and remove them.

## Issue-to-Issue Links

### Reading Links

`get_linked_issues` (portal_id, project_id, issue_id) returns every issue linked to one issue. Each row has an `id`, the linked issue's `name`, `link_type` and `project.id`.

`change_issue_link_type` and `unlink_issues` need a `link_id`, which the tool schema says to take from the `id` field of this response. The same schema also describes that `id` as the linked issue's ID, so the two may differ in practice. If the row carries a separate link identifier, use that; if a call with the row `id` fails, tell the user rather than retrying with other IDs. Linked issues can sit in other projects; use the row's `project.id` when reading them.

### Link Types

`link_type` is a name such as "duplicates", "blocks" or "is blocked by", not an ID. Link types are configured per project, and no issue tool lists them. To pick a valid name:
1. Read `link_type` values from `get_linked_issues` on issues in the same project that already have links.
2. If none exist, ask the user for the exact link type name as it appears in their project settings.

Never invent a link type. Direction matters: "A blocks B" and "A is blocked by B" are different links. Confirm the direction with the user using issue names and IDs.

### bulk_link_issues

Creates links from every source issue to every target issue with one link type. Use it for one pair as well; there is no separate single-link tool.

- `path_variables`: `portal_id`, `project_id`.
- `body`: `link_type` (name), `issue_ids` (source issues, up to 100), `linking_issue_ids` (target issues, up to 100). All three are required.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "link_type": "duplicates",
    "issue_ids": ["1752587000000450013"],
    "linking_issue_ids": ["1752587000000450027"]
  }
}
```

Every source is linked to every target, so 3 sources and 4 targets create 12 links. State the full count to the user before sending.

### change_issue_link_type

Changes the type of an existing link.

- `path_variables`: `portal_id`, `project_id`, `issue_id`, `link_id` (from `get_linked_issues`).
- `body.link_type`: required, the new link type name. `body.issue_ids` is optional.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "issue_id": "1752587000000450013", "link_id": "1752587000000462001"},
  "body": {"link_type": "blocks"}
}
```

### unlink_issues

Removes one link. `path_variables`: `portal_id`, `project_id`, `issue_id`, `link_id`. No body. Read the link with `get_linked_issues` first and tell the user which two issues will no longer be linked.

## Issue-to-Task Associations

An association records that a task implements or fixes an issue. Both the issue and the tasks must be in the project in the path.

### Reading Associations

| Tool | Use when |
|------|----------|
| `get_associated_tasks_of_issue` (portal_id, project_id, issue_id) | Tasks of one issue. Offset paging with `sindex` (start index, for example "0") |
| `get_issue_tasks` (portal_id, project_id, issue_id) | Tasks of one issue, no paging parameters. Use for a quick read of an issue with few tasks |
| `get_associated_tasks_by_issue_ids` (portal_id) | Tasks of many issues in one call. `issue_ids` (1 to 100, required), `page`, `per_page`. Prefer it over a loop of per-issue calls |

Each row has the task `id` and `name`. For the task's details, call `get_task_details` (see the `zoho-projects-tasks` skill). From the task side, `get_associated_bugs` lists the issues of one task.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"issue_ids": ["1752587000000450013", "1752587000000450027"], "page": 1, "per_page": 100}
}
```

### Adding Associations

| Tool | Body | Use when |
|------|------|----------|
| `associate_tasks_to_issue` (portal_id, project_id, issue_id) | `task_ids`, up to 100 | Several tasks to one issue |
| `associate_issue_tasks` (portal_id, project_id, issue_id) | `task_ids`, up to 100 | Same request shape and purpose. Pick one of the two; never send the same association through both |
| `bulk_associate_tasks` (portal_id, project_id) | `issue_ids` and `task_ids`, up to 100 each | Several tasks to several issues |

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "issue_id": "1752587000000450013"},
  "body": {"task_ids": ["1752587000000440021", "1752587000000440035"]}
}
```

`bulk_associate_tasks` associates every listed task with every listed issue. State the full set of pairs to the user before sending.

Confirm the result with one of the read tools; the write tools do not return the resulting set.

### Removing an Association

`dissociate_task_from_issue` (portal_id, project_id, issue_id, task_id) removes one task from one issue. No body. To remove several, call it once per pair after the user approves the full list. From the task side, `disassociate_bug` does the same.

Permanently deleting an issue with `delete_issue` also removes all its task associations.

## Before Any Change

Show the user, by name and ID, the issues and tasks involved, the link type and its direction, and for bulk calls the total number of links or associations created. For removals, say which link or association goes away.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Link rejected on link_type | Name not configured in the project, or an ID sent | Use a link type name already in use in the project, or ask the user |
| Link created in the wrong direction | Source and target swapped | Unlink, then link again with `issue_ids` and `linking_issue_ids` swapped |
| More links than expected | `bulk_link_issues` links every source to every target | Send one source and the exact targets |
| Request fails on link_id | Linked issue ID passed where the link ID is expected | Look for a separate link identifier in the `get_linked_issues` row; if there is none, tell the user |
| `bulk_link_issues` rejected | `link_type`, `issue_ids` or `linking_issue_ids` missing, or more than 100 IDs | Send all three; split larger sets |
| Association rejected | Task or issue in another project | Both must be in the project in the path |
| `get_associated_tasks_by_issue_ids` rejected | `issue_ids` missing or more than 100 | Send 1 to 100 issue IDs |
| Association list stops early | Only the first page or first `sindex` window read | Page with `page` or advance `sindex` until no more rows come back |
| Association state unclear after a write | Write tools return no resulting set | Read back with `get_associated_tasks_of_issue` |
