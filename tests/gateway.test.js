const { test, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

const servidores = [];
let base;
let modoMeteorologia = 'ok';

function subir(app) {
  return new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
    servidores.push(srv);
  });
}

before(async () => {
  const localizacao = express();
  localizacao.get('/localizacao', (req, res) => {
    if (req.query.cidade === 'Cidadeinexistente') return res.status(404).json({ erro: 'Cidade não encontrada.' });
    res.json({ nome: 'Salvador', estado: 'Bahia', pais: 'Brasil', latitude: -12.97, longitude: -38.51, fusoHorario: 'America/Bahia' });
  });

  const meteorologia = express();
  meteorologia.get('/meteorologia', (req, res) => {
    if (modoMeteorologia === 'fora') return res.status(502).json({ erro: 'Falha ao consultar a Open-Meteo Forecast (tempo esgotado).' });
    res.json({
      atual: { temperatura: 28, sensacaoTermica: 31, umidade: 70, vento: 12, codigo: 1, condicao: 'Predominantemente limpo' },
      previsao: [],
      unidades: { temperatura: '°C' },
    });
  });

  const historico = require('../services/historico/server.js');

  const [l, m, h] = await Promise.all([subir(localizacao), subir(meteorologia), subir(historico)]);
  process.env.LOCALIZACAO_URL = `http://localhost:${l.address().port}`;
  process.env.METEOROLOGIA_URL = `http://localhost:${m.address().port}`;
  process.env.HISTORICO_URL = `http://localhost:${h.address().port}`;

  const gateway = require('../gateway/server.js');
  const g = await subir(gateway);
  base = `http://localhost:${g.address().port}`;
});

after(() => servidores.forEach((s) => s.close()));

test('400 quando a cidade está ausente', async () => {
  const r = await fetch(`${base}/api/clima`);
  assert.strictEqual(r.status, 400);
});

test('400 quando a cidade tem menos de 2 caracteres', async () => {
  const r = await fetch(`${base}/api/clima?cidade=A`);
  assert.strictEqual(r.status, 400);
});

test('400 quando a cidade tem mais de 100 caracteres', async () => {
  const r = await fetch(`${base}/api/clima?cidade=${'a'.repeat(101)}`);
  assert.strictEqual(r.status, 400);
});

test('404 quando a localização não existe', async () => {
  const r = await fetch(`${base}/api/clima?cidade=Cidadeinexistente`);
  assert.strictEqual(r.status, 404);
});

test('200 com clima e histórico na consulta bem-sucedida', async () => {
  modoMeteorologia = 'ok';
  const r = await fetch(`${base}/api/clima?cidade=Salvador`);
  assert.strictEqual(r.status, 200);
  const corpo = await r.json();
  assert.strictEqual(corpo.cidade.nome, 'Salvador');
  assert.strictEqual(corpo.atual.temperatura, 28);
  assert.strictEqual(corpo.historico[0].nome, 'Salvador');
});

test('502 quando a meteorologia está indisponível', async () => {
  modoMeteorologia = 'fora';
  const r = await fetch(`${base}/api/clima?cidade=Salvador`);
  assert.strictEqual(r.status, 502);
  modoMeteorologia = 'ok';
});

test('502 quando um microsserviço está fora do ar', async () => {
  servidores[0].close();
  servidores[0].closeAllConnections();
  const r = await fetch(`${base}/api/clima?cidade=Salvador`);
  assert.strictEqual(r.status, 502);
});
