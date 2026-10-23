# Task Dependencies

How to add, change, remove and read predecessor/successor links between tasks with `add_task_dependency`, `update_task_dependency` and `delete_task_dependency`.

## Identity

There is no dependency ID. A dependency is identified by its `predecessor_task.id` and `successor_task.id` pair, and update and delete must send that same pair to locate the record. Both tasks must belong to the project in the path.

## Parameters

All three tools take the same shape:

- `path_variables`: `portal_id`, `project_id`.
- `body` (required on every call, including delete):
  - `predecessor_task.id`: the task that must happen first.
  - `successor_task.id`: the task that depends on it.
  - `dependency_type`: FS, SS, SF, FF or AutoSet.
- Optional:
  - `link_type`: "0" hard, "1" soft.
  - `lag`: `{"type": "<unit>", "value": "<amount>"}`, for example type "hrs", to add a delay between the two tasks.

"Task B is blocked by task A" means A is the predecessor and B is the successor. Confirm the direction with the user when it is ambiguous, using task names and IDs.

## add_task_dependency

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "predecessor_task": {"id": "1752587000000440021"},
    "successor_task": {"id": "1752587000000440035"},
    "dependency_type": "FS",
    "link_type": "0",
    "lag": {"type": "hrs", "value": "8"}
  }
}
```

The response echoes the predecessor, successor and dependency_type that were sent. That confirms the request was accepted, not the resulting task state; verify with `get_task_details`.

## update_task_dependency

Use it to change the dependency type or adjust the lag. Send the original pair plus the fields to change:

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "predecessor_task": {"id": "1752587000000440021"},
    "successor_task": {"id": "1752587000000440035"},
    "dependency_type": "SS"
  }
}
```

## delete_task_dependency

Removes the link and unblocks the successor. A request body is required even though the HTTP method is DELETE:

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "predecessor_task": {"id": "1752587000000440021"},
    "successor_task": {"id": "1752587000000440035"},
    "dependency_type": "FS"
  }
}
```

## Reading Dependencies

There is no list-dependencies operation and no bulk dependency read. To read a task's links, call `get_task_details` and inspect `dependency_info`, which holds `predecessor` and `successor` arrays. Task IDs inside dependency responses come back as integers; convert them to strings before reusing them in a request.

To map dependencies across many tasks, call `get_task_details` per task. Tell the user how many calls this needs before starting on a large project.

## Finding Blocked Tasks

The task list filters accept a `dependency_status` field. Its value must be a numeric code; a label such as "blocking tasks" returns 500. The schemas do not list the codes, so do not guess one. If the code is unknown, fall back to reading `dependency_info` on the candidate tasks, or ask the user for the code. Filter rules are in `tasks-filters.md`.

## Before Any Change

Show the user the predecessor (name and ID), successor (name and ID), dependency_type, link_type and lag, and wait for confirmation. For delete, also say which task becomes unblocked.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Update or delete does not find the dependency | Pair sent does not match the original predecessor and successor | Read `dependency_info` from `get_task_details` and send the exact pair |
| Request rejected for missing fields | `dependency_type` or one task omitted, including on delete | Always send predecessor_task, successor_task and dependency_type |
| Request rejected across projects | Tasks are in different projects | Both tasks must belong to the project in the path |
| Invalid dependency_type | Value outside the enum | Use FS, SS, SF, FF or AutoSet |
| Invalid link_type | Boolean or word sent | Use "0" (hard) or "1" (soft) |
| Dependency state unclear after add | Response only echoes the request | Confirm with `get_task_details` |
| 500 on dependency_status filter | Label passed instead of numeric code | Use the numeric code, or read `dependency_info` instead |
