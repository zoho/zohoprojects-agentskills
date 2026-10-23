import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  DEFAULT_HOST,
  HOSTS,
  evaluate,
  formatOutput,
  getToolName,
  parseHost,
} from '../scripts/guard-destructive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'guard-destructive.mjs');

// Antigravity PreToolUse payload for an MCP call, as captured from agy 1.4.6.
const antigravityEvent = (toolName) => ({
  conversationId: 'b956f75b-7da3-48c3-bcda-5ec23cfaa1c3',
  stepIdx: 4,
  toolCall: {
    name: 'call_mcp_tool',
    args: { ServerName: 'zoho-projects_mcp', ToolName: toolName, Arguments: { issue_id: '42' } },
  },
});

const claudeEvent = (toolName) => ({ hook_event_name: 'PreToolUse', tool_name: toolName });

const EVENTS = {
  antigravity: antigravityEvent,
  claude: (name) => claudeEvent(`mcp__plugin_zoho-projects_mcp__${name}`),
};

const runCli = (args, stdin) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { input: stdin, encoding: 'utf8', cwd: ROOT });

test('supports antigravity and claude, defaulting to antigravity', () => {
  assert.deepEqual([...HOSTS].sort(), ['antigravity', 'claude']);
  assert.equal(DEFAULT_HOST, 'antigravity');
});

test('parseHost reads --host and falls back to antigravity', () => {
  assert.equal(parseHost([]), 'antigravity');
  assert.equal(parseHost(['--host', 'claude']), 'claude');
  assert.equal(parseHost(['--host=claude']), 'claude');
  assert.equal(parseHost(['--host', 'cursor']), 'antigravity');
  assert.equal(parseHost(['--host']), 'antigravity');
});

test('antigravity reads the MCP tool name from toolCall.args.ToolName', () => {
  assert.equal(getToolName(antigravityEvent('ZohoProjects_delete_issue'), 'antigravity'), 'ZohoProjects_delete_issue');
  assert.equal(getToolName({ toolCall: { name: 'run_command', args: { CommandLine: 'ls' } } }, 'antigravity'), undefined);
  assert.equal(getToolName({ tool_name: 'ZohoProjects_delete_issue' }, 'antigravity'), undefined);
});

test('claude reads only tool_name', () => {
  assert.equal(getToolName(claudeEvent('x'), 'claude'), 'x');
  assert.equal(getToolName(antigravityEvent('x'), 'claude'), undefined);
});

test('antigravity: force_ask for destructive Zoho tools, ask for everything else', () => {
  const destructive = formatOutput(evaluate(antigravityEvent('ZohoProjects_delete_issue'), 'antigravity'), 'antigravity');
  assert.equal(destructive.decision, 'force_ask');
  assert.match(destructive.reason, /Zoho Projects/);
  // An empty reply denies the call in Antigravity, so the neutral reply is a
  // plain "ask", which keeps the normal approval flow and its "Always Allow".
  assert.deepEqual(formatOutput(evaluate(antigravityEvent('ZohoProjects_get_tasks_by_project'), 'antigravity'), 'antigravity'), { decision: 'ask' });
  assert.deepEqual(formatOutput({}, 'antigravity'), { decision: 'ask' });
});

test('claude: permissionDecision ask for destructive Zoho tools, {} otherwise', () => {
  const out = formatOutput(evaluate(EVENTS.claude('ZohoProjects_delete_issue'), 'claude'), 'claude');
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /Zoho Projects/);
  assert.deepEqual(formatOutput({}, 'claude'), {});
});

for (const host of HOSTS) {
  test(`CLI --host ${host}: destructive tool gets the host's confirmation reply`, () => {
    const event = EVENTS[host]('ZohoProjects_trash_project');
    const result = runCli(['--host', host], JSON.stringify(event));
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), formatOutput(evaluate(event, host), host));
  });

  test(`CLI --host ${host}: safe tool, bad JSON and empty stdin get the neutral reply`, () => {
    const neutral = formatOutput({}, host);
    for (const stdin of [JSON.stringify(EVENTS[host]('ZohoProjects_get_tasks_by_project')), 'not json {', '']) {
      const result = runCli(['--host', host], stdin);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, '');
      assert.deepEqual(JSON.parse(result.stdout), neutral);
    }
  });
}
