# 09 — Estratégia e matriz de testes

## 1. Objetivo

Esta matriz cobre o comportamento funcional e de regressão do simulador de Pedido de Venda vigente em **18/08/2026**. O objetivo é validar a jornada completa, os cálculos, as saídas por unidade e os contratos de integração sem confundir limitações conhecidas com funcionalidades pretendidas.

Documentos de apoio:

- [Fluxo funcional](02-fluxo-funcional-tela.md)
- [Regras de negócio e cálculos](03-regras-negocio-calculos.md)
- [Integrações e APIs](04-integracoes-apis.md)
- [Payload ERP](05-payload-erp.md)
- [Guia operacional](07-guia-operacional.md)

## 2. Convenções

### 2.1. Prioridade

| Prioridade | Critério |
|---|---|
| P0 | Bloqueia venda, gera valor/situação incorreta, integra pedido errado ou impede saída principal |
| P1 | Regra importante, erro recuperável ou impacto operacional relevante |
| P2 | Apresentação, conveniência, acessibilidade ou cenário de baixa frequência |

### 2.2. Tipo

| Tipo | Significado |
|---|---|
| F | Funcional |
| I | Integração/API |
| C | Cálculo |
| UI | Interface e responsividade |
| A11Y | Acessibilidade e teclado |
| CH | Caracterização de comportamento/limitação conhecida |

### 2.3. Casos de caracterização

Casos identificados como `CH` registram o que o sistema faz hoje, inclusive quando há risco. Eles não devem ser tratados automaticamente como aceite do comportamento para o futuro.

O símbolo **⚠** indica uma limitação ou risco conhecido que deve constar no relatório de execução.

## 3. Massa de dados recomendada

Preparar dados controlados ou mocks com:

| Código de massa | Característica |
|---|---|
| CLI-OK | Cliente com representante, operação, condição, contato, histórico, limite e endereço padrão |
| CLI-SEM-HIST | Cliente sem compras anteriores |
| CLI-SEM-END | Cliente sem endereço padrão |
| CLI-ALT | Cliente com operação/condição diferentes de CLI-OK |
| ITEM-AC | Classificação `A` ou `B` |
| ITEM-MMT | Classificação `I` ou `T` |
| ITEM-OUTRO | Classificação sem regra individual |
| ITEM-MULT | Quantidade múltipla maior que 1 |
| ITEM-PROMO | Lista com `ind_promocao = 1` |
| ITEM-CONTRATO | Lista com `tip_aplicacao = 1` |
| ITEM-SEM-TRIB | Imposto sem `num_seq_busca` |
| ITEM-ST-LISTA | ST com código de lista |
| ITEM-ST-INDICE | ST com índice e sem lista |
| ITEM-DIFAL | Substituição com texto contendo `DIF` |
| ITEM-FISICO | Peso e volume positivos |
| ITEM-SEM-FISICO | Peso e volume zerados |
| ITEM-LOTE | Lote com validade próxima |

Para testes numéricos, registrar no relatório os valores brutos retornados pelas APIs: custo, preço, percentuais, base ST, índice, frete e quantidades. Comparar com precisão suficiente antes da formatação visual.

## 4. Critérios gerais de execução

- Executar em navegador suportado com downloads habilitados.
- Usar backend e ERP de homologação, ou mocks, para testes de integração.
- Não executar casos destrutivos no ERP de produção.
- Limpar cache/recarregar a aplicação quando o caso exigir primeira carga.
- Para margens de fronteira, calcular o valor esperado fora da aplicação.
- Registrar payload e resposta HTTP nos casos de SimFrete e ERP.
- Em testes com duas unidades, validar cada payload individualmente.

## 5. Inicialização e estado da tela

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-INI-001 | P0 | F | Nova sessão | Abrir a rota da tela | Tela abre sem cliente e itens; modalidade mostra `2 — Orçamento` |
| PV-INI-002 | P1 | I | API de tipos disponível com mais de 25 registros | Abrir a tela | Todas as páginas de tipos de logradouro são carregadas; tipos vazios não aparecem |
| PV-INI-003 | P1 | I | API de lotes disponível | Abrir a tela | Mapa de lotes é carregado e pode destacar ITEM-LOTE |
| PV-INI-004 | P2 | I | API de tipos indisponível | Abrir a tela | Tela permanece utilizável; seletor de tipo fica sem opções retornadas e não há mensagem específica |
| PV-INI-005 | P1 | F | Pedido concluído com sucesso | Fechar o modal de sucesso | Campos e itens são limpos, contadores reiniciam e modalidade volta a 2 |
| PV-INI-006 | P1 | UI | Operação assíncrona ativa | Observar a interface | Loading de tela inteira bloqueia interação até a operação finalizar |

