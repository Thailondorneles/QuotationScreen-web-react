# Otimização das consultas — 23/09/2026

As alterações abaixo foram aplicadas no frontend. As APIs existentes continuam sendo utilizadas; os endpoints em lote descritos adiante são uma proposta para implementação no ORDS.

## O que já mudou

| Fluxo | Comportamento atual |
| --- | --- |
| Parâmetros | App e página de configurações compartilham uma única consulta inicial, inclusive em StrictMode. A tela recebe as configurações sem ser desmontada. |
| Edição dos parâmetros | Salvar invalida o cache de consulta da lista, mas não altera os parâmetros em uso. Recarregar a página continua sendo necessário para aplicá-los. |
| Histórico de itens do cliente | Cache de cinco minutos por cliente, compartilhando requisições em andamento. Abrir/fechar a LOV e voltar à janela não consultam o histórico novamente. Trocar de cliente consulta o cache ou busca dados novos se expirou. Não há atualização periódica em segundo plano. |
| Catálogos de itens/clientes | Carregados na primeira abertura da respectiva LOV, em vez de antecipadamente ao entrar no pedido. |
| Lotes | Buscados quando abrir a LOV ou houver itens no pedido. O cache existente é compartilhado. |
| Impostos e acordos | Cache de cinco minutos compartilhado entre LOV e pedido. Erros não ficam guardados como resultado válido. |
| Fila da LOV | Ao fechar ou trocar de página/contexto, os workers antigos deixam de iniciar novas consultas. Até quatro impostos e dois acordos podem estar simultaneamente em andamento nessa LOV. As requisições já iniciadas terminam e podem alimentar o cache, sem atualizar uma lista obsoleta. |
| Recalcular itens | Invalida impostos, acordos e informações de listas de preços antes de recalcular; o clique força a renovação desses dados comerciais. |
| Tipos de logradouro | Buscados ao interagir com o endereço ou aplicar CEP/endereço. Todas as páginas são compartilhadas e guardadas até recarregar o navegador. |
| Operações, condições, cidades, UF e CEP | LOV fechada não inicia consulta. Serviços reaproveitam respostas por URL e parâmetros durante cinco minutos, incluindo chamadas simultâneas. Consultas com paginação/filtro diferentes são distintas. |

O cache de impostos distingue operação, unidade, cliente, condição de pagamento e produto. Alterar qualquer uma dessas chaves não reaproveita a resposta de outro contexto.

Não houve mudança no formato das APIs nem nas regras fiscais. Os outros riscos levantados na auditoria, como envio parcial ao ERP, permanecem um trabalho separado.

## O que mudar no ORDS

### 1. Histórico: reduzir as linhas retornadas por produto

Atualizado no backend: `clientesUltimaCompra/:id` agora retorna as cinco compras mais recentes de cada produto, conforme informado. O frontend agrupa por `cod_item`, ordena por `dta_emissao` e preserva `qtd_lancamento`, sem consultas adicionais.

`HISTORICO_COMPRAS_POR_ITEM` pode reduzir a quantidade exibida. Valores acima de cinco continuam mostrando no máximo cinco, conforme o limite da API. O cache permanece em cinco minutos por cliente.

### 2. Impostos: receber vários produtos na mesma consulta

Hoje cada produto é consultado separadamente para cada unidade. Para 25 produtos, são 50 chamadas.

Criar um endpoint adicional, preservando o atual:

```text
GET impostosLote/150/201/22222/8?itens=10117,10188,10237
GET impostosLote/150/203/22222/8?itens=10117,10188,10237
```

A ordem dos argumentos do caminho continua sendo operação/unidade/cliente/condição. Retornar um objeto com `items`, contendo um resultado por código solicitado. Cada resultado precisa incluir `cod_item`, `cod_unidade` e todos os campos atualmente fornecidos por `impostos`, não somente o preço.

O contrato deve representar explicitamente item sem tributação (`num_seq_busca` nulo, conforme contrato atual) e distinguir isso de uma falha ao consultar. Não omitir silenciosamente os produtos que deram erro. A ordem das linhas não deve ser usada para associar preço e produto: o frontend usará o código.

Assim, a página de 25 produtos precisará de **duas chamadas de impostos**, uma por unidade. Usar SQL em conjunto quando possível; se o servidor apenas executar as mesmas 50 consultas internamente, o ganho principal será no tráfego/overhead HTTP, não na quantidade de cálculos.

### 3. Acordos: consultar os produtos da página em lote

Criar um endpoint adicional:

```text
GET itensAcordosLote/22222?itens=10117,10188,10237
```

Formato sugerido:

```json
{
  "items": [
    { "cod_item": 10117, "acordos": [] },
    { "cod_item": 10188, "acordos": [] },
    { "cod_item": 10237, "acordos": [] }
  ],
  "hasMore": false
}
```

Quando existirem acordos, preencher o array com os mesmos campos que `itensAcordos/:item/:cliente` já retorna. Array vazio significa consulta concluída sem acordos; erro deve ser sinalizado, não convertido em array vazio.

Se houver limite de acordos por item, defini-lo explicitamente e informar truncamento. Evitar que uma paginação global remova produtos inteiros da página solicitada.

Isso troca **25 chamadas individuais por uma consulta**.

### 4. Catálogo de itens: incluir o múltiplo

Implementado: `itens` retorna `qtd_multiplo` e `cod_um`. A LOV usa esses campos diretamente, sem consultar `itensDetalhados`. Quando o múltiplo for nulo, inválido ou não positivo, sugere quantidade 1. A quantidade escolhida e o múltiplo seguem para as duas unidades do pedido.

Os detalhes continuam sendo consultados ao adicionar o produto para custo, dimensões e demais dados, mas não substituem o múltiplo da listagem.

### Parâmetros e listas auxiliares

`parsConf`, `tipLogradouro`, `operacoes`, `condPgto`, `cidades`, `uf` e `ceps` não precisam mudar de contrato para aproveitar estas melhorias do frontend.

Os endpoints em lote devem validar códigos, limitar a quantidade de produtos por requisição (por exemplo, 25), usar parâmetros vinculados no SQL e impedir que um filtro inválido vire uma consulta sem restrições. A paginação do ORDS não deve truncar silenciosamente os itens solicitados.

## Ganho esperado após implementar os lotes

Para uma página nova de 25 produtos, impostos e acordos passariam de **75 chamadas para 3**. Isso depende dos novos endpoints e de uma adaptação posterior dos services. Com as mudanças atuais do frontend, a primeira página ainda usa chamadas individuais; reaberturas dentro do cache e adição ao pedido reaproveitam os resultados.

## Validação realizada

- 49 verificações locais passaram: cálculos, exportações PDF/Excel, cache/expiração/invalidação, inicialização React, atualização visual dos parâmetros sem remontagem, LOVs fechadas e cancelamento das filas.
- Testes confirmaram uma única consulta de parâmetros, nenhuma carga inicial de catálogos e nenhuma chamada adicional de impostos/acordos ao reabrir a mesma LOV dentro do cache.
- Build de produção aprovado.
- Nenhuma consulta real às APIs foi necessária nesta alteração. Integrações foram simuladas.
- Scripts e resultados ficam fora do projeto em `C:\Desenvolvimento\.codex-audit-quotation\optimizations.cjs` e `optimization-results.json`.
