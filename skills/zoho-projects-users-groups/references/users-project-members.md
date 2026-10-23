# Project Members, Roles and Profiles

How to add people to a project and read their role and profile. Finding a user and the ZPUID vs ZUID rules are in the `zoho-projects` skill, `references/users.md`.

## Tools

| Tool | Path variables | Notes |
|------|----------------|-------|
| `list_portal_roles` | portal_id | `data.roles[]`: `id`, `name`, `type`, `is_primary` |
| `list_portal_profiles` | portal_id | `data.profiles[]`: `id`, `name`, `type`, `is_default`, `is_primary` |
| `get_user_details` | portal_id, user_id | One portal user with `role`, `profile`, `zuid`, `id` (ZPUID) |
| `get_project_user_details` | portal_id, project_id, user_id | One project member, including `project_profile` |
| `add_users_to_a_project` | portal_id, project_id | Portal users; `userdetails` required |
| `add_client_user_to_a_project` | portal_id, project_id | Client users; same body shape |

Both list tools take `page`, `per_page` (max 200, default 20), `ids` and `sort_by` as `ASC(name)` or `DESC(created_time)`. Both return `page_info` with `has_next_page`.

## Roles vs Profiles

- A role is the user's job label in the portal (for example Employee, Manager, Administrator, Contractor).
- A profile sets permissions (for example Employee, Manager, Admin, Contractor, Client, Project Owner). Profile `type` identifies the built-in kind: in testing `"3"` was Client, `"7"` Employee, `"6"` Manager, `"2"` Admin, `"8"` Contractor, `"9"` Project Owner, `"1"` Portal Owner. A custom profile showed `"0"`, and a custom client profile also showed `"3"`.
- Use a client-type profile (`type: "3"`) with `add_client_user_to_a_project`, and a non-client profile with `add_users_to_a_project`.
- Role and profile IDs are per portal. Never reuse one from another portal.

## Reading a User

- `get_user_details` accepted both the ZPUID and the ZUID as `user_id` in testing and returned the same user. Prefer the ZPUID (`id` from `get_all_users_in_a_portal`).
- `get_project_user_details` returns the user's portal `profile` and their `project_profile` in that project, plus `role`, `added_time` and `budget`. Use `project_profile` to answer "what can this person do in this project".
- To check whether someone is already in a project, list `get_all_users_in_a_project` with `type` 1 (or 2 for client users) and `view_type` "1", and match on email.

## Adding Users

`userdetails` is a string holding a JSON array, not an array. Each item needs `email_id`, `role_id` and `profile_id`; optional `rate`, `cost_rate_per_hour`, `cost_budget`, `budget_threshold`, `revenue_budget` as strings. `notify` (boolean) controls the invitation email.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "body": {
    "notify": false,
    "userdetails": "[{\"email_id\":\"priya@example.com\",\"role_id\":\"1752587000000059009\",\"profile_id\":\"1752587000000059371\"}]"
  }
}
```

Unverified: neither add tool was run during testing, so the response shape and errors are not confirmed. After an add, confirm with `get_all_users_in_a_project` and report which users appear. Unverified: whether an email that is not yet a portal user is invited to the portal; do not send new emails unless the user explicitly asks to invite that person.

## Before Any Change

- Confirm the person by name and email from a user list, the project by name and ID, and the role and profile by name and ID.
- Ask whether the person should get an email (`notify`). Default to asking rather than assuming.
- Adding a user grants access to the project's tasks, issues, documents and comments. Adding a client user exposes whatever the client profile allows; say so.
- Check first that the person is not already a member, so the add is not a silent no-op.

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on `user_id` | Email or name passed | Look the user up and pass the `id` |
| `userdetails` rejected | Sent as an array instead of a JSON string | Serialise the array to a string |
| Role or profile rejected | Name used, or ID from another portal | Take IDs from `list_portal_roles` and `list_portal_profiles` |
| Client user added with the wrong access | Non-client profile used, or the reverse | Match the profile type to the tool |
| User not in the project list after adding | Inactive user, client user listed under `type` 2, or the add failed | Recheck with `type` 2 and `view_type` "0"; report what the list shows |
| List stops early | Only the first page read | Follow `page_info.has_next_page` |