## 6. Cliente e contexto comercial

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-CLI-001 | P0 | F/I | CLI-OK existente | Digitar código e sair do campo | Cliente é encontrado; nome é exibido; cargas complementares são iniciadas |
| PV-CLI-002 | P0 | F | Cliente inexistente | Digitar código inválido e sair | Modal informa cliente não encontrado; seleção é limpa |
| PV-CLI-003 | P1 | F | LOV disponível | Selecionar CLI-OK pela lupa | Código e descrição são preenchidos e o mesmo fluxo complementar é executado |
| PV-CLI-004 | P0 | I | CLI-OK com defaults | Selecionar cliente e aguardar | Representante, operação, condição, consumidor e indicadores são preenchidos conforme detalhe |
| PV-CLI-005 | P1 | I | CLI-OK com comentários | Selecionar cliente | Comentários são ordenados por sequência e exibidos com flags inicialmente desmarcadas |
| PV-CLI-006 | P1 | I | CLI-OK com compras | Selecionar cliente | Até cinco últimas compras por item ficam disponíveis para LOV/tooltip |
| PV-CLI-007 | P1 | UI | Histórico com até 45 dias | Selecionar cliente e abrir tooltip | Sinaleira verde, texto de compra recente, dias e data corretos |
| PV-CLI-008 | P1 | UI | Histórico acima de 45 dias | Selecionar cliente | Sinaleira amarela e texto de compra antiga |
| PV-CLI-009 | P1 | UI | CLI-SEM-HIST | Selecionar cliente | Sinaleira vermelha e texto “Nunca comprado” |
| PV-CLI-010 | P1 | UI | Limite regular, sem vencidos | Selecionar cliente | Indicador financeiro verde |
| PV-CLI-011 | P1 | UI | Limite fora da faixa ou vencidos | Selecionar cliente | Indicador financeiro amarelo |
| PV-CLI-012 | P1 | UI | Limite fora da faixa e vencidos | Selecionar cliente | Indicador financeiro vermelho |
| PV-CLI-013 | P0 | F/I | Itens carregados para CLI-OK | Trocar para CLI-ALT | Endereço e seleção de frete são limpos; itens são reconsultados; sem tributação é desmarcado |
| PV-CLI-014 | P1 | F | Cliente selecionado | Clicar na borracha | Cliente e dependências visuais são limpos |
| PV-CLI-015 | P1 | F | Nenhum cliente | Clicar na lupa de representante, operação ou condição | A tela impede a consulta e orienta selecionar cliente |
| PV-CLI-016 | P1 | I | API de detalhe falha, busca básica funciona | Selecionar cliente | Cliente permanece selecionado; defaults/detalhes são limpos conforme tratamento atual |
| PV-CLI-017 | P1 | F | Cliente selecionado | Alterar representante por código válido | Representante compatível com cliente é exibido |
| PV-CLI-018 | P1 | F | Cliente selecionado | Informar representante inválido | Modal de não encontrado; representante é limpo |
| PV-CLI-019 | P0 | F/I | Itens existentes | Alterar operação pela LOV | Itens são recalculados, frete selecionado é limpo e preços/impostos refletem a nova operação |
| PV-CLI-020 | P1 | F | Operação inválida | Informar código e sair | Modal informa operação não encontrada e estado de operação é limpo |
| PV-CLI-021 | P1 | F | Condição válida | Informar código ou selecionar na LOV | Código e descrição da condição são atualizados |
| PV-CLI-022 | P1 | F | Condição inválida | Informar código e sair | Modal informa condição não encontrada e estado é limpo |
| PV-CLI-023 | P1 | F | Qualquer cliente | Conferir Consumidor Final | Checkbox é somente leitura e corresponde a `ind_consumidor` |

## 7. Modalidade de integração

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-MOD-001 | P0 | F | Tela recém-aberta | Conferir modalidade | `2 — Orçamento` selecionada |
| PV-MOD-002 | P0 | F | Modalidade 2 | Abrir menu e escolher 7 | Botão passa a `7 — Orçamento/Contrato`; menu fecha |
| PV-MOD-003 | P0 | F | Modalidade 7 | Escolher 2 | Botão volta a `2 — Orçamento`; menu fecha |
| PV-MOD-004 | P1 | A11Y | Menu aberto | Inspecionar atributos | Botão possui `aria-haspopup`, `aria-expanded`; opções expõem `aria-selected` |
| PV-MOD-005 | P1 | F | Modalidade 7 e pedido concluído | Fechar sucesso | Modalidade é reiniciada em 2 |

## 8. LOV e inclusão de itens

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-LOV-001 | P0 | F | Sem cliente | Clicar **+ Item** | Modal exige cliente |
| PV-LOV-002 | P0 | F | Cliente, sem operação | Clicar **+ Item** | Modal exige operação |
| PV-LOV-003 | P0 | F | Cliente/operação, sem condição | Clicar **+ Item** | Modal exige condição de pagamento |
| PV-LOV-004 | P1 | F | Pré-requisitos preenchidos | Abrir LOV | Filtro inicial é `POLIMAX`; seleção anterior é limpa |
| PV-LOV-005 | P1 | F | Catálogo carregado | Buscar por código | Resultado contém o código correspondente |
| PV-LOV-006 | P1 | F | Catálogo carregado | Buscar descrição com acento em forma normalizada | Busca ignora diferenças de acentuação e caixa |
| PV-LOV-007 | P1 | F | Catálogo carregado | Buscar termos separados por espaço ou `%` | Todos os termos precisam ocorrer em um dos campos pesquisáveis |
| PV-LOV-008 | P1 | A11Y | Foco no filtro | Pressionar Enter | Busca é executada no offset zero |
| PV-LOV-009 | P2 | CH | Foco no filtro | Pressionar Tab | Busca é executada e Tab não move o foco nessa ação |
| PV-LOV-010 | P1 | F | Mais de 25 resultados | Avançar e voltar páginas | Exibe faixas de 25; botões respeitam primeira/última página |
| PV-LOV-011 | P1 | F | Página com itens | Ordenar coluna três vezes | Ordem alterna crescente, decrescente e padrão |
| PV-LOV-012 | P1 | F | Item já presente | Localizá-lo na LOV | Linha e checkbox ficam desabilitados; nova inclusão é impedida |
| PV-LOV-013 | P1 | F | Itens em páginas distintas | Selecioná-los e adicionar | Todos são adicionados na ordem em que foram selecionados |
| PV-LOV-014 | P1 | F | Página com itens novos | Usar “Marcar todos” | Apenas itens não existentes da página atual são marcados |
| PV-LOV-015 | P1 | F | Seleções em páginas diferentes | Usar “Desmarcar todos” | Todas as seleções da LOV são removidas |
| PV-LOV-016 | P1 | I | Cliente/operação/condição válidos | Abrir uma página | Preços de 201 e 203 são consultados; spinners desaparecem ao concluir |
| PV-LOV-017 | P1 | I | Cliente com acordo | Abrir item correspondente | Linha/ícone e tooltip exibem acordo |
| PV-LOV-018 | P1 | UI | Marca POLIMAX | Exibir item | Linha recebe destaque de marca própria e estrela |
| PV-LOV-019 | P1 | UI | ITEM-LOTE | Exibir item | Linha vermelha e ampulheta com validade no título |
| PV-LOV-020 | P1 | UI | Busca do catálogo em andamento | Rolar lista | Overlay continua cobrindo toda a moldura visível |
| PV-LOV-021 | P1 | I | Cache ainda dentro de 5 min | Fechar/reabrir ou buscar | Catálogo e impostos elegíveis usam cache; não há carga integral desnecessária |
| PV-LOV-022 | P1 | I | Cache expirado | Abrir/buscar | Catálogo é atualizado e loading é exibido |

