import logoUrl from '../../imagens/nlprod2023.png';
import { parametros } from '../../config/parametrosAplicacao';

let logoDataUrlPromise = null;

async function lerImagem(url) {
    const controller = new AbortController();
    const limite = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Imagem indisponível');
        const blob = await response.blob();
        const assinatura = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => assinatura[i] === byte)) throw new Error('Imagem deve ser PNG');
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } finally {
        clearTimeout(limite);
    }
}

export function carregarLogoProposta() {
    if (!logoDataUrlPromise) {
        logoDataUrlPromise = lerImagem(parametros.PROPOSTA_LOGO || logoUrl)
            .catch(() => lerImagem(logoUrl))
            .catch(error => { logoDataUrlPromise = null; throw error; });
    }

    return logoDataUrlPromise;
}
