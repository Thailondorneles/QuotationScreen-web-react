export async function exportarPropostas(propostas, formato) {
    try {
        const gerar = formato === 'excel'
            ? (await import('./propostaExcelService.js')).gerarPropostaExcel
            : (await import('./propostaPdfService.js')).gerarPropostaPdf;

        for (const proposta of propostas) {
            await gerar(proposta);
        }
    } catch (error) {
        const nomeFormato = formato === 'excel' ? 'Excel' : 'PDF';
        throw new Error(`Erro ao gerar proposta em ${nomeFormato}: ${error?.message || 'falha desconhecida'}`);
    }
}
