const $ = (id) => document.getElementById(id);

const form = $('form-busca');
const campo = $('cidade');
const botao = $('botao-buscar');
const mensagem = $('mensagem');
const resultado = $('resultado');

const formatarData = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

function mostrarMensagem(texto, erro = false) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', erro);
}

function renderizarClima(dados) {
  const { cidade, atual, previsao, unidades } = dados;

  $('nome-cidade').textContent = cidade.nome;
  $('local-detalhe').textContent = [cidade.estado, cidade.pais].filter(Boolean).join(', ');
  $('condicao').textContent = atual.condicao;
  $('temperatura').textContent = `${Math.round(atual.temperatura)}${unidades.temperatura}`;
  $('sensacao').textContent = `${Math.round(atual.sensacaoTermica)}${unidades.temperatura}`;
  $('umidade').textContent = `${atual.umidade}${unidades.umidade}`;
  $('vento').textContent = `${atual.vento} ${unidades.vento}`;

  const lista = $('previsao');
  lista.replaceChildren(
    ...previsao.map((dia) => {
      const li = document.createElement('li');
      const titulo = document.createElement('strong');
      titulo.textContent = formatarData(dia.data);
      const temp = document.createElement('span');
      temp.textContent = `${Math.round(dia.minima)}° / ${Math.round(dia.maxima)}°`;
      const cond = document.createElement('span');
      cond.textContent = dia.condicao;
      li.append(titulo, temp, cond);
      if (dia.chanceChuva !== null) {
        const chuva = document.createElement('span');
        chuva.textContent = `Chuva: ${dia.chanceChuva}%`;
        li.append(chuva);
      }
      return li;
    })
  );

  resultado.classList.remove('oculto');
}

function renderizarHistorico(itens) {
  const lista = $('historico');
  lista.replaceChildren(
    ...itens.map((item) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = `Consultar ${item.nome} novamente`;
      const nome = document.createElement('span');
      nome.textContent = [item.nome, item.estado].filter(Boolean).join(' - ');
      const info = document.createElement('small');
      info.textContent = item.temperatura !== null ? `${Math.round(item.temperatura)}°C · ${item.condicao}` : '';
      btn.append(nome, info);
      btn.addEventListener('click', () => {
        campo.value = item.nome;
        buscar(item.nome);
      });
      li.append(btn);
      return li;
    })
  );
  $('historico-vazio').classList.toggle('oculto', itens.length > 0);
}

async function buscar(cidade) {
  botao.disabled = true;
  mostrarMensagem('Consultando...');

  try {
    const resposta = await fetch(`/api/clima?cidade=${encodeURIComponent(cidade)}`);
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      if (resposta.status === 404) resultado.classList.add('oculto');
      mostrarMensagem(dados.erro || `Erro ${resposta.status} ao consultar o clima.`, true);
      return;
    }

    renderizarClima(dados);
    renderizarHistorico(dados.historico || []);
    mostrarMensagem('');
  } catch {
    mostrarMensagem('Não foi possível falar com o API Gateway. Ele está rodando?', true);
  } finally {
    botao.disabled = false;
  }
}

async function carregarHistorico() {
  try {
    const resposta = await fetch('/api/historico');
    if (resposta.ok) renderizarHistorico(await resposta.json());
  } catch {}
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const cidade = campo.value.trim();
  if (cidade.length < 2 || cidade.length > 100) {
    mostrarMensagem('Informe uma cidade com 2 a 100 caracteres.', true);
    campo.focus();
    return;
  }
  buscar(cidade);
});

carregarHistorico();
