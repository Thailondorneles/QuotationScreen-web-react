# 03 — Regras de negócio e cálculos

## 1. Princípios gerais

- Cálculos consideram apenas registros daquela unidade.
- Totais visuais e avaliação do ERP consideram itens marcados.
- Preço aceita até quatro casas decimais.
- Sobra é exibida com duas casas, mas o preço mantém quatro.
- Funrural é informativo e não reduz a sobra no cálculo atual.
- Frete reduz a sobra depois de rateado por item.

## 2. Modelo econômico do item

### Variáveis

| Símbolo | Campo | Descrição |
|---|---|---|
| `Q` | `quantidade` | Quantidade negociada |
| `PV` | `valorLista` | Preço unitário de venda |
| `CM` | `vlrMedio` | Custo médio unitário |
| `F` | `valorFrete` | Frete rateado do item |
| `pX` | percentuais em `impostos` | Percentual do tributo |

### Totais básicos

```text
valorVendaTotal = Q × PV
valorCustoTotal = Q × CM
sobraBruta      = valorVendaTotal − valorCustoTotal
```

## 3. Impostos básicos

Calculados sobre `valorVendaTotal`:

```text
ICMS   = valorVendaTotal × perIcms / 100
PIS    = valorVendaTotal × perPis / 100
COFINS = valorVendaTotal × perCofins / 100
IPI    = valorVendaTotal × perIpi / 100
FCP    = valorVendaTotal × perFcp / 100
```

## 4. ST e DIFAL

O tratamento só é aplicado quando `indSubsMercadoria === 1`.

### 4.1 DIFAL

Se `txt_refaz_bc_st` contém `DIF`:

```text
perDifal = per_subst_trib − per_icms
DIFAL    = valorVendaTotal × perDifal / 100
ST       = 0
```

### 4.2 ST por lista

Tem prioridade quando existe `baseST`:

```text
baseTotal = baseST × Q
ST        = baseTotal × perSubstTrib / 100
```

`baseST` vem do preço da lista ST retornada por `listaPreco/{listaST}/{item}`.

### 4.3 ST por índice

Quando não há lista ST e existe `idxSubsTrib`:

```text
baseTotal = PV × idxSubsTrib × Q
ST        = baseTotal × perSubstTrib / 100
```

### 4.4 ST sobre venda

Na ausência de lista e índice:

```text
ST = valorVendaTotal × perSubstTrib / 100
```

## 5. Funrural

```text
valorFunrural = valorVendaTotal × perFunrural / 100
```

O valor é exibido e acumulado separadamente. **Não é subtraído da sobra atual.** Essa é uma decisão explícita do código.

## 6. Sobra

```text
totalImpostos  = ICMS + PIS + COFINS + IPI + DIFAL + ST + FCP
sobraReal      = sobraBruta − totalImpostos − F
sobraPercentual = sobraReal / valorVendaTotal × 100
```

Se quantidade ou preço são zero, todos os resultados retornam zero.

### Total da unidade

```text
valorVendaUnidade = soma(valorVendaTotal dos itens selecionados)
sobraUnidade      = soma(sobraReal dos itens selecionados)
sobraPercentualUnidade = sobraUnidade / valorVendaUnidade × 100
```

## 7. Edição inversa pela sobra

Ao informar uma sobra desejada `M`, o sistema calcula o preço necessário.

### Percentual variável

```text
percentualSobreVenda = (ICMS + PIS + COFINS + IPI + FCP) / 100
```

Dependendo de ST/DIFAL, soma-se percentual adicional ou calcula-se imposto fixo.

```text
divisor = 1 − percentualSobreVenda − M
novoPV  = (custoTotal + frete + impostoFixo) / divisor / Q
```

Regras:

- `divisor` deve ser maior que zero;
- a sobra desejada deve ser menor que o percentual máximo calculado;
- preço final é arredondado para quatro casas;
- preço promocional não pode ficar abaixo do mínimo;
- preço de contrato não pode ser alterado.

## 8. Lista de preço

### Promocional

Detectada quando qualquer campo normalizado como `ind_promocao` vale `1`.

Efeito:

- preço original vira `valorMinimoLista`;
- usuário pode aumentar, mas não reduzir;
- se reduzir, o sistema restaura o mínimo e exibe mensagem.

### Contrato

Detectada quando `tip_aplicacao` vale `1`.

Efeito:

- `precoListaBloqueado = true`;
- preço e sobra ficam desabilitados;
- item é ignorado na verificação individual de margem AC/MMT;
- ainda participa da sobra total da unidade.

## 9. Tributação obrigatória

`num_seq_busca` nulo ou ausente significa que o ERP não encontrou tributação.

Consequências:

- item recebe destaque visual;
- checkbox é desmarcado;
- checkbox fica desabilitado;
- seleção em massa não o marca;
- integração bloqueia caso algum item sem tributação permaneça selecionado por inconsistência.

## 10. Quantidade múltipla

Se `qtdMultiplo` existe e ambos os valores são positivos:

```text
quantidade % qtdMultiplo deve ser 0
```

Em caso contrário, a quantidade é apagada.

## 11. Rateio de frete

Constante:

