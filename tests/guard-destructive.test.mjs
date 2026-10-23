import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DESTRUCTIVE_TOOL_PATTERN, evaluate } from '../scripts/guard-destructive.mjs';

// Zoho Projects MCP tools are named ZohoProjects_<action>; hosts may add a
// namespace prefix in front (Claude: mcp__plugin_zoho-projects_mcp__).
const DESTRUCTIVE_ACTIONS = [
  'delete_issue',
  'delete_a_task',
  'delete_or_disassociate_bulk_options',
  'trash_project',
  'trash_record',
  'remove_follower',
  'remove_a_user_from_project_group',
  'add_or_remove_followers',
  'disassociate_tags_from_entity',
  'dissociate_task_from_issue',
  'unlink_issues',
  'deactivate_a_module',
  'move_entities_to_trash',
];

const SAFE_ACTIONS = [
  'get_tasks_by_project',
  'get_trashed_records',
  'restore_entities_from_trash',
  'create_a_task',
  'update_a_task',
];

const PREFIXES = ['', 'mcp__plugin_zoho-projects_mcp__', 'mcp__idc_tools__'];

const zohoNames = (actions) =>
  actions.flatMap((action) => PREFIXES.map((prefix) => `${prefix}ZohoProjects_${action}`));

test('flags destructive Zoho Projects tools, with and without a host prefix', () => {
  for (const name of zohoNames(DESTRUCTIVE_ACTIONS)) {
    assert.equal(DESTRUCTIVE_TOOL_PATTERN.test(name), true, name);
    const result = evaluate({ tool_name: name }, 'claude');
    assert.equal(result.decision, 'ask', name);
    assert.match(result.reason, /Zoho Projects/);
    assert.ok(result.reason.includes(name), name);
  }
});

test('leaves read and non-destructive Zoho Projects tools alone', () => {
  for (const name of zohoNames(SAFE_ACTIONS)) {
    assert.equal(DESTRUCTIVE_TOOL_PATTERN.test(name), false, name);
    assert.deepEqual(evaluate({ tool_name: name }, 'claude'), {}, name);
  }
});

test('ignores destructive tools from other servers', () => {
  for (const name of [
    'delete_issue',
    'mcp__github__delete_file',
    'mcp__sheet__ZohoSheet_delete_row',
    'mcp__lz_tools__ZohoProjectsLZ_delete_issue',
    'remove_file',
  ]) {
    assert.equal(DESTRUCTIVE_TOOL_PATTERN.test(name), false, name);
    assert.deepEqual(evaluate({ tool_name: name }, 'claude'), {}, name);
  }
});

test('returns an empty result when the event has no usable tool name', () => {
  for (const event of [undefined, null, {}, 'ZohoProjects_delete_issue', 42, [], { tool_name: 7 }, { tool_name: '' }]) {
    assert.deepEqual(evaluate(event, 'claude'), {});
    assert.deepEqual(evaluate(event, 'antigravity'), {});
  }
});
