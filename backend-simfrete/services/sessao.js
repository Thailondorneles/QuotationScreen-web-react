const axios = require('axios');
const { randomBytes, createHash } = require('node:crypto');
const express = require('express');

function criarSessao({ baseURL, appOrigin, authorization, carregarPrazos, consultarPerfil }) {
  const origem = new URL(appOrigin);
  const local = ['localhost', '127.0.0.1'].includes(origem.hostname);
  if (origem.origin !== appOrigin || !['http:', 'https:'].includes(origem.protocol) ||
      !['http:', 'https:'].includes(new URL(baseURL).protocol)) {
    throw new Error('Configure URLs HTTP ou HTTPS para a origem e o ORDS.');
  }

  const ords = axios.create({
    baseURL,
    timeout: 7000,
    maxRedirects: 0,
    headers: { 'Content-Type': 'application/json', ...(authorization && { Authorization: authorization }) },
  });
  const cookie = origem.protocol === 'https:' ? '__Host-quotation-session' : 'quotation-session-local';
  const opcoesCookie = { httpOnly: true, secure: origem.protocol === 'https:', sameSite: 'lax', path: '/' };
  const router = express.Router();
  const tentativas = new Map();
  const leiturasEmAndamento = new Map();
  const perfis = new Map();
  let proximaLimpezaTentativas = 0;

  function hash(token) {
    return createHash('sha256').update(token).digest('hex');
  }

  function tokenDaRequisicao(req) {
    const prefixo = cookie + '=';
    const entradas = (req.get('cookie') || '').split(';').map(valor => valor.trim())
      .filter(valor => valor.startsWith(prefixo));
    const token = entradas.length === 1 ? entradas[0].slice(prefixo.length) : '';
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
  }

  function origemPermitida(req) {
    const recebida = req.get('origin');
    // O proxy do react-scripts troca Origin pelo destino no desenvolvimento.
    return recebida === appOrigin || (origem.protocol === 'http:' && local &&
      ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) &&
      /^http:\/\/(localhost|127\.0\.0\.1):3001\/?$/.test(recebida || '') &&
      req.get('sec-fetch-site') === 'same-origin');
  }

  function verificarOrigem(req, res, next) {
    if (!origemPermitida(req)) return res.sendStatus(403);
    next();
  }

  async function post(rota, body) {
    try {
      return await ords.post(rota, body);
    } catch (erro) {
      const codigo = typeof erro.response?.data === 'string'
        ? erro.response.data.match(/(?:ORA|PLS)-\d{5}/)?.[0] : undefined;
      if (!erro.response || erro.response.status >= 500) {
        console.warn('[sessao] Falha no ORDS', rota, erro.response?.status || erro.code, codigo || '');
      }
      throw erro;
    }
  }

  function responderFalha(res, erro) {
    if (erro.response?.status === 401 && erro.response.data?.codigo === 'SESSAO_INVALIDA') {
      return res.status(401).json({ codigo: 'SESSAO_INVALIDA' });
    }
    return res.status(503).json({ codigo: 'AUTH_ORDS_INDISPONIVEL' });
  }

  async function consultarNoOrds(tokenHash, atividade) {
    const { data } = await post('auth/sessao/validar', {
      token_hash: tokenHash,
      registrar_atividade: atividade ? 1 : 0,
      ...(atividade ? await carregarPrazos() : {}),
    });
    if (data?.codigo === 'SESSAO_INVALIDA') return null;
    if (!Number.isSafeInteger(data?.cod_pessoa) || data.cod_pessoa <= 0 ||
        !Number.isSafeInteger(data?.validade_ms) || data.validade_ms <= 0) {
      const motivo = ['ERRO_INTERNO', 'ATIVIDADE_INVALIDA', 'PRAZO_INVALIDO'].includes(data?.codigo)
        ? data.codigo : 'FORMATO_INVALIDO';
      console.warn('[sessao] Validacao do ORDS sem sessao confirmada', motivo);
      throw new Error('Resposta invalida do ORDS.');
    }
    const perfil = perfis.get(tokenHash);
    const nome = data.nome || data.des_pessoa || perfil?.nome || data.username || perfil?.username;
    const codigoPerfil = data.cod_perfil ?? perfil?.codigoPerfil;
    return {
      usuario: { codigoPessoa: data.cod_pessoa, ...(nome && { nome }), ...(codigoPerfil != null && { codigoPerfil }) },
      validadeMs: data.validade_ms,
    };
  }

  function consultarLeitura(tokenHash, atividade) {
    const chave = `${tokenHash}:${atividade}`;
    const atual = leiturasEmAndamento.get(chave);
    if (atual) return atual;

    const consulta = consultarNoOrds(tokenHash, atividade).then(sessao =>
      leiturasEmAndamento.get(chave) === consulta ? sessao : null
    ).finally(() => {
      if (leiturasEmAndamento.get(chave) === consulta) leiturasEmAndamento.delete(chave);
    });
    leiturasEmAndamento.set(chave, consulta);
    return consulta;
  }

  async function validar(req, res, atividade, compartilhar) {
    res.set('Cache-Control', 'no-store');
    const token = tokenDaRequisicao(req);
    try {
      if (token) {
        const tokenHash = hash(token);
        const sessao = await (compartilhar
          ? consultarLeitura(tokenHash, atividade) : consultarNoOrds(tokenHash, atividade));
        if (sessao) return sessao;
      }
      res.status(401).json({ codigo: 'SESSAO_INVALIDA' });
    } catch (erro) {
      responderFalha(res, erro);
    }
    return null;
  }

  async function revogar(token) {
    const tokenHash = hash(token);
    const resposta = await post('auth/sessao/revogar', { token_hash: tokenHash });
    if (resposta.status !== 204 && !(resposta.status === 200 && resposta.data?.codigo === 'SESSAO_REVOGADA')) {
      throw new Error('Resposta invalida do ORDS.');
    }
    leiturasEmAndamento.delete(`${tokenHash}:true`);
    leiturasEmAndamento.delete(`${tokenHash}:false`);
    perfis.delete(tokenHash);
  }

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/login', verificarOrigem, async (req, res) => {
    const { usuario, senha } = req.body || {};
    if (typeof usuario !== 'string' || !usuario.trim() || Buffer.byteLength(usuario) > 4000 ||
        typeof senha !== 'string' || !senha || Buffer.byteLength(senha) > 4000) {
      return res.sendStatus(400);
    }

    const agora = Date.now();
    if (agora >= proximaLimpezaTentativas) {
      for (const [chave, registro] of tentativas) {
        if (registro.expiraEm <= agora) tentativas.delete(chave);
      }
      proximaLimpezaTentativas = agora + 15000;
    }
    const chave = `${req.ip}|${usuario.trim().toUpperCase()}`;
    const atual = tentativas.get(chave);
    const registro = atual?.expiraEm > agora ? atual : { total: 0, expiraEm: agora + 60000 };
    if (registro.total >= 8 || (!tentativas.has(chave) && tentativas.size >= 1000)) {
      return res.set('Retry-After', '60').sendStatus(429);
    }
    registro.total += 1;
    tentativas.set(chave, registro);

    const token = randomBytes(32).toString('hex');
    const tokenHash = hash(token);
    try {
      const { data } = await post('auth/login', {
        username: usuario.trim(), password: senha, token_hash: tokenHash, ...await carregarPrazos(),
      });
      if (data?.success === false) {
        if (data.status === 400 || data.message === 'Dados de login invalidos') {
          return res.status(400).json({ codigo: 'DADOS_INVALIDOS' });
        }
        if ([401, 403].includes(data.status) ||
            ['Usuario ou senha invalidos', 'Usuario sem acesso a aplicacao'].includes(data.message)) {
          return res.status(401).json({ codigo: 'ACESSO_NEGADO' });
        }
      }
      if (data?.success !== true || !Number.isSafeInteger(data?.cod_pessoa) || data.cod_pessoa <= 0) {
        throw new Error('Resposta invalida do ORDS.');
      }
      const anterior = tokenDaRequisicao(req);
      if (anterior) {
        try {
          await revogar(anterior);
        } catch {
          return res.status(503).json({ codigo: 'AUTH_REVOGACAO_INDISPONIVEL' });
        }
      }
      tentativas.delete(chave);
      if (perfis.size >= 2000) perfis.delete(perfis.keys().next().value);
      perfis.set(tokenHash, {
        nome: data.nome || data.des_pessoa,
        username: data.username || usuario.trim(),
        codigoPerfil: data.cod_perfil,
      });
      return res.cookie(cookie, token, opcoesCookie).status(204).end();
    } catch (erro) {
      if ([401, 403].includes(erro.response?.status) && erro.response.data?.success === false) {
        return res.status(401).json({ codigo: 'ACESSO_NEGADO' });
      }
      return responderFalha(res, erro);
    }
  });

  router.get('/sessao', async (req, res) => {
    const sessao = await validar(req, res, false, true);
    if (!sessao) return;
    const { usuario } = sessao;
    if (consultarPerfil) {
      const chave = hash(tokenDaRequisicao(req));
      const anterior = perfis.get(chave) || {};
      if (!anterior.consulta) {
        anterior.consulta = Promise.resolve().then(() => consultarPerfil(usuario.codigoPessoa)).catch(() => null);
        if (perfis.size >= 2000 && !perfis.has(chave)) perfis.delete(perfis.keys().next().value);
        perfis.set(chave, anterior);
      }
      const perfil = await anterior.consulta;
      if (String(perfil?.cod_pessoa) === String(usuario.codigoPessoa)) {
        return res.json({ ...sessao, usuario: {
          ...usuario, nome: perfil.des_pessoa || usuario.nome,
          codigoPerfil: perfil.cod_perfil ?? usuario.codigoPerfil,
          descricaoPerfil: perfil.des_perfil,
        } });
      }
      delete anterior.consulta;
    }
    res.json(sessao);
  });

  router.post('/logout', verificarOrigem, async (req, res) => {
    try {
      const token = tokenDaRequisicao(req);
      if (token) await revogar(token);
      return res.clearCookie(cookie, opcoesCookie).status(204).end();
    } catch (erro) {
      return responderFalha(res, erro);
    }
  });

  async function exigirSessao(req, res, next) {
    const leitura = req.method === 'GET' || req.method === 'HEAD';
    if (!leitura && !origemPermitida(req)) {
      return res.sendStatus(403);
    }
    const bootstrap = req.method === 'GET' && /^\/unimed\/parsConf\/?$/i.test(req.path);
    // Este GET reserva um número no ERP e deve ter sua própria validação.
    const reservaSequencia = /^\/+unimed\/+EsPeSequencia\/*$/i.test(req.path);
    const sessao = await validar(req, res, !bootstrap, leitura && !reservaSequencia);
    if (sessao) {
      res.locals.usuario = sessao.usuario;
      const validadaEm = Date.now();
      res.set({
        'X-Sessao-Expira-Em': String(validadaEm + sessao.validadeMs),
        'X-Sessao-Validada-Em': String(validadaEm),
      });
      next();
    }
  }

  return { router, exigirSessao };
}

module.exports = { criarSessao };