## 9. Estrutura e seleção dos itens no pedido

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-ITM-001 | P0 | F | Um produto novo | Adicioná-lo | Um grupo visual é criado com ocorrências 201 e 203 |
| PV-ITM-002 | P0 | F | Dois produtos | Adicioná-los | `numItem` visível cresce por produto; cada ocorrência mantém `seq` técnico próprio |
| PV-ITM-003 | P0 | I | ITEM-AC/MMT | Aguardar classificação | `(AC)` ou `(MMT)` aparece em nova linha na descrição |
| PV-ITM-004 | P0 | I | Item tributado | Aguardar carga | Estoque, custo, preço, impostos, lista e dados físicos são armazenados por unidade |
| PV-ITM-005 | P0 | F | ITEM-SEM-TRIB em uma unidade | Adicionar | Ocorrência é desmarcada; checkbox e quantidade ficam desabilitados |
| PV-ITM-006 | P1 | F | Vários itens | Desmarcar um checkbox | Item sai dos totais, proposta, frete e ERP daquela unidade |
| PV-ITM-007 | P1 | F | Vários itens | “Desmarcar todos” em 201 | Somente itens 201 são desmarcados; 203 permanece |
| PV-ITM-008 | P1 | F | ITEM-SEM-TRIB presente | “Marcar todos” | Item sem tributação permanece desmarcado |
| PV-ITM-009 | P0 | F | Produto nas duas unidades | Clicar lixeira da grade principal | Ambas as ocorrências são removidas |
| PV-ITM-010 | P1 | F | Três produtos | Ordenar descrição | As três grades permanecem alinhadas na mesma ordem lógica |
| PV-ITM-011 | P1 | F | Ordenação aplicada | Alternar até estado neutro | Ordem volta à inclusão original |
| PV-ITM-012 | P1 | F | Item desmarcado | Tentar editar quantidade | Quantidade está desabilitada |
| PV-ITM-013 | P2 | CH | Item desmarcado, sem contrato | Editar preço/sobra | Campos permanecem habilitados no comportamento atual ⚠ |
| PV-ITM-014 | P1 | F | Estoque menor que quantidade | Informar quantidade maior | Tela permite prosseguir; estoque é apenas informativo ⚠ |

## 10. Quantidade, valor e listas de preço

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-QTD-001 | P1 | F | Item sem quantidade prévia e múltiplo 10 | Aguardar carga | Quantidade padrão é 10 |
| PV-QTD-002 | P1 | F | Item sem múltiplo positivo | Aguardar carga | Quantidade padrão é 1 |
| PV-QTD-003 | P0 | F | ITEM-MULT múltiplo 10 | Informar 20 e sair | Valor permanece; nenhuma mensagem |
| PV-QTD-004 | P0 | F | ITEM-MULT múltiplo 10 | Informar 15 e sair | Modal informa múltiplo 10; quantidade é limpa |
| PV-QTD-005 | P1 | F | Item comum | Informar zero | Campo aceita durante edição; cotação/ERP rejeitam depois |
| PV-QTD-006 | P1 | F | Item comum | Informar texto não numérico | Validação de múltiplo pode não alertar; ERP rejeita quantidade inválida ⚠ |
| PV-VAL-001 | P0 | F | Preço editável | Digitar `9,30` | Campo preserva entrada decimal natural e cálculo usa 9,30 |
| PV-VAL-002 | P0 | F | Preço editável | Digitar `9.3` | Campo normaliza usando vírgula e cálculo usa 9,3 |
| PV-VAL-003 | P0 | F | Preço editável | Digitar `9,3015` | Quatro casas são aceitas |
| PV-VAL-004 | P1 | F | Preço editável | Digitar mais de quatro casas | Casas excedentes são truncadas pela máscara |
| PV-VAL-005 | P1 | F | Preço editável | Digitar caracteres monetários/letras | Caracteres não numéricos permitidos pela máscara são removidos |
| PV-VAL-006 | P0 | F | ITEM-PROMO mínimo 10,0000 | Informar 9,9999 e sair | Valor é restaurado para 10,0000; modal informa mínimo |
| PV-VAL-007 | P0 | F | ITEM-PROMO mínimo 10,0000 | Informar 10 ou maior | Valor é aceito |
| PV-VAL-008 | P0 | F | ITEM-CONTRATO | Tentar editar valor | Campo está desabilitado |
| PV-VAL-009 | P0 | F | ITEM-CONTRATO | Tentar editar sobra | Campo está desabilitado |
| PV-VAL-010 | P1 | F | Sobra desejada temporária | Alterar preço | `sobraDesejada` é limpa e sobra real volta a ser exibida |
| PV-VAL-011 | P0 | I | Preço `9,3` | Montar payload ERP | `vlrUniBruto` é enviado como `"9,3000"` |

