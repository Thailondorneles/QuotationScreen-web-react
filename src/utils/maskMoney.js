export function formatarMilharesBR(valor) {
  const texto = String(valor ?? '');
  if (!texto) return '';
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const [inteiro, decimal] = normalizado.split('.');
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimal !== undefined ? `,${decimal}` : '');
}

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
