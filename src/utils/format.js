export const format = {
  numero: v => Number(v || 0).toLocaleString('pt-BR'),

  moeda: v => Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }),

  percentual: v => `${Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`,

  peso: v => `${Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })} kg`,

  volume: v => `${Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  })} m³`
};
