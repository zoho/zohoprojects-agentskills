import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { DESTRUCTIVE_TOOL_PATTERN_SOURCE } from '../scripts/guard-destructive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const MANIFESTS = [
  '.antigravity-plugin/plugin.json',
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
];

const DATA_CENTERS = ['com', 'eu', 'in', 'com.au', 'ca', 'sa', 'jp', 'ae', 'uk'];
const MCP_URL_PREFIX = 'https://zprojects.zohomcp.';
const NO_DASHES = /[–—]/;

test('no manifest at the repo root', () => {
  assert.equal(existsSync(path.join(ROOT, 'plugin.json')), false);
});

test('every manifest parses and shares name, version and license', () => {
  const parsed = MANIFESTS.map(readJson);
  for (const manifest of parsed) {
    assert.equal(manifest.name, 'zoho-projects');
    assert.equal(manifest.version, '0.1.0');
    assert.equal(manifest.license, 'Apache-2.0');
    assert.equal(typeof manifest.description, 'string');
  }
});

for (const rel of ['.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json']) {
  test(`${rel} lists the single plugin from the repo root`, () => {
    const market = readJson(rel);
    assert.equal(market.name, 'zoho-projects');
    assert.equal(typeof market.owner?.name, 'string');
    assert.equal(market.plugins.length, 1);
    assert.equal(market.plugins[0].name, 'zoho-projects');
    assert.equal(market.plugins[0].source, './');
  });
}

const checkMcpServer = (server, dcToken, dataDirToken) => {
  assert.equal(server.command, 'npx');
  assert.deepEqual(server.args, [
    '-y',
    'mcp-remote',
    `${MCP_URL_PREFIX}${dcToken}/mcp/message`,
    '--transport',
    'http-only',
  ]);
  if (dataDirToken) {
    assert.deepEqual(server.env, { MCP_REMOTE_CONFIG_DIR: `${dataDirToken}/mcp-auth` });
  } else {
    assert.equal(server.env, undefined);
  }
};

test('antigravity MCP config is a remote server on the US data center, like other Zoho plugins', () => {
  const config = readJson('mcp_config.json');
  assert.deepEqual(config, {
    mcpServers: { mcp: { serverUrl: `${MCP_URL_PREFIX}com/mcp/message` } },
  });
});

test('README documents the MCP server URL for every data center', () => {
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  for (const dc of DATA_CENTERS) {
    assert.ok(readme.includes(`${MCP_URL_PREFIX}${dc}/mcp/message`), `README is missing the ${dc} URL`);
  }
});

test('claude manifest declares the api server, zoho_dc picker and custom hooks path', () => {
  const manifest = readJson('.claude-plugin/plugin.json');
  assert.deepEqual(Object.keys(manifest.mcpServers), ['mcp']);
  checkMcpServer(manifest.mcpServers.mcp, '${user_config.zoho_dc}', '${CLAUDE_PLUGIN_DATA}');
  const dc = manifest.userConfig.zoho_dc;
  assert.equal(dc.type, 'string');
  assert.deepEqual(dc.options, DATA_CENTERS);
  assert.equal(dc.default, 'com');
  assert.equal(typeof dc.title, 'string');
  assert.equal(typeof dc.description, 'string');
  assert.equal(manifest.hooks, './hosts/claude/hooks.json');
});

test('cursor manifest declares skills, rules, api server and ZOHO_DC enum, and no hooks', () => {
  const manifest = readJson('.cursor-plugin/plugin.json');
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.rules, './rules/');
  assert.equal(manifest.hooks, undefined);
  assert.equal(existsSync(path.join(ROOT, 'hosts', 'cursor')), false);
  assert.equal(manifest.logo, 'assets/logo.svg');
  assert.deepEqual(Object.keys(manifest.mcpServers), ['mcp']);
  checkMcpServer(manifest.mcpServers.mcp, '${ZOHO_DC}', undefined);
  assert.equal(manifest.variables.type, 'object');
  const dc = manifest.variables.properties.ZOHO_DC;
  assert.deepEqual(dc.enum, DATA_CENTERS);
  assert.equal(dc.default, 'com');
});

const onlyEntry = (entries, label) => {
  assert.equal(entries?.length, 1, `${label} should have one PreToolUse entry`);
  return entries[0];
};

test('antigravity hooks.json uses a named hook on call_mcp_tool, run from the plugin folder', () => {
  // agy loads native plugin hooks as named hooks and runs commands in the
  // folder holding hooks.json, without ${PLUGIN_ROOT}. Every MCP call reaches
  // PreToolUse as call_mcp_tool; the script reads the real tool name.
  const config = readJson('hooks.json');
  assert.deepEqual(Object.keys(config), ['zoho-projects-guard']);
  const entry = onlyEntry(config['zoho-projects-guard'].PreToolUse, 'hooks.json');
  assert.equal(entry.matcher, 'call_mcp_tool');
  assert.equal(entry.hooks[0].command, 'node ./scripts/guard-destructive.mjs --host antigravity');
});

