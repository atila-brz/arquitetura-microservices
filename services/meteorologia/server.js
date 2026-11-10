const express = require('express');

const PORT = process.env.PORT || 3002;
const FORECAST_URL = process.env.FORECAST_URL || 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 5000;

const CONDICOES = {
  0: 'Céu limpo',
  1: 'Predominantemente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro com geada',
  51: 'Garoa fraca',
  53: 'Garoa moderada',
  55: 'Garoa intensa',
  56: 'Garoa congelante fraca',
  57: 'Garoa congelante intensa',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  66: 'Chuva congelante fraca',
  67: 'Chuva congelante forte',
  71: 'Neve fraca',
  73: 'Neve moderada',
  75: 'Neve forte',
  77: 'Grãos de neve',
  80: 'Pancadas de chuva fracas',
  81: 'Pancadas de chuva moderadas',
  82: 'Pancadas de chuva violentas',
  85: 'Pancadas de neve fracas',
  86: 'Pancadas de neve fortes',
  95: 'Trovoada',
  96: 'Trovoada com granizo fraco',
  99: 'Trovoada com granizo forte',
};

const descrever = (codigo) => CONDICOES[codigo] || 'Condição desconhecida';

const app = express();

app.get('/health', (req, res) => res.json({ servico: 'meteorologia', status: 'ok' }));

app.get('/meteorologia', async (req, res) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const fusoHorario = String(req.query.fusoHorario || 'auto');

  const informado = req.query.latitude !== undefined && req.query.longitude !== undefined;
  const numerico = Number.isFinite(latitude) && Number.isFinite(longitude);
  const dentroDoLimite = Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  if (!informado || !numerico || !dentroDoLimite) {
    return res.status(400).json({ erro: 'Parâmetros "latitude" e "longitude" inválidos.' });
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: fusoHorario,
    forecast_days: '5',
  });

  let dados;
  try {
    const resposta = await fetch(`${FORECAST_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!resposta.ok) {
      return res.status(502).json({ erro: `Open-Meteo Forecast respondeu ${resposta.status}.` });
    }
    dados = await resposta.json();
  } catch (erro) {
    const motivo = erro.name === 'TimeoutError' ? 'tempo esgotado' : 'serviço indisponível';
    return res.status(502).json({ erro: `Falha ao consultar a Open-Meteo Forecast (${motivo}).` });
  }

  const atual = dados.current || {};
  const diario = dados.daily || { time: [] };

  res.json({
    atual: {
      horario: atual.time,
      temperatura: atual.temperature_2m,
      sensacaoTermica: atual.apparent_temperature,
      umidade: atual.relative_humidity_2m,
      vento: atual.wind_speed_10m,
      codigo: atual.weather_code,
      condicao: descrever(atual.weather_code),
      dia: atual.is_day === 1,
    },
    previsao: diario.time.map((data, i) => ({
      data,
      minima: diario.temperature_2m_min[i],
      maxima: diario.temperature_2m_max[i],
      chanceChuva: diario.precipitation_probability_max ? diario.precipitation_probability_max[i] : null,
      codigo: diario.weather_code[i],
      condicao: descrever(diario.weather_code[i]),
    })),
    unidades: { temperatura: '°C', umidade: '%', vento: 'km/h', chanceChuva: '%' },
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`[meteorologia] ouvindo em http://localhost:${PORT}`));
}

module.exports = app;
