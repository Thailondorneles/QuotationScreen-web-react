export function maskMoneyBR(valor, casasDecimais = 2) {
  const texto = String(valor ?? '').replace(/[^\d,.]/g, '');

  if (!texto) return '';

  const ultimoSeparador = Math.max(texto.lastIndexOf(','), texto.lastIndexOf('.'));

  if (ultimoSeparador < 0) {
    return texto.replace(/\D/g, '');
  }

  const parteInteira = texto.slice(0, ultimoSeparador).replace(/\D/g, '') || '0';
  const parteDecimal = texto
    .slice(ultimoSeparador + 1)
    .replace(/\D/g, '')
    .slice(0, casasDecimais);

  return `${parteInteira},${parteDecimal}`;
}
