import { calcularSobraComFrete } from "../../utils/cobrancaFrete.js";

// Recebe os dados e callbacks do render atual; não mantém estado próprio.
export function criarCalculosPedido({
    cobrancaCalculada,
    numeroDecimalBR
}) {
    function resolverSistemaLinear(matriz, termos) {
        const sistema = matriz.map((linha, indice) => [...linha, termos[indice]]);
        const tamanho = sistema.length;

        for (let coluna = 0; coluna < tamanho; coluna += 1) {
            let pivo = coluna;
            for (let linha = coluna + 1; linha < tamanho; linha += 1) {
                if (Math.abs(sistema[linha][coluna]) > Math.abs(sistema[pivo][coluna])) pivo = linha;
            }
            if (Math.abs(sistema[pivo][coluna]) < 1e-12) return null;
            [sistema[coluna], sistema[pivo]] = [sistema[pivo], sistema[coluna]];

            const divisor = sistema[coluna][coluna];
            for (let j = coluna; j <= tamanho; j += 1) sistema[coluna][j] /= divisor;
            for (let linha = 0; linha < tamanho; linha += 1) {
                if (linha === coluna) continue;
                const fator = sistema[linha][coluna];
                for (let j = coluna; j <= tamanho; j += 1) sistema[linha][j] -= fator * sistema[coluna][j];
            }
        }
        return sistema.map(linha => linha[tamanho]);
    }

    function calcularTributosItem(item, valorVendaTotal) {
        const imp = item.impostos || {};
        const frete = cobrancaCalculada.porItem[item.seq] || 0;
        const ativo = indicador => Number(indicador) === 1 ? 1 : 0;
        const rIpi = Number(imp.perIpi || 0) / 100;
        const rIcms = Number(imp.perIcms || 0) / 100;
        const rPis = Number(imp.perPis || 0) / 100;
        const rCofins = Number(imp.perCofins || 0) / 100;
        const baseIpiFixa = valorVendaTotal + ativo(imp.indIpiFreteSoma) * frete;
        const baseIcmsFixa = valorVendaTotal + ativo(imp.indIcmsFreteSoma) * frete;
        const basePiscofFixa = valorVendaTotal + ativo(imp.indPiscofFreteSoma) * frete;
        const matriz = [
            [1, 0, 0, 0],
            [-rIcms * ativo(imp.indIcmsIpiSoma), 1, -rIcms * ativo(imp.indIcmsPisSoma), -rIcms * ativo(imp.indIcmsCofinsSoma)],
            [-rPis * ativo(imp.indPiscofIpiSoma), rPis * ativo(imp.indPiscofIcmsAbate), 1, 0],
            [-rCofins * ativo(imp.indPiscofIpiSoma), rCofins * ativo(imp.indPiscofIcmsAbate), 0, 1]
        ];
        const termos = [rIpi * baseIpiFixa, rIcms * baseIcmsFixa, rPis * basePiscofFixa, rCofins * basePiscofFixa];
        const [ipi, icms, pis, cofins] = resolverSistemaLinear(matriz, termos) || [0, 0, 0, 0];
        const baseIpi = baseIpiFixa;
        const baseIcms = baseIcmsFixa
            + ativo(imp.indIcmsIpiSoma) * ipi
            + ativo(imp.indIcmsPisSoma) * pis
            + ativo(imp.indIcmsCofinsSoma) * cofins;
        const basePiscof = basePiscofFixa
            + ativo(imp.indPiscofIpiSoma) * ipi
            - ativo(imp.indPiscofIcmsAbate) * icms;

        return { ipi, icms, pis, cofins, baseIpi, baseIcms, basePiscof };
    }

    function calcularValorListaPorSobra(item, sobraPercentualDesejada) {
        const qtd = Number(item.quantidade || 0);
        const margem = Number(String(sobraPercentualDesejada).replace(',', '.')) / 100;

        if (!qtd || !Number.isFinite(margem)) return null;

        const itemSemPreco = { ...item, valorLista: 0 };
        const impostosFixos = calcularValoresItem(itemSemPreco, 0).totalImpostos;
        const impostosUmaUnidadeVenda = calcularValoresItem(itemSemPreco, 1).totalImpostos;
        const impostoVariavelPorReal = impostosUmaUnidadeVenda - impostosFixos;
        const divisor = 1 - impostoVariavelPorReal - margem;
        if (divisor <= 0) return null;

        const custoTotal = Number(item.vlrMedio || 0) * qtd;
        const frete = Number(item.valorFrete || 0);
        return (custoTotal + frete - (cobrancaCalculada.porItem[item.seq] || 0) + impostosFixos) / divisor / qtd;
    }

    function calcularPercentualMaximoSobra(item) {
        const itemSemPreco = { ...item, valorLista: 0 };
        const impostosFixos = calcularValoresItem(itemSemPreco, 0).totalImpostos;
        const impostosUmaUnidadeVenda = calcularValoresItem(itemSemPreco, 1).totalImpostos;
        return (1 - (impostosUmaUnidadeVenda - impostosFixos)) * 100;
    }

    function calcularValoresItem(item, valorVendaTotalForcado = null) {
        const qtd = Number(item.quantidade || 0);
        const vlrLista = numeroDecimalBR(item.valorLista);
        const vlrMedio = Number(item.vlrMedio || 0);

        if (!qtd || (!vlrLista && valorVendaTotalForcado === null)) {
            return {
                valorVendaTotal: 0,
                sobraReal: 0,
                sobraPercentual: 0,
                icms: 0,
                pis: 0,
                cofins: 0,
                ipi: 0,
                difal: 0,
                st: 0,
                fcp: 0
            };
        }

        const valorVendaTotal = valorVendaTotalForcado === null ? qtd * vlrLista : valorVendaTotalForcado;
        const valorCustoTotal = qtd * vlrMedio;

        const imp = item.impostos || {};
        const indSubsMercadoria = Number(imp.indSubsMercadoria || 0)
        const { icms, pis, cofins, ipi, baseIcms, basePiscof, baseIpi } = calcularTributosItem(item, valorVendaTotal);
        const fcp = valorVendaTotal * (Number(imp.perFcp || 0) / 100);

        let difal = 0;
        let st = 0;
        let baseSubs = 0;

        if (indSubsMercadoria === 1) {
            if (imp.difal && imp.difal.toUpperCase().includes('DIF')) {
                const perDifal = Number(imp.perDifal || 0);
                baseSubs = valorVendaTotal;
                baseSubs += Number(imp.indSubsFreteSoma) === 1 ? (cobrancaCalculada.porItem[item.seq] || 0) : 0;
                baseSubs += Number(imp.indSubsIpiSoma) === 1 ? ipi : 0;
                baseSubs += Number(imp.indSubsPisSoma) === 1 ? pis : 0;
                baseSubs += Number(imp.indSubsCofinsSoma) === 1 ? cofins : 0;
                difal = baseSubs * (perDifal / 100);
            } else {
                // 2.1 — ST por LISTA (prioridade maior que índice)
                if (item.baseST) {
                    baseSubs = item.baseST * qtd;
                }
                // 2.2 — ST por ÍNDICE
                else if (imp.idxSubsTrib) {
                    baseSubs = (valorVendaTotal * imp.idxSubsTrib);
                } else {
                    baseSubs = valorVendaTotal;
                }
                baseSubs += Number(imp.indSubsFreteSoma) === 1 ? (cobrancaCalculada.porItem[item.seq] || 0) : 0;
                baseSubs += Number(imp.indSubsIpiSoma) === 1 ? ipi : 0;
                baseSubs += Number(imp.indSubsPisSoma) === 1 ? pis : 0;
                baseSubs += Number(imp.indSubsCofinsSoma) === 1 ? cofins : 0;
                st = baseSubs * (Number(imp.perSubstTrib || 0) / 100);
            }
        }

        const totalImpostos = icms + pis + cofins + ipi + difal + st + fcp;

        // Funrural (ICMS desonerado) — não reduz a sobra, mas precisa ser mostrado e acumulado separadamente
        const perFunrural = Number(imp.perFunrural || imp.per_funrural || 0);
        const valorFunrural = valorVendaTotal * (perFunrural / 100);

        const sobraBruta = valorVendaTotal - valorCustoTotal;
        const frete = Number(item.valorFrete || 0);
        const { sobraReal, sobraPercentual } = calcularSobraComFrete(
            valorVendaTotal, valorCustoTotal, totalImpostos, frete, cobrancaCalculada.porItem[item.seq] || 0
        ); // não subtrai Funrural
        return {
            valorVendaTotal,
            valorCustoTotal,
            icms,
            pis,
            cofins,
            ipi,
            difal,
            st,
            fcp,
            baseIcms,
            basePiscof,
            baseIpi,
            baseSubs,
            valorFunrural,
            totalImpostos,
            sobraBruta,
            sobraReal,
            sobraPercentual
        };
    }

    return { resolverSistemaLinear, calcularTributosItem, calcularValorListaPorSobra, calcularPercentualMaximoSobra, calcularValoresItem };
}
