const express = require('express');

const PORT = process.env.PORT || 3003;
const LIMITE = 5;

const app = express();
app.use(express.json());

let historico = [];

app.get('/health', (req, res) => res.json({ servico: 'historico', status: 'ok' }));

app.get('/historico', (req, res) => res.json(historico));

app.post('/historico', (req, res) => {
  const { nome, estado = null, pais = null, temperatura = null, condicao = null } = req.body || {};
  if (!nome || typeof nome !== 'string') {
    return res.status(400).json({ erro: 'Campo "nome" é obrigatório.' });
  }

  const chave = (item) => `${item.nome}|${item.estado}|${item.pais}`.toLowerCase();
  const novo = { nome, estado, pais, temperatura, condicao, consultadoEm: new Date().toISOString() };

  historico = [novo, ...historico.filter((item) => chave(item) !== chave(novo))].slice(0, LIMITE);
  res.status(201).json(historico);
});

app.delete('/historico', (req, res) => {
  historico = [];
  res.status(204).end();
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`[historico] ouvindo em http://localhost:${PORT}`));
}

module.exports = app;
