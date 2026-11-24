const axios = require('axios');
const { randomBytes, createHash } = require('node:crypto');
const express = require('express');

function criarSessao({ baseURL, appOrigin, allowHttp, authorization, inatividade, limite }) {
  const origem = new URL(appOrigin);
  const local = ['localhost', '127.0.0.1'].includes(origem.hostname);
  if (origem.origin !== appOrigin ||
      (origem.protocol !== 'https:' && !(origem.protocol === 'http:' && (local || allowHttp)))) {
    throw new Error('AUTH_APP_ORIGIN deve ser uma origem HTTPS, ou HTTP quando habilitado.');
  }
  if (!Number.isSafeInteger(inatividade) || inatividade < 1 ||
      !Number.isSafeInteger(limite) || limite < inatividade || limite > 525600) {
    throw new Error('Prazos de sessao invalidos.');
  }

  const ords = axios.create({
    baseURL,
    timeout: 7000,
    maxRedirects: 0,
    headers: { 'Content-Type': 'application/json', ...(authorization && { Authorization: authorization }) },
  });
  const ordsUrl = new URL(baseURL);
  const transportePermitido = ordsUrl.protocol === 'https:' ||
    (ordsUrl.protocol === 'http:' && allowHttp);
  const cookie = origem.protocol === 'https:' ? '__Host-quotation-session' : 'quotation-session-local';
  const opcoesCookie = { httpOnly: true, secure: origem.protocol === 'https:', sameSite: 'lax', path: '/' };
  const prazos = { inatividade_minutos: inatividade, limite_absoluto_minutos: limite };
  const router = express.Router();
  const tentativas = new Map();

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
      if (!transportePermitido) throw Object.assign(new Error(), { code: 'HTTPS_REQUIRED' });
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
    if (erro.code === 'HTTPS_REQUIRED') {
      return res.status(503).json({ codigo: 'AUTH_ORDS_HTTPS_REQUIRED' });
    }
    if (erro.response?.status === 401 && erro.response.data?.codigo === 'SESSAO_INVALIDA') {
      return res.status(401).json({ codigo: 'SESSAO_INVALIDA' });
    }
    return res.status(503).json({ codigo: 'AUTH_ORDS_INDISPONIVEL' });
  }

  async function validar(req, res, atividade) {
    res.set('Cache-Control', 'no-store');
    const token = tokenDaRequisicao(req);
    if (!token) {
      res.status(401).json({ codigo: 'SESSAO_INVALIDA' });
      return null;
    }
    try {
      const { data } = await post('auth/sessao/validar', {
        token_hash: hash(token),
        registrar_atividade: atividade ? 1 : 0,
        ...prazos,
      });
      if (data?.codigo === 'SESSAO_INVALIDA') {
        res.status(401).json({ codigo: 'SESSAO_INVALIDA' });
        return null;
      }
      if (!Number.isSafeInteger(data?.cod_pessoa) || data.cod_pessoa <= 0 ||
          !Number.isSafeInteger(data?.validade_ms) || data.validade_ms <= 0) {
        const motivo = data?.codigo === 'ERRO_INTERNO' ? 'ERRO_INTERNO'
          : ['ATIVIDADE_INVALIDA', 'PRAZO_INVALIDO'].includes(data?.codigo) ? data.codigo
          : 'FORMATO_INVALIDO';
        console.warn('[sessao] Validacao do ORDS sem sessao confirmada', motivo);
        throw new Error('Resposta invalida do ORDS.');
      }
      return { usuario: { codigoPessoa: data.cod_pessoa }, validadeMs: data.validade_ms };
    } catch (erro) {
      responderFalha(res, erro);
      return null;
    }
  }

  async function revogar(token) {
    const resposta = await post('auth/sessao/revogar', { token_hash: hash(token) });
    if (resposta.status !== 204 && !(resposta.status === 200 && resposta.data?.codigo === 'SESSAO_REVOGADA')) {
      throw new Error('Resposta invalida do ORDS.');
    }
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
    for (const [chave, registro] of tentativas) {
      if (registro.expiraEm <= agora) tentativas.delete(chave);
    }
    const chave = `${req.ip}|${usuario.trim().toUpperCase()}`;
    const registro = tentativas.get(chave) || { total: 0, expiraEm: agora + 60000 };
    if (registro.total >= 8 || (!tentativas.has(chave) && tentativas.size >= 1000)) {
      return res.set('Retry-After', '60').sendStatus(429);
    }
    registro.total += 1;
    tentativas.set(chave, registro);

    const token = randomBytes(32).toString('hex');
    try {
      const { data } = await post('auth/login', {
        username: usuario.trim(), password: senha, token_hash: hash(token), ...prazos,
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
      return res.cookie(cookie, token, opcoesCookie).status(204).end();
    } catch (erro) {
      if ([401, 403].includes(erro.response?.status) && erro.response.data?.success === false) {
        return res.status(401).json({ codigo: 'ACESSO_NEGADO' });
      }
      return responderFalha(res, erro);
    }
  });

  router.get('/sessao', async (req, res) => {
    const sessao = await validar(req, res, false);
    if (sessao) res.json(sessao);
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
    if (req.method !== 'GET' && req.method !== 'HEAD' && !origemPermitida(req)) {
      return res.sendStatus(403);
    }
    const bootstrap = req.method === 'GET' && /^\/unimed\/parsConf\/?$/i.test(req.path);
    const sessao = await validar(req, res, !bootstrap);
    if (sessao) {
      res.locals.usuario = sessao.usuario;
      next();
    }
  }

  return { router, exigirSessao };
}

module.exports = { criarSessao };
