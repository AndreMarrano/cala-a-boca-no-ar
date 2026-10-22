/* Ranking casual: a função valida o PIN no servidor. Ele nunca é salvo no aparelho. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const dialog = $('#rankingDialog'), form = $('#rankingForm');
  const nome = $('#rankingNome'), pin = $('#rankingPin'), confirmar = $('#rankingConfirmar');
  const CHAVE_NOME = 'cala-ranking-nome-v1';
  let pontos = null, enviando = false, criando = false, publicado = false, rodada = 0;
  let consulta = 0, retornoFoco = null;
  const numero = n => n.toLocaleString('pt-BR');
  const limparNome = n => n.normalize('NFKC').replace(/\s+/gu, ' ').trim();

  function mensagem(texto = '', erro = false) {
    $('#rankingMensagem').textContent = texto;
    $('#rankingMensagem').classList.toggle('erro', erro);
  }
  function estadoNovo(ativo) {
    criando = ativo; $('#rankingNovo').hidden = !ativo; confirmar.required = ativo;
    confirmar.value = ''; $('#rankingEnviar').textContent = ativo ? 'Criar cadastro e publicar' : 'Continuar';
  }
  function ocupado(ativo) {
    enviando = ativo;
    for (const el of [nome, pin, confirmar, $('#rankingEnviar')]) el.disabled = ativo;
    form.setAttribute('aria-busy', String(ativo));
  }
  async function api(dados) {
    const endpoint = window.CALA_RANKING_URL;
    if (!endpoint) throw new Error('O ranking ainda está sendo preparado. Tente novamente em breve.');
    const controller = new AbortController();
    const limite = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(endpoint, dados ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados), signal: controller.signal
      } : { signal: controller.signal });
      const data = await res.json();
      if (!res.ok || data.error) {
        const e = new Error(data.message || 'Não foi possível acessar o ranking. Tente novamente.');
        e.codigo = data.error; throw e;
      }
      return data;
    } catch (e) {
      if (e.name === 'AbortError' || e instanceof TypeError) throw new Error('Não foi possível conectar ao ranking. Sua pontuação continua aqui; tente novamente.');
      throw e;
    } finally { clearTimeout(limite); }
  }
  function desenharLista(rows, destaque) {
    const corpo = $('#rankingLinhas'); corpo.replaceChildren();
    for (const row of rows) {
      const tr = document.createElement('tr');
      if (row.name_key === destaque) tr.classList.add('voce');
      for (const texto of [row.position + 'º', row.name, numero(row.score)]) {
        const td = document.createElement('td'); td.textContent = texto; tr.append(td);
      }
      corpo.append(tr);
    }
  }
  async function carregarLista() {
    const id = ++consulta;
    $('#rankingResultado').textContent = 'Carregando ranking…';
    $('#rankingResultado').classList.remove('erro'); $('#rankingAtualizar').disabled = true;
    $('#rankingLinhas').replaceChildren();
    try {
      const data = await api();
      if (id !== consulta) return;
      desenharLista(data.rows);
      $('#rankingResultado').textContent = data.rows.length ? '' : 'O ranking está vazio. Jogue uma rodada para ser o primeiro!';
    } catch (e) {
      if (id !== consulta) return;
      $('#rankingResultado').textContent = e.message; $('#rankingResultado').classList.add('erro');
    } finally { if (id === consulta) $('#rankingAtualizar').disabled = false; }
  }
  function abrir(publicar) {
    if (publicar && (pontos === null || publicado)) return;
    retornoFoco = document.activeElement;
    mensagem(); estadoNovo(false); pin.value = '';
    $('#rankingCadastro').hidden = !publicar; $('#rankingLista').hidden = publicar;
    $('#rankingTitulo').textContent = publicar ? 'Entrar no ranking' : 'Ranking geral';
    if (!dialog.open) dialog.showModal();
    if (publicar) {
      $('#rankingPontos').textContent = numero(pontos) + ' pontos nesta rodada';
      try { nome.value = localStorage.getItem(CHAVE_NOME) || ''; } catch (_) { nome.value = ''; }
      (nome.value ? pin : nome).focus();
    } else { carregarLista(); }
  }
  function fechar() { dialog.close(); }
  dialog.addEventListener('close', () => {
    pin.value = ''; confirmar.value = ''; ++consulta;
    if (retornoFoco?.isConnected && !retornoFoco.disabled) retornoFoco.focus({ preventScroll: true });
  });
  $('#rankingFechar').addEventListener('click', fechar);
  $('#rankingAtualizar').addEventListener('click', carregarLista);
  $('#btnRanking').addEventListener('click', () => abrir(false));
  $('#btnPublicar').addEventListener('click', () => abrir(true));
  for (const el of [nome, pin]) el.addEventListener('input', () => { if (criando) estadoNovo(false); mensagem(); });
  confirmar.addEventListener('input', () => mensagem());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (enviando || pontos === null || publicado) return;
    nome.value = limparNome(nome.value);
    if (!nome.value || [...nome.value].length > 24 || /[\p{Cc}\p{Cf}]/u.test(nome.value)) {
      mensagem('Escolha um nome de 1 a 24 caracteres visíveis.', true); nome.focus(); return;
    }
    if (!/^[0-9]{4}$/.test(pin.value)) { mensagem('O código precisa ter exatamente 4 números.', true); pin.focus(); return; }
    if (criando && confirmar.value !== pin.value) { mensagem('Os dois códigos não conferem. Repita o mesmo código.', true); confirmar.focus(); return; }
    const atual = rodada, candidato = nome.value, codigo = pin.value, criar = criando, placar = pontos;
    ocupado(true); mensagem(criar ? 'Criando seu cadastro…' : 'Conferindo seu nome…');
    try {
      if (!criar) {
        const perfil = await api({ action: 'inspect', name: candidato });
        if (atual !== rodada) return;
        if (!perfil.exists) {
          estadoNovo(true); mensagem(); ocupado(false); confirmar.focus(); return;
        }
      }
      mensagem('Validando código e publicando…');
      const data = await api({ action: 'submit', name: candidato, pin: codigo, score: placar, create: criar });
      if (atual !== rodada) return;
      publicado = true;
      try { localStorage.setItem(CHAVE_NOME, data.name); } catch (_) {}
      pin.value = ''; confirmar.value = '';
      $('#rankingCadastro').hidden = true; $('#rankingLista').hidden = false;
      $('#rankingTitulo').textContent = 'Ranking geral';
      $('#btnPublicar').disabled = true; $('#btnPublicar').textContent = 'Pontuação registrada';
      desenharLista(data.rows, data.name_key);
      $('#rankingResultado').classList.remove('erro');
      $('#rankingResultado').textContent = (data.created ? 'Cadastro criado! ' : '') +
        (data.improved || data.created ? 'Pontuação registrada. ' : 'Rodada recebida. Seu recorde maior foi mantido. ') +
        'Você está em ' + data.position + 'º, com ' + numero(data.best) + ' pontos.';
      $('#rankingAtualizar').disabled = false;
    } catch (err) {
      if (atual !== rodada) return;
      if (['name_taken', 'new_name'].includes(err.codigo)) estadoNovo(false);
      mensagem(err.message, true);
    } finally { if (atual === rodada) ocupado(false); }
  });
  window.CalaRanking = {
    inicio() {
      rodada++; pontos = null; publicado = false;
      ocupado(false); pin.value = ''; confirmar.value = '';
      if (dialog.open) dialog.close();
      $('#btnRanking').disabled = true;
      $('#btnPublicar').disabled = false; $('#btnPublicar').textContent = 'Entrar no ranking';
    },
    fim(total) {
      pontos = total; $('#btnRanking').disabled = false;
      $('#btnPublicar').disabled = false; $('#btnPublicar').textContent = 'Entrar no ranking';
    }
  };
})();
