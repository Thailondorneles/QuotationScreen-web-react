const texto = valor => valor == null ? null : typeof valor === 'string' ? valor : JSON.stringify(valor);

async function registrarIntegracaoLog(api, { numSeq, status, payload, respostaErp = null, erro = null }) {
  try {
    const { data } = await api.post('EsPePedidosIntegracaoLog', {
      numSeq,
      status,
      payload: texto(payload),
      usuario: null,
      respostaErp: texto(respostaErp),
      erro: texto(erro)
    });
    if (data?.success === false || data?.sucesso === false || data?.erro ||
        (typeof data === 'string' && /<!doctype|<html/i.test(data))) {
      throw new Error(data?.erro || 'A API nao confirmou a gravacao do log.');
    }
    return true;
  } catch (error) {
    // Nao repetir: a API pode ter gravado antes de uma falha de comunicacao.

    return false;
  }
}

module.exports = { registrarIntegracaoLog };