## 11. Cálculos de impostos e sobra

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-CAL-001 | P0 | C | Q=10, PV=5 | Calcular item | Venda total = 50 |
| PV-CAL-002 | P0 | C | Custo e tributos conhecidos | Calcular item | Cada imposto básico = venda × percentual/100 |
| PV-CAL-003 | P0 | C | ITEM-DIFAL | Calcular item | DIFAL usa `per_subst_trib - per_icms`; ST fica zero |
| PV-CAL-004 | P0 | C | ITEM-ST-LISTA | Calcular item | ST usa base da lista × quantidade × percentual |
| PV-CAL-005 | P0 | C | ITEM-ST-INDICE | Calcular item | ST usa preço × índice × quantidade × percentual |
| PV-CAL-006 | P0 | C | ST sem lista/índice | Calcular item | ST usa venda total × percentual |
| PV-CAL-007 | P0 | C | Funrural positivo | Calcular item | Funrural é exibido, mas não reduz sobra |
| PV-CAL-008 | P0 | C | Frete rateado positivo | Calcular item | Sobra real é reduzida exatamente pelo frete do item |
| PV-CAL-009 | P0 | C | Quantidade ou preço zero | Calcular item | Venda, impostos e sobra retornam zero |
| PV-CAL-010 | P0 | C | Dois itens de valores distintos | Calcular total | Sobra percentual da unidade = soma das sobras/soma das vendas, não média simples |
| PV-CAL-011 | P1 | UI | Sobra monetária positiva | Observar item/cartão | Texto/cartão usa verde |
| PV-CAL-012 | P1 | UI | Sobra monetária negativa | Observar item/cartão | Texto/cartão usa vermelho |
| PV-CAL-013 | P0 | C | Margem desejada válida | Alterar sobra e sair | Novo preço segue fórmula inversa e é gravado com quatro casas |
| PV-CAL-014 | P0 | F/C | Campo de sobra não alterado | Apenas focar e sair/pressionar Enter | Preço original de quatro casas não muda |
| PV-CAL-015 | P0 | F/C | Sobra igual ao máximo matemático | Informar e sair | Modal rejeita; preço não é recalculado |
| PV-CAL-016 | P0 | F/C | Sobra maior que máximo | Informar e sair | Mesmo bloqueio com limite máximo formatado |
| PV-CAL-017 | P0 | F/C | ITEM-PROMO; sobra geraria preço menor que mínimo | Aplicar sobra | Modal de preço promocional; preço não é reduzido |
| PV-CAL-018 | P1 | C | Frete fixo e ST por lista | Aplicar sobra | Fórmula inversa trata frete e ST como parcelas fixas |
| PV-CAL-019 | P1 | UI | Sobra +2% em AC | Observar cor | Campo aparece verde embora esteja abaixo do mínimo de 4% ⚠ |

## 12. Navegação e acessibilidade

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-NAV-001 | P0 | A11Y | Dois itens habilitados em ambas unidades | Pressionar Enter sucessivamente | Percorre 201 quantidades → valores → sobras → 203 quantidades → valores → sobras |
| PV-NAV-002 | P1 | A11Y | Mesmo cenário | Pressionar Shift+Enter | Percorre no sentido inverso |
| PV-NAV-003 | P1 | A11Y | Foco no último campo | Pressionar Enter | Volta ao primeiro campo habilitado |
| PV-NAV-004 | P1 | A11Y | Foco no primeiro campo | Pressionar Shift+Enter | Vai ao último campo habilitado |
| PV-NAV-005 | P1 | A11Y | Foco no último campo | Pressionar Tab | Não faz ciclo; navegador continua navegação normal |
| PV-NAV-006 | P1 | A11Y | Item de contrato/sem tributação | Navegar | Campos desabilitados são ignorados |
| PV-NAV-007 | P1 | A11Y | Próximo campo alcançado | Avançar | Conteúdo recebe seleção total |
| PV-NAV-008 | P1 | A11Y | Quantidade incompatível com múltiplo | Pressionar Enter | Blur valida, modal abre e quantidade é limpa |
| PV-NAV-009 | P0 | A11Y | Modal somente OK | Pressionar Enter | Modal fecha porque OK recebe foco automático |
| PV-NAV-010 | P1 | A11Y | Modal associado a campo | Fechar com Enter | Foco retorna ao seletor/campo registrado |
| PV-NAV-011 | P2 | A11Y | Modal de confirmação aberto | Verificar teclado/foco | Não há foco automático ou armadilha de foco no comportamento atual ⚠ |

## 13. Cores, símbolos e tooltips

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-VIS-001 | P1 | UI | Item com acordo | Exibir | Fundo roxo e `©`; tooltip lista pedidos do acordo |
| PV-VIS-002 | P1 | UI | Item em últimas compras | Exibir | Fundo verde e `✓`; tooltip lista até cinco compras |
| PV-VIS-003 | P1 | UI | ITEM-CONTRATO | Exibir | Fundo laranja e `$` |
| PV-VIS-004 | P1 | UI | ITEM-SEM-TRIB | Exibir | Fundo marrom e texto de item sem tributação |
| PV-VIS-005 | P1 | UI | ITEM-LOTE | Exibir | Fundo vermelho e ampulheta |
| PV-VIS-006 | P1 | UI | Item com mais de uma condição | Exibir | Prioridade: sem tributação > lote > contrato > acordo > última compra; símbolos adicionais podem coexistir |
| PV-VIS-007 | P1 | UI/A11Y | Ícone da legenda | Hover e foco por teclado | Tooltip abre e mostra cores, símbolos e mínimos AC/MMT/total |
| PV-VIS-008 | P1 | UI | Ícone Info do item | Hover | Exibe impostos, Funrural, frete, sobra, transporte, prazo e histórico disponíveis |
| PV-VIS-009 | P2 | UI | Largura acima de 1500 px | Observar grade | Identidade, 201 e 203 aparecem em três colunas |
| PV-VIS-010 | P2 | UI | Largura até 1500 px | Observar grade | Blocos passam para uma coluna sem perder dados |

