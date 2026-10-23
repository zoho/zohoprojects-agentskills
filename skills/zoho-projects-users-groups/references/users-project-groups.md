# Project Groups

Project groups organise projects in the portal. Public groups are visible to everyone; private groups are limited to chosen users and teams.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `get_all_project_groups` | portal_id | `data["project-groups"][]`: `id`, `name`, `type`, `prefix`, `sequence`, `associated_projects`, `is_default`, `has_edit_access` |
| `get_user_s_project_groups` | portal_id | Groups of the requesting user: `data["project-groups"][]` with `id` and `name` only |
| `create_project_group` | portal_id | Body: `name` (max 100), `type` (`public` / `private`), `prefix` (max 10), `users`, `teams` |
| `update_project_group` | portal_id, project_group_id | Only fields sent change |
| `delete_project_group` | portal_id, project_group_id | 204 with no body |
| `get_private_project_group_users` | portal_id, project_group_id | Private groups only |
| `get_private_project_group_teams` | portal_id, project_group_id | Private groups only |
| `associate_users_to_project_group` | portal_id, project_group_id | Body `user_ids` array |
| `associate_teams_to_project_group` | portal_id, project_group_id | Body `team_ids` array |
| `remove_a_user_from_project_group` | + user_id | |
| `remove_a_team_from_project_group` | + team_id | |

The response key is `project-groups` with a hyphen. Every portal has a default group "Ungrouped Projects" (`is_default: true`) that holds projects with no group.

## Create and Update

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "body": {"name": "Marketing", "type": "public", "prefix": "MKT"}
}
```

- Create and update return the group with `id`, `name`, `prefix`, `type`, `created_by`, `created_on`, `updated_by`, `updated_on`.
- `name` is not enforced as required: a create with only `type` succeeded and made a group with no name. Always send a name.
- Names are not unique. A second group with the same name is created without warning. Check `get_all_project_groups` first.
- In testing, `get_all_project_groups` showed `prefix: ""` for a group whose create response showed the prefix, while `update_project` and `get_project_detail` showed it on the project's `project_group`. Confirm a prefix from a project in the group, not from the group list.
- Rename and prefix change through `update_project_group` are verified.

## Moving Projects Between Groups

A group's projects are set on the project, not on the group. Use `update_project` with `project_group: {"id": "..."}` (see the `zoho-projects-projects` skill). `associated_projects` in the group list gives the count.

## Delete

- `delete_project_group` returns 204. Verified: projects in the deleted group move to "Ungrouped Projects"; they are not trashed.
- Before asking, tell the user how many projects are in the group (`associated_projects`) and that they will become ungrouped.
- Do not try to delete the default "Ungrouped Projects" group.

## Private Groups

Private groups must be enabled for the portal. When they are disabled, every private-group action returns 403 `PRIVATE_PROJECT_GROUP_FEATURE_RESTRICTION` "Private project groups have been disabled in your portal". Verified for: create with `type: "private"`, update to `type: "private"`, and all six user and team tools, even when called on a public group.

When you get this error, tell the user the feature is off for the portal and that a portal admin must enable it before these tools work. Do not retry.

Unverified, because private groups were disabled in the test portal: the response shapes of the four user and team association tools, whether `user_ids` take ZPUIDs, and the two list tools' paging. Take user IDs from `get_all_users_in_a_portal` (`id`) and read the group back with `get_private_project_group_users` after any change.

## Before Any Change

- Show the group name, ID, type and project count, and the exact change.
- For user or team changes, name each person or team and the group.
- Never update or delete a group the user did not name explicitly.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 403 PRIVATE_PROJECT_GROUP_FEATURE_RESTRICTION | Private groups disabled in the portal | Tell the user; an admin must enable the feature |
| 404 RESOURCE_NOT_FOUND on `group_id` | Wrong or deleted project_group_id | List groups and use a returned `id` |
| Group with no name created | `name` omitted | Delete it after confirming, then create again with a name |
| Duplicate group | Names are not unique | Search the list first |
| Prefix missing in the group list | List did not reflect the prefix in testing | Check `project_group.prefix` on a project in the group |
| Projects "disappeared" from a group | Group was deleted; projects moved to Ungrouped Projects | Move them to another group with `update_project` |
