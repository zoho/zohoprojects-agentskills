---
name: zoho-projects-blueprints
description: "Zoho Projects blueprints: list the task blueprints in a portal, preview a blueprint's statuses and transitions, find the next transitions available on a task, read the fields a transition asks for, execute a transition, and read an issue's status transition history. Use for which blueprint applies to this task, what is the next step, move the task to the next stage, path to closure, why can I not change the status, transition needs mandatory fields, Entity not mapped with any Blueprint, transition rejected. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then the task (entity_id) from the `zoho-projects-tasks` skill, then blueprint_id from `get_blueprints_list`, then transition_id from `get_next_transitions` or `preview_blueprint`. IDs are digit strings, never names. Only use IDs returned by a tool in this session or given by the user.
3. Load `references/blueprints-transitions.md` for every request. It covers which tasks a blueprint applies to, previewing, next transitions, during-transition fields, executing a transition and issue status history.
4. Executing a transition changes the task's status and may set fields and run automations. Before executing, show the user the task, its current status, the transition name, the target status and every field value that will be submitted, and wait for explicit confirmation. Never execute a transition on inference alone, and never chain several transitions behind one confirmation.
5. After a transition, confirm the new status with `get_task_details` and call `get_next_transitions` again to show what comes next.

## Triggers

Use this skill for:
- "which blueprints do we have", "show the blueprint for this layout", "what are the stages of this blueprint"
- "what can I do next on this task", "move this task to the next stage", "what does it take to close this task"
- "why can I not change the status of this task", "the transition asks for fields"
- "execute the Approve transition", "run the next blueprint step"
- "status history of this bug", "who moved this issue to Closed"
- 403 "Entity not mapped with any Blueprint", 404 `RESOURCE_NOT_FOUND` on a blueprint, transition rejected for missing fields, status change blocked on a task under a blueprint

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/blueprints-transitions.md` | Blueprint list and preview, layout scope, next transitions, during-transition data, executing transitions, issue status transition history |
