# Demanda contratos

Primeira etapa: `/demanda-contratos`, disponível no menu lateral, em **Clientes → Informações de Clientes**.

Reutiliza a interface de `LovClientes` com um carregador exclusivo da carteira. O Express deriva `cod_rep_externo` da sessão e verifica o vínculo do cliente também nas consultas por código. A lupa de Pedidos usa o serviço original. A tela de Demandas consulta dados do NL e permite exportações locais.

## Organização

- `views/DemandaContratos.js`: módulo e navegação interna.
- `components/demandaContratos/InformacoesCliente.js`: seleção do cliente e apresentação do cadastro, atendimento e contatos.
- `hooks/demandaContratos/useInformacoesCliente.js`: consulta, limpeza e descarte de respostas antigas após troca do cliente ou saída da tela.
- `services/demandaContratos/clientes.js`: composição das consultas existentes e avisos de falha parcial.

## Fontes

| Informação | Consulta |
| --- | --- |
| Seleção por código, nome ou CNPJ | `/api/unimed/carteira/clientes` |
| Consulta por código e contato | `/api/unimed/carteira/clientes/:codigo` |
| Dados complementares e consultor | `/api/unimed/carteira/ClienteDetalhado/:codigo` |
| Representantes | `/api/unimed/carteira/representantesCliente/:codigo` |

Consultas complementares rodam em paralelo. Falhas parciais preservam o cadastro disponível e exibem aviso com nova tentativa. Campos sem informação aparecem como “Não informado”.

## Contratos e consumo

- `GET demandaContratos?cod_cliente=:cliente&situacao=37`: contratos, com quantidade mensal, vigência, marca e consumo.
- `GET demandaContratos?cod_cliente=:cliente&situacao=14`: pedidos de reserva, apresentados separadamente.
- Usa a instância `unimedApi` e o proxy existentes; não fixa o IP da API no componente.
- Na Visão Geral, o Express envia apenas o representante da sessão, sem filtro de cliente. Na consulta por código, exige também que o cliente pertença à carteira.
- Envia o filtro de cliente em todas as páginas ORDS. O cache de cinco minutos é separado por situação e cliente; “Consultar novamente” invalida o cache.
- `txt_livre1` contém pares `MM/AAAA;quantidade;`. Meses ausentes contam como zero na janela de média; o mês corrente não entra na média.
- Média dos últimos três meses fechados, limitada ao mês de início. Para vencidos sem consumo posterior, usa os últimos meses da vigência. Efetividade por item = média / quantidade negociada × 100.
- A apresentação mantém a separação entre consultas sem registros e falhas. Os totais combinados dependem de ambas as consultas para não apresentar números incompletos.

O vínculo explícito é `num_pedido_vinculado`. A composição segue o HTML original: cada pedido 14 fornece itens, datas de vigência, preço e consumo. O item correspondente do 37 vinculado fornece somente a quantidade originalmente contratada. Se não houver item correspondente, usa a quantidade do 14 como referência e deixa a quantidade contratada como não informada. Itens do 37 sem reserva permanecem visíveis com seus próprios dados. Não se somam consumos de 14 e 37 para o mesmo item vinculado.

`Contratado na vigência` = quantidade mensal de referência × diferença de meses entre início e fim (mínimo 1) × preço unitário. `Consumido` = soma de todos os meses do histórico × preço unitário. O valor é estimado pelo preço atual do pedido, não corresponde a uma soma de valores de notas fiscais. As quantidades de reserva da situação 14 não representam posição física efetivamente reservada.

Arquivos: `services/demandaContratos/contratos.js`, `domain/demandaContratos/contratos.js` e `components/demandaContratos/ContratosCliente.js`.

## Sugestão de visita

Exibida abaixo de “Itens por marca”. Consulta `GET notasSaida` com `cod_cliente`, `data_inicio`, `data_fim`, `offset` e `limit`, usando o proxy existente e todas as páginas ORDS. Período: mês corrente parcial mais cinco meses anteriores, do primeiro dia do mês inicial até hoje. Cache separado por cliente e período, com atualização manual.

O Express verifica a carteira do cliente antes de encaminhar `notasSaida`. Para separar vendas de representantes diferentes que atendem o mesmo cliente, o ORDS ainda precisa aplicar um filtro de representante nessa consulta.

- **Potencial para novo contrato:** todos os códigos com ao menos uma venda positiva no período que não aparecem nos contratos vigentes do cliente. Não exige frequência mínima de compra. Contratos vencidos não impedem a sugestão.
- **Itens de contrato para ampliar:** todos os registros vigentes cuja média de consumo contratual supera a quantidade mensal de referência. O limite é estritamente 100%, inclusive excessos abaixo da tolerância visual de 10%. Sem vínculo, preserva a base da reserva conforme a regra da tela.
- Os totais de vendas são líquidos das devoluções, mantendo o sinal retornado. Quantidade média de vendas = quantidade líquida / 6, mesmo com meses sem compras.
- Último preço pago = soma dos valores de vendas positivas da última data / soma das respectivas quantidades. Devoluções não atualizam a última data de compra.
- A consulta de vendas falhar não impede as sugestões de ampliação calculadas a partir dos contratos.
- Ambas as listas têm cabeçalho fixo e rolagem limitada à altura das primeiras dez linhas.

Arquivos: `services/demandaContratos/vendas.js`, `domain/demandaContratos/sugestoes.js` e `components/demandaContratos/SugestaoVisita.js`.

## Itens para possível acordo

As listas de novos itens e ampliação permitem seleção por código do item, reunida em um único quadro. O mesmo código não é incluído duas vezes. A seleção pertence ao cliente atual e é reiniciada ao trocar de cliente.

- Novo item: quantidade inicial = média de vendas arredondada para cima, mínimo 1.
- Ampliação: quantidade inicial = maior entre média contratual e quantidade mensal de referência, arredondada para cima.
- Preço inicial: último preço vendido disponível; sem venda, preço do contrato. Pode ser editado, assim como marca e quantidade. Preços iniciais são arredondados a duas casas, como no modelo original.
- Cliente e contatos vêm do cadastro consultado; consultor vem dos dados complementares e pode ser preenchido ou corrigido no quadro, assim como e-mail, telefone e representante. Esses ajustes não alteram o cadastro no NL.
- O PDF A4 segue o modelo anexado “Itens para possível acordo”: cliente, consultor, oportunidade, itens, total mensal e observação de documento informativo sem compromisso comercial. A opção de ocultar preços remove valores unitários, totais e total mensal do PDF.
- Nenhum envio de e-mail ou gravação de pedido é executado ao baixar o PDF.

Arquivos: `domain/demandaContratos/acordo.js`, `components/demandaContratos/ItensAcordo.js` e `services/demandaContratos/acordoPdf.js`.
