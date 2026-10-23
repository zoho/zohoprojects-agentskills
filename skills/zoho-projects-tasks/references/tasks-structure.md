# Task Structure and History

Subtasks, cloning, moving between task lists, ordering within a list, and status change history.

## Subtasks

- A subtask is a task with `parental_info.parent_task_id` set. `parent_task_id` is the immediate parent; `root_task_id` is the top-level ancestor. `depth` gives the level in the hierarchy.
- Create a subtask with `create_a_task` and `parental_info.parent_task_id` in the body. The same key can be sent with `update_a_task` to make an existing task a subtask.
- `association_info.has_subtasks` in `get_task_details` tells you whether a task has children.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {"name": "Draft changelog section", "parental_info": {"parent_task_id": "1752587000000440021"}}
}
```

## clone_a_task

Creates 1 to 6 copies of a task in the same project and the same task list.

- `path_variables`: `portal_id`, `project_id`, `task_id`.
- `query_params.no_of_instances`: required, integer 1 to 6. It is a query parameter, not a body field.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "task_id": "1752587000000440021"},
  "query_params": {"no_of_instances": 2}
}
```

- Copies keep the source's name, description, status, schedule, owners, priority and billing type. They cannot be renamed or retargeted at creation; tell the user the copies will share the original name.
- Cloning into another project is not supported. Use `move_task` afterwards to relocate a copy to another list.
- The response contains only the new IDs as `{"tasks":[{"id":"..."}]}`. Call `get_task_details` for anything else, and `update_a_task` to rename a copy.
- Cloning a subtask returns 403 CANT_COPY_SUBTASK.

## move_task

Moves a task to a different task list.

- `path_variables`: `portal_id`, `project_id`, `task_id`.
- `body.target_tasklist_id`: required. Get it from `get_all_project_task_lists`.
- `body.status_mapping`: only needed when the destination layout lacks the task's current status. Each item has `old_status.id` and `new_status.id` from that layout.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "task_id": "1752587000000440021"},
  "body": {"target_tasklist_id": "1752587000000431125"}
}
```

- The move reassigns the task's phase to the destination list's phase. Moving into a list with no phase clears `milestone` to "None" without warning. Check the destination list's phase in `get_all_project_task_lists` first and tell the user if the phase will change.
- The response is a bare success acknowledgement. Confirm with `get_task_details`.

## reorder_tasks

Changes a task's position within its task list.

- `path_variables`: `portal_id`, `project_id`, `task_id`.
- `body`: provide exactly one of:
  - `before`: ID of the task this one should be placed before.
  - `after`: ID of the task this one should be placed after.
  - `position`: "first" or "last". Applies only to top-level tasks; no effect on subtasks.
- `before` and `after` take precedence over `position`. With none of them, the task keeps its position.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "task_id": "1752587000000440021"},
  "body": {"position": "first"}
}
```

To show the current order, list tasks with `sort_by` `ASC(sequence)` (or `ASC(subtask_sequence)` for subtasks).

## get_status_timeline

Returns a task's status change history as a `result` array, newest change last.

- `path_variables`: `portal_id`, `project_id`, `task_id`. Optional `query_params`: `page`, `per_page`.
- Each entry holds `previous_status`, `updated_status`, `updated_on` and `updated_by`.
- Every task has at least one entry, recorded at creation, whose `previous_status.name` is "-".
- Entries after the first also carry a `duration` object giving the time spent in the previous status.
- The ID inside `updated_status` is an entry-level identifier and does not match the status ID from `get_task_details`. Match on status name or `is_closed` instead.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "task_id": "1752587000000440021"},
  "query_params": {"per_page": 50}
}
```

Use it for questions such as "when was this task closed" or "how long was it in review".

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 403 CANT_COPY_SUBTASK | `clone_a_task` called on a subtask | Clone the parent, or create a new task with the same parent |
| Clone call invalid | `no_of_instances` sent in body, missing, or outside 1 to 6 | Send it in `query_params` as an integer 1 to 6 |
| Copies have the same name as the source | Clones always inherit the name | Rename each copy with `update_a_task` after cloning |
| Copy needed in another project | Cross-project clone is not supported | Create a new task in the target project with `create_a_task` |
| Task lost its phase after a move | Destination list has no phase | Check the destination list's phase before moving; pick a list in the right phase |
| Status problem on move | Destination layout lacks the current status | Send `status_mapping` with old and new status IDs |
| `position` had no effect | Task is a subtask, or `before` / `after` also sent | Use `before` or `after` for subtasks; send only one placement key |
| Timeline status ID does not match task status | Timeline IDs are entry-level identifiers | Match on name or `is_closed` |
| First timeline entry shows "-" | Creation entry has no previous status | Treat it as the creation record |
