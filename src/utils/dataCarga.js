export function dataCargaParaIso(valor) {
    if (!valor) return null;
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    if (!partes) return null;
    const [, dia, mes, ano] = partes;
    const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);
    if (Number(ano) < 1 || data.getFullYear() !== Number(ano) || data.getMonth() + 1 !== Number(mes) || data.getDate() !== Number(dia)) return null;
    return `${ano}-${mes}-${dia}`;
}

export function dataCargaParaBr(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor || ''));
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '';
}

export function mascararDataCarga(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    return digitos.slice(0, 2) + (digitos.length > 2 ? `/${digitos.slice(2, 4)}` : '') + (digitos.length > 4 ? `/${digitos.slice(4)}` : '');
}