test('claude hook matches the shared destructive pattern and passes --host claude', () => {
  const entry = onlyEntry(readJson('hosts/claude/hooks.json').hooks.PreToolUse, 'hosts/claude/hooks.json');
  assert.equal(entry.matcher, DESTRUCTIVE_TOOL_PATTERN_SOURCE);
  assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-destructive.mjs" --host claude');
});

test('host files contain no en or em dashes', () => {
  const files = [
    ...MANIFESTS,
    '.claude-plugin/marketplace.json',
    'hosts/claude/hooks.json',
    '.cursor-plugin/marketplace.json',
    'rules/AGENTS.md',
    'hooks.json',
    'mcp_config.json',
    'scripts/guard-destructive.mjs',
    'README.md',
  ];
  for (const rel of files) {
    assert.equal(NO_DASHES.test(readFileSync(path.join(ROOT, rel), 'utf8')), false, `dash found in ${rel}`);
  }
});

test('cursor rule frontmatter keeps trigger and adds description and alwaysApply', () => {
  for (const rel of ['rules/task-filters.md', 'rules/time-logs.md']) {
    const text = readFileSync(path.join(ROOT, rel), 'utf8');
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
    assert.match(frontmatter, /^trigger: model_decision$/m, rel);
    assert.match(frontmatter, /^description: \S/m, rel);
    assert.match(frontmatter, /^alwaysApply: false$/m, rel);
  }
});

test('rules/AGENTS.md is always on in Antigravity and Cursor', () => {
  const text = readFileSync(path.join(ROOT, 'rules/AGENTS.md'), 'utf8');
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  assert.match(frontmatter, /^trigger: always_on$/m);
  assert.match(frontmatter, /^alwaysApply: true$/m);
  assert.match(frontmatter, /^description: \S/m);
});

test('published metadata has no TODO placeholders', () => {
  for (const rel of [...MANIFESTS, '.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json', 'LICENSE']) {
    assert.equal(/\bTODO\b/.test(readFileSync(path.join(ROOT, rel), 'utf8')), false, `TODO left in ${rel}`);
  }
});

test('.gitignore keeps local MCP config and machine files out of commits', () => {
  const lines = readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split('\n').map((line) => line.trim());
  for (const entry of ['.mcp.json', '.claude/settings.local.json', 'node_modules/', '.DS_Store']) {
    assert.ok(lines.includes(entry), `.gitignore is missing ${entry}`);
  }
});

test('every manifest lists the same keywords', () => {
  const [first, ...rest] = MANIFESTS.map((rel) => readJson(rel).keywords);
  assert.ok(first.includes('custom-modules'));
  for (const keywords of rest) assert.deepEqual(keywords, first);
});

test('README install steps name the public GitHub repository', () => {
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.equal(/<repo>|<path-to-this-repo>/.test(readme), false, 'README still has install placeholders');
  assert.ok(readme.includes('/plugin marketplace add zoho/zohoprojects-agentskills'));
  assert.ok(readme.includes('https://github.com/zoho/zohoprojects-agentskills'));
});

test('README "Try it" lists exactly the Antigravity suggested prompts, in order', () => {
  // suggestedPrompts is an Antigravity-only field; Claude Code strict validation
  // rejects it and Cursor does not define it, so the README is the shared copy.
  const prompts = readJson('.antigravity-plugin/plugin.json').suggestedPrompts;
  assert.ok(prompts.length >= 1 && prompts.length <= 3, 'Antigravity shows at most 3 prompts');
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const section = readme.match(/^## Try it\n([\s\S]*?)(?=^## )/m)?.[1] ?? '';
  const listed = [...section.matchAll(/^- "(.+)"$/gm)].map((match) => match[1]);
  assert.deepEqual(listed, prompts);
});

test('rules stay short guardrails that defer details to the skills', () => {
  const agents = readFileSync(path.join(ROOT, 'rules/AGENTS.md'), 'utf8');
  assert.match(agents, /`zoho-projects` skill/);
  assert.equal(/get_portal_details/.test(agents), false, 'AGENTS.md must not send link building to get_portal_details');
  assert.equal(/tag values are option IDs/i.test(agents), false, 'tags are not option IDs');
  assert.equal(/get_options_list_for_a_field_in_module|get_all_users_in_a_project|owners: \[/.test(agents), false, 'ID details live in the skills');
  for (const [rel, skill] of [['rules/task-filters.md', 'zoho-projects-tasks'], ['rules/time-logs.md', 'zoho-projects-timelogs']]) {
    const text = readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(text.includes(`\`${skill}\` skill`), `${rel} should point to ${skill}`);
    assert.ok(text.split('\n').length <= 25, `${rel} should stay a short guardrail`);
  }
});

test('antigravity manifest has no fields agy ignores, and prompts read naturally', () => {
  const manifest = readJson('.antigravity-plugin/plugin.json');
  assert.equal('category' in manifest, false);
  for (const prompt of manifest.suggestedPrompts) assert.equal(/Projects'/.test(prompt), false, prompt);
});
