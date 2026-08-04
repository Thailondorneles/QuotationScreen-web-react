export function maskMoneyBR(valor, casasDecimais = 2) {
  const digits = valor.replace(/\D/g, '');
  return (Number(digits) / (10 ** casasDecimais)).toFixed(casasDecimais);
}
