# Task List Basics

How to resolve task list IDs, list and filter task lists, and read a single list.

## ID Resolution Order

1. `portal_id` and `project_id`: see the `zoho-projects` skill (`references/portals-and-projects.md`).
2. Task list ID: take the `id` from a `get_all_project_task_lists` row, or from a create or clone response.

- Every task list tool names this path variable `tasklists_id` (plural), not `tasklist_id`.
- A name or other non-digit value in a path variable returns 400 `URL_RULE_NOT_CONFIGURED` "Given URL is wrong", not a "not found".
- Names are not unique. Two lists in one project can share a name, and a clone always reuses the source name. When a name matches several rows, show each with its `id`, phase and `created_time` and ask.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_all_project_task_lists` | portal_id, project_id | Use whenever the project is known. Default `per_page` 200, default sort `DESC(milestone_sequence),ASC(id)` |
| `get_task_lists_by_portal` | portal_id | Every project in the portal. Default sort `DESC(created_time),DESC(id)`. Group rows by `project.id` |
| `get_task_list_details` | portal_id, project_id, tasklists_id | One list. No task counts and no comment text |

Both list tools take `query_params`: `filter`, `view_id`, `page`, `per_page`, `sort_by`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"page": 1, "per_page": 100, "sort_by": "DESC(created_time)"}
}
```

## Paging and Sorting

- `per_page` is capped at 200. Follow `page_info.has_next_page`. Do not use `page_info.page_count`; it was seen as 2 on a single complete page and as 0 on an empty result.
- `sort_by` fields: `id`, `flag`, `milestone_sequence`, `project_sequence`, `created_time`, `last_modified_time`. The response echoes `sort_by` in `page_info` even for a field outside this list, where the sort is not applied.

## Filters

`filter` is a JSON object (not a string, unlike task filters). `pattern` uses uppercase `AND` / `OR`; lowercase returns 400 `PATTERN_NOT_MATCHED` on `pattern`. Up to 10 criteria; `value` is always an array.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {
    "filter": {
      "criteria": [
        {"field_name": "name", "criteria_condition": "starts_with", "value": ["Release"]},
        {"field_name": "status", "criteria_condition": "is", "value": ["active"]}
      ],
      "pattern": "1 AND 2"
    }
  }
}
```

| Field | Conditions | Value |
|-------|-----------|-------|
| `name` | is, is_not, contains, not_contains, starts_with, ends_with | Text |
| `id` | is, is_not | Task list ID |
| `flag` | is, is_not | `internal` or `external` |
| `status` | is, is_not | `active` or `completed` (confirmed live) |
| `tags` | is, is_not | Tag ID |

A field that is not filterable, such as `created_time`, returns 200 with zero rows rather than an error. Do not report "no lists" from such a filter; drop the criterion and filter the rows yourself.

## Reading a Row

Rows from both list tools carry:
- `id`, `name`, `flag`, `status` (`active` or `completed`), `created_time`, `last_updated_time`, `created_by.zpuid`.
- `milestone` (`id`, `name`): the phase. A list with no phase reports `name: "None"` and a portal-wide sentinel ID; `meta_info.is_none_milestone_tasklist` is true.
- `sequence.milestone_sequence` and `sequence.project_sequence`.
- `meta_info`: `is_general` (the default General list), `is_completed`, `has_comments`, `is_rolled`.
- `meta_info.count_info`: `open_task_count`, `closed_task_count`, `filtered_task_count`. Only list rows have this; `get_task_list_details` does not.
- `project.id` (and usually `project.name`).

To answer "how many tasks are in each list", read `count_info` from one list call instead of listing tasks per list. To list the tasks themselves, filter tasks on `tasklist_id` (see the `zoho-projects-tasks` skill); filtering tasks on `tasklist` (the name) fails.

## Task List Details

```json
{"path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "tasklists_id": "1752587000000431107"}}
```

Fields with no value are omitted. To decide whether a list is finished, read `status` or `meta_info.is_completed`, not the name.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 `URL_RULE_NOT_CONFIGURED` "Given URL is wrong" | Name or other non-digit value in `project_id` or `tasklists_id` | Resolve the digit ID from a list call |
| 400 `PATTERN_NOT_MATCHED` on `pattern` | Lowercase `and` / `or` | Use uppercase `AND` / `OR` |
| Filter returns zero rows unexpectedly | Unsupported filter field, accepted silently | Use only the fields in the table above |
| Sort has no effect | Field outside the supported list | Use a supported `sort_by` field |
| Two lists with the same name | Names are not unique; clones reuse the source name | Show both with IDs and ask |
| Task counts missing | `get_task_list_details` has no `count_info` | Read `count_info` from a list call |
| List seems to be missing | It is in another project, or it was trashed | Use `get_task_lists_by_portal`, or check trash with `get_trashed_records` |
