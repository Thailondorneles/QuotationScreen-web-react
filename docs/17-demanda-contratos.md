# Demanda contratos

Primeira etapa: `/demanda-contratos`, disponível no menu lateral, em **Clientes → Informações de Clientes**.

Reutiliza `LovClientes`, o cadastro de clientes, as consultas complementares e os representantes. Mantém o cabeçalho, os cartões e os campos do pedido de venda. A tela é de consulta; não altera cadastros no NL.

## Organização

- `views/DemandaContratos.js`: módulo e navegação interna.
- `components/demandaContratos/InformacoesCliente.js`: seleção do cliente e apresentação do cadastro, atendimento e contatos.
- `hooks/demandaContratos/useInformacoesCliente.js`: consulta, limpeza e descarte de respostas antigas após troca do cliente ou saída da tela.
- `services/demandaContratos/clientes.js`: composição das consultas existentes e avisos de falha parcial.

## Fontes

| Informação | Consulta |
| --- | --- |
| Seleção por código, nome ou CNPJ | `clientes`, via `LovClientes` |
| Consulta por código e contato | `clientes/:filtro`, com seleção pelo código exato |
| Dados complementares e consultor | `ClienteDetalhado/:codPessoa` |
| Representantes | `representantesCliente/:filtro` |

Consultas complementares rodam em paralelo. Falhas parciais preservam o cadastro disponível e exibem aviso com nova tentativa. Campos sem informação aparecem como “Não informado”.

## Contratos e consumo

- `GET demandaContratos?cod_cliente=:cliente&situacao=37`: contratos, com quantidade mensal, vigência, marca e consumo.
- `GET demandaContratos?cod_cliente=:cliente&situacao=14`: pedidos de reserva, apresentados separadamente.
- Usa a instância `unimedApi` e o proxy existentes; não fixa o IP da API no componente.
- Envia o filtro de cliente em todas as páginas ORDS. O cache de cinco minutos é separado por situação e cliente; “Consultar novamente” invalida o cache.
- `txt_livre1` contém pares `MM/AAAA;quantidade;`. Meses ausentes contam como zero na janela de média; o mês corrente não entra na média.
- Média dos últimos três meses fechados, limitada ao mês de início. Para vencidos sem consumo posterior, usa os últimos meses da vigência. Efetividade por item = média / quantidade negociada × 100.
- A apresentação mantém a separação entre consultas sem registros e falhas. Os totais combinados dependem de ambas as consultas para não apresentar números incompletos.

O vínculo explícito é `num_pedido_vinculado`. A composição segue o HTML original: cada pedido 14 fornece itens, datas de vigência, preço e consumo. O item correspondente do 37 vinculado fornece somente a quantidade originalmente contratada. Se não houver item correspondente, usa a quantidade do 14 como referência e deixa a quantidade contratada como não informada. Itens do 37 sem reserva permanecem visíveis com seus próprios dados. Não se somam consumos de 14 e 37 para o mesmo item vinculado.

`Contratado na vigência` = quantidade mensal de referência × diferença de meses entre início e fim (mínimo 1) × preço unitário. `Consumido` = soma de todos os meses do histórico × preço unitário. O valor é estimado pelo preço atual do pedido, não corresponde a uma soma de valores de notas fiscais. As quantidades de reserva da situação 14 não representam posição física efetivamente reservada.

Arquivos: `services/demandaContratos/contratos.js`, `domain/demandaContratos/contratos.js` e `components/demandaContratos/ContratosCliente.js`.