## 14. Cotação e rateio de frete

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-FRT-001 | P0 | F | Nenhum item marcado | Clicar Cotar | Modal exige ao menos um item |
| PV-FRT-002 | P0 | F | Item marcado sem quantidade positiva | Clicar Cotar | Modal exige quantidade válida |
| PV-FRT-003 | P0 | I | Itens apenas na 201 | Cotar | Um payload é enviado com origem/CNPJ da 201 |
| PV-FRT-004 | P0 | I | Itens nas duas unidades | Cotar | Dois payloads independentes são enviados |
| PV-FRT-005 | P0 | I | CLI-OK | Inspecionar payload | Destino usa `cliente.cod_cidade`; totais de volume, peso, valor e quantidade refletem selecionados |
| PV-FRT-006 | P0 | I | Retorno com transportadoras | Cotar | Primeira alternativa de cada unidade é selecionada automaticamente |
| PV-FRT-007 | P1 | F | Duas alternativas | Escolher a segunda no tooltip | Seleção muda; frete é rerateado; sobra é recalculada |
| PV-FRT-008 | P0 | C | ITEM-FISICO | Cotar | Peso de cobrança = maior entre peso real e volume×300 |
| PV-FRT-009 | P0 | C | Vários itens físicos | Cotar | Frete é proporcional ao peso de cobrança |
| PV-FRT-010 | P0 | C | Todos ITEM-SEM-FISICO | Cotar | Rateio usa proporção das quantidades |
| PV-FRT-011 | P1 | C | Frete com divisão não exata | Cotar | Cada parcela é arredondada para 2 casas; pequena diferença residual é possível ⚠ |
| PV-FRT-012 | P1 | UI | Frete cotado | Observar cartões | Valor, percentual e tooltip de transportadoras são exibidos |
| PV-FRT-013 | P1 | UI | Sem frete selecionado | Observar cartões | Texto “Não cotado” é exibido |
| PV-FRT-014 | P0 | I | Uma unidade sem transportadora | Cotar | Modal lista unidade sem cotação e fluxo não aplica nova seleção |
| PV-FRT-015 | P1 | I | Erro HTTP/timeout | Cotar | Loading termina e erro é apresentado pelo tratamento atual |
| PV-FRT-016 | P0 | I | Preço numérico com ponto | Cotar | `valorTotal` do payload é numérico e correto |
| PV-FRT-017 | P0 | CH | Preço editado como `9,30` | Cotar e inspecionar payload | Conversão atual com `Number` pode produzir `NaN`/`null` ⚠ |
| PV-FRT-018 | P0 | CH | Endereço de entrega em cidade diferente | Cotar | Destino continua sendo a cidade cadastral do cliente ⚠ |
| PV-FRT-019 | P0 | CH | API devolve origem 92120190 como número | Normalizar retorno | Comparação estrita pode classificar a cotação como unidade 203 ⚠ |
| PV-FRT-020 | P0 | CH | Frete já cotado | Alterar quantidade/seleção/item | Rateio não é atualizado automaticamente; recotação manual é necessária ⚠ |
| PV-FRT-021 | P0 | CH | Frete cotado | Trocar cliente ou operação | Seleção visual é limpa; verificar se `valorFrete` antigo ainda afeta sobra até nova cotação ⚠ |

## 15. Observações e ordem de compra

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-OBS-001 | P1 | F | Sem cliente | Clicar adicionar observação | Modal exige cliente |
| PV-OBS-002 | P1 | F | Sem operação | Clicar adicionar | Modal exige operação |
| PV-OBS-003 | P1 | F | Sem condição | Clicar adicionar | Modal exige condição |
| PV-OBS-004 | P1 | F | Contexto completo | Criar observação e marcar destinos | Nova linha é incluída com sequência seguinte e flags corretas |
| PV-OBS-005 | P1 | F | Observação existente | Clicar linha, alterar e aplicar | Mesma sequência é atualizada |
| PV-OBS-006 | P1 | F | Três observações | Remover a segunda | Restantes são renumeradas 1 e 2 |
| PV-OBS-007 | P0 | F | Observações com/sem flags | Montar payload | Somente as que possuem algum destino entram em `peObservacoes` |
| PV-OBS-008 | P1 | F | Observação marcada apenas Pedido | Gerar proposta | Texto entra na proposta |
| PV-OBS-009 | P1 | F | Observação marcada apenas Nota/Registro/Financeiro | Gerar proposta | Texto não entra na proposta |
| PV-OC-001 | P0 | F | OC vazia | Tentar ERP | Modal exige ordem de compra |
| PV-OC-002 | P1 | F | Campo OC | Digitar mais de 20 caracteres | Interface limita a 20 |
| PV-OC-003 | P0 | F/A11Y | OC com `/` ou `\|` | Sair do campo | Modal informa caracteres proibidos; ao fechar, foco retorna ao campo |
| PV-OC-004 | P1 | F | OC vazia | Gerar proposta | Proposta pode ser gerada sem OC |

## 16. Triangulação

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-TRI-001 | P1 | F | Cliente de remessa válido | Informar código ou LOV | Código e descrição são preenchidos |
| PV-TRI-002 | P1 | F | Código inválido | Sair do campo | Modal informa cliente de triangulação não encontrado |
| PV-TRI-003 | P1 | F | Operação de remessa válida | Informar código ou LOV | Código e descrição são preenchidos |
| PV-TRI-004 | P1 | F | Operação inválida | Sair | Modal informa operação de triangulação não encontrada |
| PV-TRI-005 | P0 | I | Cliente e operação preenchidos | Montar payload | `codClienteRemessa` e `codOperRemessa` são enviados |
| PV-TRI-006 | P1 | F | Triangulação vazia | Enviar pedido | Fluxo é permitido e campos são omitidos |
| PV-TRI-007 | P1 | CH | Somente um dos dois campos preenchido | Enviar pedido | Validação atual permite payload parcial ⚠ |
| PV-TRI-008 | P1 | F | Triangulação preenchida | Gerar proposta | Dados não aparecem na proposta |

## 17. Endereço de entrega

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-END-001 | P1 | F | Sem cliente | Clicar PADRÃO ou ENDEREÇOS | Modal orienta selecionar cliente |
| PV-END-002 | P0 | I | CLI-OK com padrão | Clicar PADRÃO | CEP, tipo, logradouro, bairro, número, cidade e UF são preenchidos conforme APIs |
| PV-END-003 | P1 | I | CLI-SEM-END | Clicar PADRÃO | Campos são limpos e modal informa ausência de endereço padrão |
| PV-END-004 | P1 | F/I | Cliente com vários endereços | Escolher pela LOV | Endereço selecionado é aplicado |
| PV-END-005 | P1 | I | CEP válido | Digitar e sair | Logradouro, bairro, tipo, cidade e UF são preenchidos |
| PV-END-006 | P1 | I | CEP inexistente | Digitar e sair | Seção de endereço é limpa |
| PV-END-007 | P1 | F/I | Cidade válida | Selecionar cidade | Código IBGE, descrição e UF correspondente são preenchidos |
| PV-END-008 | P1 | F | Endereço preenchido | Clicar borracha de UF/cidade | Toda a seção, inclusive data da carga, é limpa |
| PV-END-009 | P0 | I | Tipo selecionado retornado pela API | Montar payload | `codLogradouro` corresponde ao `cod_tipo` da descrição escolhida |
| PV-END-010 | P0 | I | Endereço completo | Montar payload | `desEndereco`, `desLogradouro`, bairro, cidade, CEP, número e data são enviados por unidade |
| PV-END-011 | P1 | I | Sem data de carga | Montar payload | `dtaTransacao` usa a data atual em `dd/MM/yyyy` |
| PV-END-012 | P1 | I | Data digitada | Montar payload | Texto digitado é usado sem validação/formatação adicional ⚠ |
| PV-END-013 | P1 | CH | Complemento e referência preenchidos | Montar payload ERP | Campos não são enviados em `peEndEntrega` ⚠ |
| PV-END-014 | P1 | CH | Somente campo parcial preenchido | Montar payload | Estrutura pode conter `numCep: 0` e/ou `numLogradouro: 0` ⚠ |
| PV-END-015 | P1 | CH | Número `123A` | Montar payload | `numLogradouro` é 123; parte alfabética é descartada ⚠ |
| PV-END-016 | P1 | CH | Número `S/N` | Montar payload | `numLogradouro` resulta em 0 ⚠ |
| PV-END-017 | P1 | F/CH | Endereço completo | Gerar proposta | PDF apresenta complemento e referência; Excel apresenta complemento e omite referência no comportamento atual ⚠ |