```text
FATOR_CUBAGEM = 300 kg/m³
```

Para cada item selecionado:

```text
pesoReal   = pesoBruto × Q
volume     = qtdM3 × Q
pesoCubado = volume × 300
pesoCobranca = máximo(pesoReal, pesoCubado)
```

### Rateio principal

```text
freteItem = pesoCobrancaItem / somaPesosCobranca × freteUnidade
```

### Fallback por quantidade

Se todos os pesos de cobrança forem zero:

```text
freteItem = Q / somaQuantidades × freteUnidade
```

O rateio é arredondado para duas casas por item. Por isso, a soma dos itens pode apresentar pequena diferença centesimal em relação ao frete original.

## 12. Classificação e margem mínima

Mapeamento do retorno `des_geral`:

| Valores técnicos | Segmento exibido | Margem mínima individual |
|---|---|---:|
| `A`, `B` | AC | 4% |
| `I`, `T` | MMT | 6% |
| outros/nulo | Sem regra individual | Não aplicada |

Margem mínima total de toda unidade: **6%**.

Comparações usam percentuais arredondados para duas casas na avaliação final.

## 13. Situação ERP

### Algoritmo

```text
temBloqueioTotal = sobraTotalUnidade < 6
temBloqueioItem  = existe AC < 4 ou MMT < 6
requerAprovacao  = temBloqueioTotal ou temBloqueioItem

se requerAprovacao:
    codSituacao = 70
senão se modalidade = 7:
    codSituacao = 32
senão:
    codSituacao = 6
```

### Matriz completa

| Modalidade | Total ≥ 6% | Todos AC ≥ 4% | Todos MMT ≥ 6% | `numSeqConf` | `codSituacao` |
|---:|:---:|:---:|:---:|---:|---:|
| 2 | Sim | Sim | Sim | 2 | 6 |
| 2 | Não | qualquer | qualquer | 2 | 70 |
| 2 | Sim | Não | qualquer | 2 | 70 |
| 2 | Sim | qualquer | Não | 2 | 70 |
| 7 | Sim | Sim | Sim | 7 | 32 |
| 7 | Não | qualquer | qualquer | 7 | 70 |
| 7 | Sim | Não | qualquer | 7 | 70 |
| 7 | Sim | qualquer | Não | 7 | 70 |

Cada unidade é avaliada de forma independente. Exemplos válidos:

- 201 em situação 6 e 203 em 70;
- 201 em situação 32 e 203 em 70;
- ambas em 70;
- ambas em situação normal conforme modalidade.

## 14. Confirmação de aprovação

Situação 70 não bloqueia envio. Ela exige confirmação explícita.

Se o total estiver abaixo de 6%, a mensagem prioriza a regra total. Se o total estiver adequado, a mensagem lista itens individuais fora da regra.

## 15. Validações por saída

| Regra | Cotação | Proposta | ERP |
|---|:---:|:---:|:---:|
| Cliente | Indireta | Obrigatório | Obrigatório |
| Condição de pagamento | Contexto | Obrigatório | Obrigatório |
| Operação | Contexto tributário | Não obrigatória e não incluída | Obrigatório |
| Item selecionado | Obrigatório | Obrigatório | Obrigatório |
| Quantidade positiva | Obrigatório | Não validada explicitamente no serviço | Obrigatório |
| Tributação encontrada | Usada no contexto | Não bloqueia diretamente | Obrigatório |
| Ordem de compra | Não | Opcional | Obrigatório |
| Margens mínimas | Recalculadas | Não exibidas | Define situação/confirmação |
| Frete cotado | Opcional | Incluído se existir | Afeta sobra, não é campo direto do item ERP |

## 16. Arredondamento e formatos

- Entrada monetária: vírgula ou ponto, até quatro casas.
- Preço no ERP: string com quatro casas e vírgula, por exemplo `"9,3000"`.
- Sobra exibida e avaliada: duas casas.
- Frete rateado: duas casas por item.
- Totais monetários: formatação `pt-BR`.
- Datas do ERP: `dd/MM/yyyy`.

## 17. Pontos de atenção

1. Alterar a quantidade depois da cotação não dispara novo rateio automaticamente; recomenda-se recotar.
2. Alterar cliente ou operação limpa a transportadora selecionada e recalcula itens, mas o valor de frete já rateado nos itens pode permanecer; deve-se recotar antes de confiar na sobra.
3. Condição de pagamento alterada manualmente não possui, no fluxo atual, o mesmo recálculo global explícito de cliente/operação.
4. Itens de contrato são excluídos da regra individual, mas entram na margem total.
5. Complemento e referência não fazem parte do payload de endereço atual.
6. A proposta valida seleção, cliente e pagamento, mas não repete todas as validações do ERP.
7. O total enviado ao SimFrete converte atualmente o preço com `Number`; valores localizados como `"9,30"` podem resultar em valor inválido na cotação.
8. As comparações de margem usam o percentual arredondado para duas casas; valores matematicamente logo abaixo do limite podem ser aceitos após o arredondamento.
9. O rateio arredonda cada parcela separadamente e não compensa o resíduo no último item; pode haver diferença de centavos entre a cotação e a soma rateada.
