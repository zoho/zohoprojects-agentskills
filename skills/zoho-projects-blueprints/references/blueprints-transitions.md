# Blueprints

How to find the blueprint that governs a task, read its stages, and move a task through it. The blueprint tools accept only `module_name` `Task`. They read and run blueprints; they do not create or edit them.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_blueprints_list` | portal_id | `query_params.module_name` `Task` required; `page`, `per_page` |
| `preview_blueprint` | portal_id, blueprint_id | Full statuses and transitions |
| `get_next_transitions` | portal_id | `query_params.entity_id` and `module_name` `Task` required |
| `get_transition_during_data` | portal_id, blueprint_id, transition_id | `query_params.entity_id` required; fields the transition asks for |
| `execute_blueprint_transition` | portal_id, blueprint_id, transition_id | Body: `entity_id`, `field_values` |
| `get_issue_status_transition` | portal_id, project_id, issue_id | Status change history of an issue |

## Which Tasks a Blueprint Covers

A blueprint is attached to a task layout. `get_blueprints_list` returns `data.blueprints` and `data.page_info`; each blueprint has `id`, `name`, `is_enabled`, `is_published`, `sequence` and `layout_details` (`layout_id`, `layout_name`). A task falls under a blueprint only when its project uses that task layout. To check a project, find its task layout with `get_layout_list` (module `tasks`, `filter.is_association_info_needed` true) and compare with `layout_details`; see the `zoho-projects-layouts-fields` skill. Several blueprints can share one layout.

When no blueprint covers the task, `get_next_transitions` and `get_transition_during_data` return 403 "Entity not mapped with any Blueprint". Tell the user the status can be changed directly with the task tools.

## Preview

`preview_blueprint` returns `data` with `name`, `layout_id`, `status_details` and `transition_details`.
- `status_details`: `status_id`, `status_name`, `is_start`, `is_closed`, `is_default`.
- `transition_details`: `transition_id`, `transition_name`, `status_from`, `status_to`, `is_global_transition`, `is_applied_to_all`, `is_parallel_transition`. The entry with `transition_id` "-1" and `status_from` "-1" is the entry point into the start status, not a real transition; skip it.
- `transition_position`, `from_port` and `to_port` are diagram coordinates; ignore them.

To show the path to closure, start from the task's current status and follow `status_from` to `status_to` until a status with `is_closed` true. A blueprint ID that does not exist returns 404 `RESOURCE_NOT_FOUND` "Resource Not Found".

## Next Transitions

```json
{"path_variables": {"portal_id": "60012345678"}, "query_params": {"entity_id": "1752587000000600137", "module_name": "Task"}}
```

The tool description warns that the `blueprint_id` in this response may be wrong due to rounding. Always take the blueprint ID from `get_blueprints_list` and only the `transition_id` from this response. Unverified: the success response shape was not seen live, because no test task was under a blueprint.

## Executing a Transition

1. Call `get_transition_during_data` with the blueprint ID, the transition ID and the task as `entity_id`. It lists the fields the transition asks for and which are mandatory.
2. Collect every mandatory value from the user. Resolve user fields to ZPUIDs and picklist values to option IDs first.
3. Show the full change and get confirmation.
4. Execute:

```json
{
  "path_variables": {"portal_id": "60012345678", "blueprint_id": "1752587000000301007", "transition_id": "1752587000000301017"},
  "body": {
    "entity_id": "1752587000000600137",
    "field_values": [{"id": "1752587000000005125", "value": ["1752587000000097003"]}]
  }
}
```

- `field_values[].id` is the field ID from `get_fields`; `value` is always an array. `attachment_ids` and `is_days` are optional per field.
- `skip_bug_validation` true skips the check on associated issues.

Unverified: execution, the during-data response and execution errors were not tested live; no blueprint applied to a task that could be changed safely. Report the exact error text back to the user if a call fails.

## Issue Status History

`get_issue_status_transition` (portal_id, project_id, issue_id) lists an issue's past status changes. It is read-only history, not a blueprint action. Unverified: response shape not checked live.

## Before Any Change

- Read the task with `get_task_details` and confirm its current status matches the transition's `status_from`.
- Show the transition name, the target status and every field value, and wait for confirmation.
- Execute one transition per confirmation. Re-read next transitions before the next step.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 403 "Entity not mapped with any Blueprint" | The task's project does not use a layout with a blueprint | Change the status with the task tools instead |
| 404 `RESOURCE_NOT_FOUND` on preview | Wrong blueprint ID | Take the ID from `get_blueprints_list` |
| Wrong blueprint in a follow-up call | `blueprint_id` copied from `get_next_transitions` | Use the ID from `get_blueprints_list` |
| `module_name` rejected (unverified) | A value other than `Task` | Only tasks are supported by these tools |
| Transition rejected (error text unverified) | A mandatory during-transition field was not sent | Call `get_transition_during_data` and send every mandatory field |