## 18. Emissão de proposta

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-PRO-001 | P0 | F | Sem cliente | Clicar Emitir proposta | Modal exige cliente |
| PV-PRO-002 | P0 | F | Sem condição | Clicar Emitir proposta | Modal exige condição |
| PV-PRO-003 | P0 | F | Nenhum item marcado | Clicar Emitir proposta | Modal exige item selecionado |
| PV-PRO-004 | P0 | F | Itens apenas 201 | Escolher PDF | Um PDF da unidade 201 é baixado |
| PV-PRO-005 | P0 | F | Itens 201 e 203 | Escolher PDF | Dois PDFs distintos são baixados em ordem de unidade |
| PV-PRO-006 | P0 | F | Itens 201 e 203 | Escolher Excel | Duas planilhas distintas são baixadas |
| PV-PRO-007 | P0 | F | Itens marcados/desmarcados | Gerar | Somente marcados entram em cada arquivo |
| PV-PRO-008 | P0 | I | API de cliente com CNPJ/fone/e-mail | Gerar | Contato é atualizado e aparece na proposta |
| PV-PRO-009 | P1 | I | Consulta de contato falha | Gerar | Geração continua com dados já disponíveis/fallback |
| PV-PRO-010 | P0 | F | Data conhecida | Gerar | Validade é exatamente emissão + 15 dias |
| PV-PRO-011 | P0 | F | Frete selecionado | Gerar | Transportadora, prazo e valor entram; total = produtos + frete |
| PV-PRO-012 | P0 | F | Frete não cotado | Gerar | Frete é omitido/não somado conforme template |
| PV-PRO-013 | P1 | F | OC/endereço/data/obs Pedido preenchidos | Gerar | Dados aparecem nos campos correspondentes |
| PV-PRO-014 | P0 | F | Modalidade/operação/sobra presentes | Gerar | Nenhum desses dados aparece no arquivo |
| PV-PRO-015 | P0 | F | Itens com marca e princípio | Gerar | Código, descrição, princípio, marca, quantidade, unitário e total aparecem |
| PV-PRO-016 | P1 | F | Geração ativa | Observar modal | Botões ficam desabilitados e texto “Gerando arquivos...” aparece |
| PV-PRO-017 | P1 | F | Biblioteca/exportação falha | Gerar | Modal fecha e mensagem detalha erro de PDF ou Excel |
| PV-PRO-018 | P1 | I | Geração concluída | Verificar rede/backend | Nenhum registro de proposta é persistido; apenas downloads locais |
| PV-PRO-019 | P1 | UI | Excel com cabeçalho completo | Abrir arquivo | Logo, título e dados comerciais têm linhas/espaçamento legíveis; tabela não sobrepõe cabeçalho |
| PV-PRO-020 | P1 | UI | PDF multipágina | Abrir arquivo | Cabeçalhos/tabela/totais permanecem legíveis e sem corte relevante |

## 19. Validações antes do ERP

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-ERP-V01 | P0 | F | Nenhum item marcado | Enviar ERP | Modal exige item selecionado; LOV de unidades não abre |
| PV-ERP-V02 | P0 | F | Item sem tributação forçado como selecionado | Enviar | Modal identifica código/unidade e bloqueia abertura |
| PV-ERP-V03 | P0 | F | Item marcado com quantidade vazia | Enviar | Modal exige quantidade válida e referencia item/unidade |
| PV-ERP-V04 | P0 | F | Item marcado com quantidade zero | Enviar | Mesmo bloqueio |
| PV-ERP-V05 | P0 | F | Sem cliente | Enviar | Modal exige cliente |
| PV-ERP-V06 | P0 | F | Sem operação | Enviar | Modal exige operação |
| PV-ERP-V07 | P0 | F | Sem condição | Enviar | Modal exige condição de pagamento |
| PV-ERP-V08 | P0 | F | Sem ordem de compra | Enviar | Modal exige OC e devolve foco ao campo |
| PV-ERP-V09 | P0 | F | Contexto válido | Enviar | LOV mostra apenas unidades com itens marcados; todas começam selecionadas |
| PV-ERP-V10 | P1 | F | LOV de unidades | Desmarcar todas | Botão Confirmar fica desabilitado |
| PV-ERP-V11 | P0 | F | Somente 201 confirmada | Confirmar | Somente 201 é avaliada e integrada |
| PV-ERP-V12 | P1 | CH | Item com preço zero e quantidade válida | Enviar | Validação atual permite avançar e gera `0,0000` ⚠ |
| PV-ERP-V13 | P1 | CH | Quantidade acima do estoque | Enviar | Validação atual permite avançar ⚠ |
| PV-ERP-V14 | P1 | CH | Sem representante | Enviar | Validação permite; campo é omitido ⚠ |
| PV-ERP-V15 | P1 | F | Sem endereço/frete/observação | Enviar | Fluxo é permitido; estruturas opcionais são omitidas |

