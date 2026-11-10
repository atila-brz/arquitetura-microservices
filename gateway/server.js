const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;
const LOCALIZACAO_URL = process.env.LOCALIZACAO_URL || 'http://localhost:3001';
const METEOROLOGIA_URL = process.env.METEOROLOGIA_URL || 'http://localhost:3002';
const HISTORICO_URL = process.env.HISTORICO_URL || 'http://localhost:3003';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 8000;

class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

async function chamarServico(nome, url, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (erro) {
    const motivo = erro.name === 'TimeoutError' ? 'tempo esgotado' : 'indisponível';
    throw new ErroHttp(502, `Microsserviço de ${nome} ${motivo}.`);
  }

  const corpo = await resposta.json().catch(() => ({}));
  if (resposta.ok) return corpo;
  if (resposta.status === 400 || resposta.status === 404) {
    throw new ErroHttp(resposta.status, corpo.erro || `Erro no microsserviço de ${nome}.`);
  }
  throw new ErroHttp(502, corpo.erro || `Microsserviço de ${nome} respondeu ${resposta.status}.`);
}

function validarCidade(valor) {
  if (typeof valor !== 'string') return null;
  const cidade = valor.trim().replace(/\s+/g, ' ');
  if (cidade.length < 2 || cidade.length > 100) return null;
  return cidade;
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ servico: 'gateway', status: 'ok' }));

app.get('/api/clima', async (req, res) => {
  const cidade = validarCidade(req.query.cidade);
  if (!cidade) {
    return res.status(400).json({ erro: 'Informe uma cidade com 2 a 100 caracteres.' });
  }

  try {
    const local = await chamarServico(
      'localização',
      `${LOCALIZACAO_URL}/localizacao?cidade=${encodeURIComponent(cidade)}`
    );

    const params = new URLSearchParams({
      latitude: local.latitude,
      longitude: local.longitude,
      fusoHorario: local.fusoHorario,
    });
    const clima = await chamarServico('meteorologia', `${METEOROLOGIA_URL}/meteorologia?${params}`);

    let historico = [];
    try {
      historico = await chamarServico('histórico', `${HISTORICO_URL}/historico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: local.nome,
          estado: local.estado,
          pais: local.pais,
          temperatura: clima.atual.temperatura,
          condicao: clima.atual.condicao,
        }),
      });
    } catch (erro) {
      console.warn(`[gateway] histórico não atualizado: ${erro.message}`);
    }

    res.json({ cidade: local, ...clima, historico });
  } catch (erro) {
    const status = erro.status || 502;
    res.status(status).json({ erro: erro.message });
  }
});

app.get('/api/historico', async (req, res) => {
  try {
    res.json(await chamarServico('histórico', `${HISTORICO_URL}/historico`));
  } catch (erro) {
    res.status(erro.status || 502).json({ erro: erro.message });
  }
});

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

if (require.main === module) {
  app.listen(PORT, () => console.log(`[gateway] ouvindo em http://localhost:${PORT}`));
}

module.exports = app;
