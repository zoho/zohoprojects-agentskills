# Phase Basics

How to list, filter, sort and page through phases, and read a single phase.

## Phases and Milestones

Phases were called milestones in earlier versions of Zoho Projects. The names mean the same record, and some fields still carry the old name: tasks report their phase in `milestone`, and issues in `release_milestone` and `affected_milestone`. A phase ID can be used wherever one of those fields asks for an ID.

## Phase IDs

Portal and project IDs come from the `zoho-projects` skill (`references/portals-and-projects.md`). Take `phase_id` from a `get_project_phases` or `get_portal_phases` row, or from a create response. If a phase name matches more than one row, show the candidates with their IDs and dates and ask.

## Project vs Portal Listing

- `get_project_phases` (portal_id, project_id): use whenever the project is known.
- `get_portal_phases` (portal_id): phases from every project in the portal. Use it for cross-project questions such as "all phases ending this month".

Both take the same `query_params`: `page`, `per_page`, `sort_by`, `view_id`, `phase_ids` and `filter`.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {"page": 1, "per_page": 100, "sort_by": "ASC(end_date)"}
}
```

- `page` and `per_page` are both required. `per_page` defaults to 20 and is capped at 200.
- Keep requesting the next `page` while `page_info.has_next_page` is true.
- `phase_ids` is a comma-separated string of phase IDs. Use it to read several known phases in one call.

## Sorting

`sort_by` format: `ASC(field_name)` or `DESC(field_name)`, comma separated for several fields, for example `ASC(start_date),DESC(sequence)`.

Supported fields: id, name, start_date, end_date, status, sequence, created_time, last_updated_time. Use `ASC(sequence)` to show phases in the order the project shows them.

## Filters

`filter` is a JSON object, the same dialect as issue filters:
- `criteria`: array of `field_name`, `criteria_condition` and `value` (always an array). Custom fields can be referenced by `cfid` or `api_name` instead of `field_name`.
- `pattern`: 1-based indices joined with lowercase `and` / `or`. Required when there is more than one criterion.
- `between` and `not_between` take exactly 2 values.
- `relative_columns` (`cfid`, `offset`, `unit` of `days` or `hours`) for relative date comparisons on custom date fields.

```json
{
  "path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001"},
  "query_params": {
    "page": 1,
    "per_page": 100,
    "filter": {
      "criteria": [
        {"field_name": "status", "criteria_condition": "is", "value": ["1752587000000016045"]},
        {"field_name": "end_date", "criteria_condition": "between", "value": ["2026-11-01", "2026-11-30"]}
      ],
      "pattern": "1 and 2"
    }
  }
}
```

- Field names come from `get_fields` with the phases module. Resolve the module's API name or ID with `get_modules`; do not assume it.
- The tool's own example filters status by the label "Open". The rest of Zoho Projects takes option IDs for status. Prefer the status option ID from `get_options_list_for_a_field_in_module`; if that returns no rows where rows are expected, try the label and tell the user which form worked. This is unverified.
- Dates in filters are `YYYY-MM-DD`. Convert relative dates ("this month") to explicit dates and state them back.

General filter, field and option rules are in the `zoho-projects` skill, `references/api-conventions.md` and `references/fields-and-options.md`.

## Custom Views

`view_id` applies the criteria of a saved phase view. No tool in this set lists phase views; use a `view_id` only when the user gives one, and otherwise build a `filter`.

## Phase Details

`get_phase_details` (portal_id, project_id, phase_id) returns the full record: name, start and end dates, owner, status and its type, flag, tags, sequence, and budget fields when budgeting is on.

```json
{"path_variables": {"portal_id": "60012345678", "project_id": "1752587000000431001", "phase_id": "1752587000000431205"}}
```

To decide whether a phase is closed, read the type of its status, not its name. Status names are custom per portal.

Phase details do not list the phase's task lists or tasks. For those, call `get_all_project_task_lists` and match each list's phase, or list tasks (see the `zoho-projects-tasks` skill).

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Request fails on phase_id | Phase name passed | Find the phase in a list call and pass its `id` |
| List call rejected | `page` or `per_page` missing | Pass both |
| Results stop early | Only the first page was read | Follow `page_info.has_next_page` with increasing `page` |
| `sort_by` rejected | Unsupported field or missing `ASC(...)` / `DESC(...)` | Use one of the supported fields in that format |
| Filter rejected on pattern | Uppercase `AND` / `OR` carried over from a task filter | Use lowercase `and` / `or` |
| Filter rejected on shape | Filter sent as an escaped JSON string | Send a JSON object |
| Status filter returns zero rows | Label vs option ID mismatch | Try the option ID first, then the label; report which worked |
| Phase "missing" from the list | Phase is in another project, or the call was scoped to one project | Use `get_portal_phases`, or check the project |
