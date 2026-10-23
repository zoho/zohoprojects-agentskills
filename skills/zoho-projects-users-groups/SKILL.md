---
name: zoho-projects-users-groups
description: "Zoho Projects project membership and project groups: add portal users or client users to a project with a role and profile, look up a user's project role and profile, list portal profiles and roles, create, rename, re-prefix and delete project groups, list all groups or my groups, add or remove users and teams on private project groups. Use for add Priya to this project, give a user the Manager profile in a project, which profile or role IDs exist, what is my role in this project, create a project group, rename the group, delete a group, who is in this private group, PRIVATE_PROJECT_GROUP_FEATURE_RESTRICTION, RESOURCE_NOT_FOUND on group_id, role_id or profile_id rejected. Requires the ZohoProjects_* MCP tools."
metadata:
  version: "1.0.0"
---

## How It Works

1. Check that the ZohoProjects_* MCP tools are available. If they are not, stop and load the `zoho-projects` skill for connection setup.
2. Resolve IDs in order: portal_id, then project_id or project_group_id, then user, role, profile or team IDs. IDs are digit strings, never names or emails (except `email_id` when adding a user). Only use IDs returned by a tool in this session or given by the user. To find a person or tell ZPUID from ZUID, follow the `zoho-projects` skill, `references/users.md`; to pick the project, `references/portals-and-projects.md`.
3. Route to the reference that matches the request:
   - Adding users or client users to a project, a user's project role and profile, portal profiles and roles: `references/users-project-members.md`
   - Project groups, moving projects between groups, private group users and teams: `references/users-project-groups.md`
4. Before any add, create, update, associate, remove or delete, show the user exactly what will change (project or group name and ID, user name and email, role, profile) and wait for explicit confirmation. Adding a person to a project gives them access to its data; name the person and the project explicitly. Only add people who are already portal users unless the user explicitly asks to invite a new email.
5. After a write, confirm the result: `get_all_users_in_a_project` or `get_project_user_details` for members, `get_all_project_groups` for groups. Several write tools return 204 with no body.

## Triggers

Use this skill for:
- "add Priya to the Website project", "add our client contact to this project", "make Arun a manager in this project"
- "what role does this user have in the project", "what is my profile here", "list the portal profiles", "which roles exist"
- "create a project group", "rename the Marketing group", "change the group prefix", "delete this project group", "which groups am I in"
- "move this project into a group" (the move itself is `update_project`; see the `zoho-projects-projects` skill)
- "who is in this private group", "add the Design team to the private group", "remove a user from the group"
- `PRIVATE_PROJECT_GROUP_FEATURE_RESTRICTION`, 404 `RESOURCE_NOT_FOUND` on `group_id`, role or profile ID rejected, user added but not visible in the project

## References

| Reference | Load when the query is about... |
|-----------|---------------------------------|
| `references/users-project-members.md` | `add_users_to_a_project`, `add_client_user_to_a_project`, `get_project_user_details`, `get_user_details`, `list_portal_profiles`, `list_portal_roles` |
| `references/users-project-groups.md` | `create_project_group`, `update_project_group`, `delete_project_group`, `get_all_project_groups`, `get_user_s_project_groups`, private group user and team tools |