## 20. Situação ERP e aprovação

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-SIT-001 | P0 | C | Modalidade 2; total ≥6; AC≥4; MMT≥6 | Avaliar | `numSeqConf=2`, `codSituacao=6`, sem confirmação |
| PV-SIT-002 | P0 | C | Modalidade 7; tudo dentro | Avaliar | `numSeqConf=7`, `codSituacao=32`, sem confirmação |
| PV-SIT-003 | P0 | C | Modalidade 2; total <6 | Avaliar | Situação 70 e confirmação da unidade |
| PV-SIT-004 | P0 | C | Modalidade 7; total <6 | Avaliar | Situação 70 e confirmação |
| PV-SIT-005 | P0 | C | Total ≥6; ITEM-AC <4 | Avaliar | Situação 70; mensagem lista item, AC, sobra e mínimo 4% |
| PV-SIT-006 | P0 | C | Total ≥6; ITEM-MMT <6 | Avaliar | Situação 70; mensagem lista item, MMT, sobra e mínimo 6% |
| PV-SIT-007 | P0 | C | Total ≥6; AC e MMT abaixo | Avaliar | Ambos aparecem em linhas separadas; situação 70 |
| PV-SIT-008 | P0 | C | Total <6 e itens abaixo | Avaliar | Mensagem prioriza total; lista individual não aparece no comportamento atual |
| PV-SIT-009 | P0 | C | ITEM-OUTRO abaixo | Avaliar | Não gera bloqueio individual; regra total continua válida |
| PV-SIT-010 | P0 | C | ITEM-CONTRATO abaixo, total ≥6 | Avaliar | Item é ignorado na regra individual; situação normal da modalidade |
| PV-SIT-011 | P0 | C | ITEM-CONTRATO faz total <6 | Avaliar | Situação 70 pela margem total |
| PV-SIT-012 | P0 | C | 201 dentro, 203 abaixo; modalidade 2 | Avaliar | 201→6, 203→70; confirmação menciona apenas 203 |
| PV-SIT-013 | P0 | C | 201 dentro, 203 abaixo; modalidade 7 | Avaliar | 201→32, 203→70 |
| PV-SIT-014 | P0 | C | Ambas abaixo | Avaliar | Ambas→70; modal contém dois blocos de unidade |
| PV-SIT-015 | P0 | F | Confirmação aberta | Clicar Não | Nada é enviado; dados permanecem para edição |
| PV-SIT-016 | P0 | F | Confirmação aberta | Clicar Sim, enviar | Payloads seguem com situações calculadas |
| PV-SIT-017 | P0 | C | Total exato 6,00 | Avaliar | Regra total é atendida |
| PV-SIT-018 | P0 | C | AC exato 4,00 | Avaliar | Regra individual AC é atendida |
| PV-SIT-019 | P0 | C | MMT exato 6,00 | Avaliar | Regra individual MMT é atendida |
| PV-SIT-020 | P1 | CH | Total bruto 5,999, arredondado 6,00 | Avaliar | Comparação usa 6,00 e pode considerar atendido ⚠ |
| PV-SIT-021 | P1 | CH | AC bruto 3,999, arredondado 4,00 | Avaliar | Pode ser considerado atendido ⚠ |
| PV-SIT-022 | P1 | CH | Mensagem de unidade 203 | Comparar “seq.” com tabela | Número usa `seq` técnico e pode divergir de `numItem` visível ⚠ |

## 21. Contrato do payload ERP

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-PAY-001 | P0 | I | Unidade 201 confirmada | Capturar payload | Envelope contém `codEmp="01"`, `codMaquina=1` e `pePedidos` da 201 |
| PV-PAY-002 | P0 | I | Unidades 201/203 | Capturar | Um payload independente por unidade; itens não se misturam |
| PV-PAY-003 | P0 | I | Modalidade selecionada | Capturar | `numSeqConf` é 2 ou 7 e situação corresponde à avaliação |
| PV-PAY-004 | P0 | I | Cabeçalho completo | Capturar | Cliente, operação, condição, OC, datas, consumidor e representante mapeados corretamente |
| PV-PAY-005 | P0 | I | Triangulação preenchida | Capturar | Remessa contém códigos correspondentes |
| PV-PAY-006 | P0 | I | Item marcado | Capturar `peItens` | Código, lista, quantidades, unidade de retirada e `numItem` corretos |
| PV-PAY-007 | P0 | I | Preço com 1–4 casas | Capturar | `vlrUniBruto` é string com quatro casas e vírgula |
| PV-PAY-008 | P1 | I | Item sem lista | Capturar | `codLista` é removido do JSON |
| PV-PAY-009 | P1 | I | Observações marcadas | Capturar | Flags viram `indPedido`, `indNf`, `indRegistro`, `indCr`; sequência filtrada inicia em 1 |
| PV-PAY-010 | P1 | I | Endereço presente | Capturar | `peEndEntrega` é incluído por unidade com `codUnidade` correspondente |
| PV-PAY-011 | P1 | I | Endereço ausente | Capturar | `peEndEntrega` é omitido |
| PV-PAY-012 | P1 | I | Campos opcionais vazios | Capturar | Nulos, strings e arrays vazios são removidos; zeros são preservados |
| PV-PAY-013 | P1 | I | URL com `?usuario=abc` | Capturar | `usuario="abc"` |
| PV-PAY-014 | P1 | I | URL com `user`, `codUsuario` ou `cod_usuario` | Capturar | Primeiro parâmetro disponível na ordem implementada é usado |
| PV-PAY-015 | P1 | I | URL sem usuário | Capturar | Campo `usuario` é omitido |
| PV-PAY-016 | P1 | CH | Preço alterado manualmente | Capturar | `indVlrAlterado` continua 0 no comportamento atual ⚠ |
| PV-PAY-017 | P1 | CH | Frete selecionado | Capturar | Valor, prazo e transportadora não são enviados; apenas `tipFrete=1` permanece ⚠ |
| PV-PAY-018 | P1 | I | Qualquer item | Capturar | `codReserva=7`, quantidade reservada=negociada, `tipTransacao=1` |

