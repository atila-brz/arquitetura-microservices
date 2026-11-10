const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../services/historico/server.js');

let srv;
let base;

before(() => {
  return new Promise((resolve) => {
    srv = app.listen(0, () => {
      base = `http://localhost:${srv.address().port}`;
      resolve();
    });
  });
});

after(() => srv.close());

const registrar = (nome) =>
  fetch(`${base}/historico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  }).then((r) => r.json());

test('mantém apenas as últimas 5 cidades, a mais recente primeiro', async () => {
  await fetch(`${base}/historico`, { method: 'DELETE' });
  for (const c of ['A1', 'B2', 'C3', 'D4', 'E5', 'F6']) await registrar(c);
  const lista = await fetch(`${base}/historico`).then((r) => r.json());
  assert.deepStrictEqual(lista.map((i) => i.nome), ['F6', 'E5', 'D4', 'C3', 'B2']);
});

test('consultar de novo uma cidade a move para o topo sem duplicar', async () => {
  const lista = await registrar('C3');
  assert.deepStrictEqual(lista.map((i) => i.nome), ['C3', 'F6', 'E5', 'D4', 'B2']);
});

test('400 sem nome', async () => {
  const r = await fetch(`${base}/historico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.strictEqual(r.status, 400);
});
