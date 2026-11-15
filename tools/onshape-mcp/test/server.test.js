import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('server starts without keys, lists tools and reports missing keys', async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ['src/index.js'], env: { PATH: process.env.PATH } });
  const client = new Client({ name: 'test', version: '1' });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  for (const n of ['add_sketch', 'add_extrude', 'get_view', 'export_stl', 'find_edges']) assert.ok(names.includes(n), n);
  const r = await client.callTool({ name: 'whoami', arguments: {} });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /ONSHAPE_ACCESS_KEY/);
  await client.close();
});
