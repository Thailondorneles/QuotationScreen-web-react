import { unimedApi } from "../config/apis.js";
import { consultarComCache } from './consultaCache';

export function getTodosTiposLogradouro() {
    return consultarComCache('tiposLogradouro', async () => {
        const itens = [];
        let offset = 0;
        let hasMore;
        do {
            const { data } = await getTipLogradouro({ offset, limit: 25 });
            itens.push(...(data.items || []));
            hasMore = Boolean(data.hasMore) && Boolean(data.items?.length);
            offset += 25;
        } while (hasMore);
        return itens.filter(item => item.des_tipo?.trim());
    }, Infinity);
}

export function getTipLogradouro({ offset = 0, limit = 25 }) {
    return unimedApi.get("tipLogradouro", {
        params: { offset, limit }
    });
}
