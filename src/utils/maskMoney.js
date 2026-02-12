export function maskMoneyBR(valor) {
  const digits = valor.replace(/\D/g, '');
  return (Number(digits) / 100).toFixed(2);
}
