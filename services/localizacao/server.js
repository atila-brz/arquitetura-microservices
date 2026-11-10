const express = require('express');

const PORT = process.env.PORT || 3001;
const GEOCODING_URL = process.env.GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 5000;

const app = express();

app.get('/health', (req, res) => res.json({ servico: 'localizacao', status: 'ok' }));

app.get('/localizacao', async (req, res) => {
  const cidade = String(req.query.cidade || '').trim();
  if (!cidade) {
    return res.status(400).json({ erro: 'Informe o parâmetro "cidade".' });
  }

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;

  let dados;
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!resposta.ok) {
      return res.status(502).json({ erro: `Open-Meteo Geocoding respondeu ${resposta.status}.` });
    }
    dados = await resposta.json();
  } catch (erro) {
    const motivo = erro.name === 'TimeoutError' ? 'tempo esgotado' : 'serviço indisponível';
    return res.status(502).json({ erro: `Falha ao consultar a Open-Meteo Geocoding (${motivo}).` });
  }

  const local = dados.results && dados.results[0];
  if (!local) {
    return res.status(404).json({ erro: `Cidade "${cidade}" não encontrada.` });
  }

  res.json({
    nome: local.name,
    estado: local.admin1 || null,
    pais: local.country || null,
    codigoPais: local.country_code || null,
    latitude: local.latitude,
    longitude: local.longitude,
    fusoHorario: local.timezone || 'auto',
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`[localizacao] ouvindo em http://localhost:${PORT}`));
}

module.exports = app;
