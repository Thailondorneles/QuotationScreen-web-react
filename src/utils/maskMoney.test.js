import { formatarMilharesBR } from './maskMoney';

test.each([
  ['1115,14', '1.115,14'],
  [1115.14, '1.115,14'],
  ['1234567.7962', '1.234.567,7962'],
  ['0.7962', '0,7962'],
  ['1115,1400', '1.115,1400'],
  ['1000', '1.000'],
  ['1.115,1400', '1.115,1400'],
  [0, '0'],
  ['', '']
])('formata %s sem arredondar ou perder casas decimais', (valor, esperado) => {
  expect(formatarMilharesBR(valor)).toBe(esperado);
});
