async function mapComConcorrencia(itens, limite, processar) {
    const resultados = Array(itens.length);
    let proximoIndice = 0;

    async function worker() {
        while (proximoIndice < itens.length) {
            const indice = proximoIndice++;
            try {
                resultados[indice] = {
                    status: 'fulfilled',
                    value: await processar(itens[indice])
                };
            } catch (reason) {
                resultados[indice] = { status: 'rejected', reason };
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
    return resultados;
}

export { mapComConcorrencia };
