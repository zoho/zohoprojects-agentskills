# Users

How to look up users and the current user, and which user ID each field takes. General ID rules are in `api-conventions.md`.

## ZPUID vs ZUID

Each user has two IDs:

| ID | Scope | Where to read it |
|----|-------|------------------|
| ZPUID | Zoho Projects user ID within the portal | The `id` field of each user in `get_all_users_in_a_project` |
| ZUID | Global Zoho account ID | The `zuid` field in the same user object |

Fields accept one ID space each, and the wrong one usually returns 200 with zero rows instead of an error. For tasks: `owner`, `added_by_zpuid` and multi-user custom fields take the ZPUID; `created_by` and single-user custom fields take the ZUID. The module skill states the rule for each field; when a field is not documented, check its type with `get_fields` and test with a known user before trusting an empty result.

## Current User

1. Call `get_current_user_details` with the portal_id.
2. To get the current user's ZPUID, find the same user (by email or zuid) in `get_all_users_in_a_project` and take its `id`.

```json
{"path_variables": {"portal_id": "60012345678"}}
```

Do not rely on the `current_login_user` filter macro to mean "me" on owner fields; see the module skill.

## Users in a Project

`get_all_users_in_a_project` (portal_id, project_id) requires two query params:
- `type`: 1 users, 2 client users, 3 client contacts.
- `view_type`: "1" active, "0" inactive. It is a string.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"type": 1, "view_type": "1", "page": 1, "per_page": 100}
}
```

Optional: `ids` (comma separated ZPUIDs), `company_ids` (comma separated client company IDs), `sort` as `field:asc` or `field:desc` with alphabetical, last_accessed_time, role, profile or added_time, and `filter` as a JSON object (not a string) with `criteria` and `pattern`.

`get_project_user_details` (portal_id, project_id, user_id) returns one user's details in that project.

## Users in a Portal

`get_all_users_in_a_portal` (portal_id) takes the same query params, with `type` and `view_type` required. Use it when the user is not tied to one project, for example to find a person before adding them to a project.

```json
{
  "path_variables": {"portal_id": "60012345678"},
  "query_params": {"type": 1, "view_type": "1", "sort": "alphabetical:asc", "per_page": 100}
}
```

`get_user_details` (portal_id, user_id) returns one portal user. Its `user_id` is described as the user's ID within the portal; take it from the `id` of a user list row.

## Finding a User by Name or Email

1. List users with the scope that fits (project or portal), `type` 1 and `view_type` "1".
2. Match on name or email. If several match, show them and ask.
3. Take the `id` (ZPUID) or `zuid` depending on the field being set or filtered.
4. If the person is not found among active users, check `view_type` "0" or client users (`type` 2) before telling the user they do not exist.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on user_id | Email or display name passed | Look the user up in a user list and pass the `id` |
| User list call rejected | `type` or `view_type` missing | Pass both; `view_type` is a string |
| Filter on a user field returns zero rows | ZUID passed where ZPUID is expected, or the reverse | Use the ID space the field expects, from the module skill |
| "My items" returns zero rows | `current_login_user` used on an owner field | Resolve the ZPUID and filter with `is` |
| Owner or assignee not accepted on a write | ZUID passed instead of ZPUID | Use the `id` from `get_all_users_in_a_project` |
| Person not found | Inactive user, client user or client contact | Retry with `view_type` "0" or `type` 2 or 3 |
| User list stops early | Only the first page was read | Request the next `page` until no more rows come back |
