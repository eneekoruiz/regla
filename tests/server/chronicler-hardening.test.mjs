import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, watch: null }, logLevel: 'silent' });
after(() => vite.close());
const { handleChronicleRequest } = await vite.ssrLoadModule('/server/chronicler.ts');

test('invalid notes return a bounded failure without claiming persistence or leaking internal errors', async () => {
  for (const body of [null, {}, { text: '' }, { text: 'a'.repeat(20001) }]) {
    const response = await handleChronicleRequest(body);
    assert.equal(response.success, false);
    assert.ok(response.data.notes.length <= 20000);
    assert.doesNotMatch(response.empathyMessage, /he guardado/i);
    assert.equal(response.error, 'No se ha podido procesar la nota.');
  }
});