## 22. Envio, retorno e erros do ERP

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado esperado |
|---|:---:|:---:|---|---|---|
| PV-ENV-001 | P0 | I | Uma unidade válida; backend sucesso | Enviar | POST em `/api/pedidos/enviar-erp`; modal mostra unidade e número |
| PV-ENV-002 | P0 | I | Duas unidades válidas | Enviar | Requisições são paralelas; sucesso é ordenado por unidade no modal |
| PV-ENV-003 | P0 | F | Sucesso exibido | Pressionar Enter/OK | Modal fecha e tela é limpa |
| PV-ENV-004 | P0 | I | Backend retorna erro estruturado | Enviar | Modal combina erro, etapa, pedido e detalhe disponíveis |
| PV-ENV-005 | P1 | I | Erro sem estrutura do backend | Enviar | Modal usa `mensagem`, `message` ou texto padrão |
| PV-ENV-006 | P1 | I | Timeout >30 s | Enviar | Loading termina e erro de integração é mostrado |
| PV-ENV-007 | P0 | CH | 201 sucesso, 203 falha | Enviar ambas | Promise geral falha; pode existir pedido 201 sem mensagem de sucesso consolidada ⚠ |
| PV-ENV-008 | P0 | CH | Caso anterior | Repetir sem consultar ERP | Há risco de duplicar a unidade já criada ⚠ |
| PV-ENV-009 | P1 | F | Erro de integração | Fechar modal | Tela permanece preenchida para correção/reenvio |
| PV-ENV-010 | P1 | I | Classificação indisponível | Confirmar unidades | Avaliação falha e pedido não é enviado; erro é apresentado |

## 23. Casos de caracterização de riscos transversais

| ID | Pri. | Tipo | Pré-condição | Ação | Resultado atual a registrar |
|---|:---:|:---:|---|---|---|
| PV-RSK-001 | P0 | CH | Itens do cliente A | Trocar para cliente B com defaults diferentes | Primeiro recálculo pode usar operação/condição ainda antigas; validar payload de impostos ⚠ |
| PV-RSK-002 | P0 | CH | Itens carregados | Trocar somente condição | Itens não são recalculados globalmente ⚠ |
| PV-RSK-003 | P0 | CH | Frete cotado | Desmarcar item | Rateio antigo pode permanecer nos itens até recotar ⚠ |
| PV-RSK-004 | P0 | CH | Frete cotado | Remover item | Soma rateada pode deixar de fechar com frete selecionado ⚠ |
| PV-RSK-005 | P0 | CH | Frete cotado | Adicionar item | Novo item recebe frete zero; cotação anterior continua selecionada ⚠ |
| PV-RSK-006 | P1 | CH | Falha de API tratada com `catch` vazio | Executar fluxo | Ausência de mensagem pode deixar dado faltante sem explicação ⚠ |
| PV-RSK-007 | P1 | CH | Histórico API falha | Selecionar cliente | Sinaleira tende a vermelho/“Nunca comprado”, embora a causa seja erro ⚠ |
| PV-RSK-008 | P1 | CH | Endereço apenas com complemento/referência | Montar ERP | `peEndEntrega` é criado sem transportar esses campos ⚠ |
| PV-RSK-009 | P1 | CH | Modalidade 7 e mapa de situação ausente em chamada técnica | Montar payload | Fallback interno é situação 6, não 32 ⚠ |
| PV-RSK-010 | P1 | CH | Operações concorrentes de loading | Disparar cargas próximas | Booleano compartilhado pode ser encerrado por uma operação antes de outra ⚠ |
| PV-RSK-011 | P1 | CH | CSS carregado com outras telas | Inspecionar labels | Seletor global `label` pode afetar componentes externos ⚠ |
| PV-RSK-012 | P1 | CH | Item promocional editável | Exibir linha e legenda | Legenda menciona promoção, mas laranja/`$` dependem de preço bloqueado ⚠ |

## 24. Pacotes mínimos de regressão

### 24.1. Smoke P0

Executar a cada publicação:

1. `PV-INI-001`.
2. `PV-CLI-001`, `PV-CLI-004`.
3. `PV-LOV-003`, `PV-ITM-001`, `PV-ITM-004`.
4. `PV-QTD-003`, `PV-VAL-001`, `PV-VAL-011`.
5. `PV-CAL-001`, `PV-CAL-008`, `PV-CAL-010`, `PV-CAL-014`.
6. `PV-FRT-004`, `PV-FRT-006`, `PV-FRT-009`.
7. `PV-PRO-005`, `PV-PRO-006`, `PV-PRO-011`.
8. `PV-SIT-001`, `PV-SIT-002`, `PV-SIT-005`, `PV-SIT-012`, `PV-SIT-016`.
9. `PV-PAY-002`, `PV-PAY-003`, `PV-PAY-006`, `PV-PAY-007`.
10. `PV-ENV-001`, `PV-ENV-002`, `PV-ENV-003`.

### 24.2. Regressão de cálculo

Executar todos os casos `PV-CAL-*`, `PV-FRT-008` a `PV-FRT-011` e `PV-SIT-*` sempre que houver alteração em:

- impostos;
- listas de preço;
- máscara monetária;
- sobra;
- frete;
- modalidade;
- classificação.

### 24.3. Regressão de integração

Executar `PV-PAY-*` e `PV-ENV-*` sempre que houver alteração em:

- campos de tela usados pelo ERP;
- serviço `pedidosErp`;
- endpoint backend;
- autenticação/usuário;
- triangulação;
- endereço;
- observações.

### 24.4. Regressão de propostas

Executar `PV-PRO-*`, `PV-OBS-008/009` e `PV-END-017` ao modificar:

- modelo comum da proposta;
- template PDF;
- planilha Excel;
- dados institucionais;
- validade;
- biblioteca de exportação.

## 25. Critérios de saída

Uma versão pode ser considerada apta quando:

- todos os P0 do escopo executado passaram;
- não há divergência não explicada entre total visual, proposta e payload;
- situações 6, 32 e 70 foram verificadas em ambas as unidades;
- PDF e Excel foram abertos e inspecionados;
- payloads e respostas de SimFrete/ERP foram registrados;
- riscos `CH` impactados pela mudança foram reavaliados;
- falhas P1 possuem decisão formal de correção ou aceite temporário.

## 26. Evidências recomendadas

Para cada execução, guardar:

- versão/commit testado;
- ambiente e navegador;
- massa utilizada;
- captura da tela antes do envio;
- cálculo independente de sobra nos cenários numéricos;
- payload e resposta do SimFrete;
- payload e resposta do ERP por unidade;
- arquivos PDF/Excel gerados;
- número dos pedidos criados em homologação;
- evidência de mensagens de aprovação e erro;
- lista de limitações reproduzidas.
