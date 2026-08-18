# 08 — Suporte e troubleshooting

## 1. Objetivo e escopo

Este guia orienta o diagnóstico e a recuperação de incidentes na tela de Pedido de Venda, nas consultas ORDS, na cotação SimFrete, na emissão de propostas e na integração com o ERP.

A documentação distingue:

- **comportamento atual:** aquilo que o código executa hoje;
- **recomendação operacional:** procedimento seguro para suporte;
- **melhoria recomendada:** alteração futura de produto, infraestrutura ou código.

> **Regra de segurança:** diante de timeout ou erro no envio ao ERP, não reenviar o pedido automaticamente. Primeiro confirme no Oracle e no ERP se alguma unidade já foi integrada. Uma nova tentativa pode criar outro número e duplicar o pedido.

## 2. Informações mínimas para abrir um incidente

Antes de atualizar a página ou repetir uma operação, registre:

| Evidência | Exemplo |
|---|---|
| Data e hora, com fuso | `18/08/2026 14:35 -03:00` |
| Usuário informado na URL | parâmetro `usuario`, `user`, `codUsuario` ou `cod_usuario` |
| Cliente | código e nome |
| Contexto comercial | representante, operação e condição de pagamento |
| Unidade | 201, 203 ou ambas |
| Itens envolvidos | sequência, código, quantidade e valor |
| Ordem de compra | valor informado na tela |
| Modalidade | 2 — Orçamento ou 7 — Orçamento/Contrato |
| Resultado visual | texto integral do modal ou alerta |
| Número gerado | `numPedido`, quando apresentado |
| Requisição HTTP | URL, status, duração e resposta, sem credenciais |
| Estado Oracle | `ENVIANDO`, `INTEGRADO`, `ERRO` ou ausência de registro |

Não compartilhe tokens, senhas, string de conexão Oracle, payload integral com dados pessoais ou conteúdo completo de CLOB em chamados sem controle de acesso.

## 3. Triagem inicial

Siga esta ordem para reduzir tentativas desnecessárias:

1. Determine se a falha ocorre para um usuário, um cliente, uma unidade ou para todos.
2. Identifique se o problema está na interface, em uma consulta ORDS, no SimFrete, no backend, no Oracle ou no ERP.
3. Preserve os dados da tela e as evidências do navegador antes de recarregar.
4. Consulte o status dos containers e os logs do backend.
5. Para falha de ERP, reconcilie número, unidade e status antes de autorizar reenvio.
6. Só então aplique a recuperação apropriada.

### 3.1 Verificação rápida no navegador

No DevTools, aba **Network**:

- filtre por `api`;
- confira método, caminho, status HTTP e tempo;
- verifique se a chamada ficou `pending`, foi cancelada ou retornou erro;
- copie apenas a parte necessária da resposta;
- confira separadamente chamadas das unidades 201 e 203;
- não publique headers de autenticação nem payloads completos em canais abertos.

Chamadas principais:

```text
GET  /api/unimed/*
POST /api/cotacao
POST /api/pedidos/enviar-erp
```

### 3.2 Verificação rápida do backend

Em desenvolvimento:

```powershell
Invoke-WebRequest http://localhost:3001/health -UseBasicParsing
```

Em containers:

```bash
podman compose ps
podman compose logs --tail=200 backend
podman compose exec backend node -e "fetch('http://127.0.0.1:3001/health').then(r=>r.text()).then(console.log)"
```

Resposta esperada:

```json
{ "ok": true }
```

O health check atual comprova apenas que o processo HTTP está respondendo. Ele **não** valida Oracle, ORDS, SimFrete ou ERP.

## 4. Matriz de sintomas

### 4.1 Aplicação não abre ou apresenta tela em branco

**Causas prováveis**

- variáveis `REACT_APP_UNIMED_API_BASE_URL` ou `REACT_APP_SIMFRETE_API_BASE_URL` ausentes no build;
- bundle JavaScript não carregado;
- rota do Nginx ou proxy incorreta;
- build incompatível ou incompleto.

**Verificações**

- console do navegador;
- status dos arquivos JavaScript na aba Network;
- logs do build;
- argumentos do `Dockerfile.frontend`;
- resposta da raiz `/` e de uma rota `/api/*`.

**Recuperação**

- corrigir variáveis e reconstruir o frontend;
- restaurar a última imagem ou revisão aprovada se o build atual estiver inválido;
- não inserir tokens ou credenciais do backend em variáveis `REACT_APP_*`, pois elas ficam incorporadas ao bundle público.

### 4.2 LOV permanece em loading, abre vazia ou traz dados antigos

**Causas prováveis**

- ORDS indisponível ou lento;
- backend proxy indisponível;
- catálogo completo de clientes ou itens em atualização;
- cache em memória com duração de cinco minutos;
- falha auxiliar convertida silenciosamente em lista vazia;
- resposta fora do envelope esperado `{ items, hasMore, count }`.

**Verificações**

- chamada `/api/unimed/...` no navegador;
- status e tempo da resposta;
- logs `Erro ao consultar servico unimed` no backend;
- formato real da resposta;
- se o problema ocorre depois de cinco minutos ou apenas na primeira abertura.

**Recuperação**

- aguardar a chamada terminar antes de repetir a busca;
- fechar e reabrir a LOV;
- se houver evidência de cache inconsistente, registrar a tela e fazer recarga completa do navegador;
- uma recarga perde os dados não persistidos do pedido; preserve-os antes.

**Comportamento atual**

- clientes e itens são carregados como catálogos completos e filtrados localmente;
- fechar o modal não elimina caches de módulo;
- uma recarga completa elimina os caches do frontend;
- a LOV de endereços mostra somente os primeiros 25 endereços.

### 4.3 Cliente é encontrado, mas operação, pagamento, crédito ou representante não aparecem

**Causas prováveis**

- falha em `ClienteDetalhado/{cliente}`;
- falha em `representantesCliente/{cliente}`;
- resposta sem `items[0]`;
- seleção de outro cliente enquanto chamadas anteriores ainda estavam em andamento;
- dados cadastrais ausentes no ORDS.

**Verificações**

- compare as respostas das duas APIs;
- confirme `cod_oper`, `cod_cond_pgto`, `cod_pessoa_rep` e descrições;
- verifique o indicador global de carregamento;
- confirme se o código digitado corresponde ao cliente selecionado.

**Recuperação**

- pesquisar novamente o cliente;
- selecionar manualmente operação, pagamento e representante quando o cadastro permitir;
- se houver itens já adicionados, revisar preços e impostos após qualquer troca de contexto.

> **Ponto de atenção atual:** trocar manualmente a condição de pagamento não dispara o mesmo recálculo global existente para a operação. Para uma simulação confiável, após a troca remova e adicione novamente os itens ou recarregue o contexto até que essa dependência seja corrigida em código.

### 4.4 Item aparece sem tributação ou não pode ser marcado

**Significado atual**

`num_seq_busca` nulo ou ausente na resposta de impostos caracteriza item sem tributação.

**Verificações**

- operação, cliente, unidade e condição usados na URL de `impostos`;
- resposta fiscal das unidades 201 e 203 separadamente;
- existência de `num_seq_busca`;
- cadastro tributário no sistema de origem.

**Recuperação**

- não forçar o checkbox;
- corrigir o cadastro ou contexto tributário;
- consultar novamente o item após a correção;
- o envio ao ERP deve continuar bloqueado enquanto um item selecionado estiver sem tributação.

### 4.5 Preço, imposto ou sobra muda de forma inesperada

**Causas prováveis**

- mudança de cliente, operação ou condição;
- frete rateado ou removido;
- preço digitado com vírgula e convertido de forma diferente por algum fluxo;
- classificação AC/MMT atualizada;
- cache fiscal com até cinco minutos;
- mutação da resposta fiscal cacheada no tratamento de DIFAL;
- arredondamento visual da sobra em duas casas versus preço em quatro casas.

**Verificações**

- capture a resposta de `impostos` antes e depois;
- compare `vlr_item`, `vlr_medio`, percentuais, ST/DIFAL e frete do item;
- confirme se o preço foi realmente editado ou apenas recebeu foco;
- confira o valor bruto com quatro casas;
- verifique a classificação em `itensClassificacao`.

**Recuperação**

- preserve evidências e recarregue a página para eliminar caches em memória;
- refaça cliente, operação, pagamento e itens na ordem correta;
- recote o frete depois de alterar quantidade ou contexto;
- não compense manualmente uma divergência fiscal sem validação do responsável tributário.

**Melhoria recomendada**

Não modificar `response.data` da consulta fiscal. Hoje o tratamento de DIFAL altera `per_subst_trib` no objeto que pode estar cacheado; deve trabalhar sobre uma cópia imutável.

### 4.6 Cotação de frete falha

**Mensagens comuns**

- cidade do cliente não encontrada;
- nenhum item válido para cotação;
- nenhuma transportadora retornada;
- erro genérico de cotação.

**Verificações**

- cliente possui `cod_cidade` numérico;
- todos os itens marcados possuem quantidade positiva;
- payload tem origem, destino, volume, peso e valor total válidos;
- preço localizado como `9,30` não virou `null` no JSON;
- credenciais `SIMFRETE_USER` e `SIMFRETE_PASS` estão válidas;
- conectividade do backend com o endpoint externo;
- logs do backend no mesmo horário.

**Recuperação**

- corrigir cidade, quantidade ou preço e cotar novamente;
- cotação é uma operação de consulta e pode ser repetida depois da correção;
- após alterar quantidade, preço ou seleção, recotar para atualizar o rateio;
- não reutilizar uma sobra calculada com frete antigo.

**Pontos de atenção atuais**

- `Number("9,30")` não é uma conversão válida no payload atual do frete;
- a unidade 201 é reconhecida comparando a origem com a string `"92120190"`; retorno numérico pode ser classificado incorretamente;
- centavos podem divergir porque cada parcela do rateio é arredondada separadamente.

### 4.7 Endereço está preenchido, mas faltam campos no ERP

**Comportamento atual**

O payload envia `desEndereco`, `desLogradouro`, `codLogradouro`, `desBairro`, `codCidade`, `numCep` e `numLogradouro`. Complemento, referência, UF e descrição da cidade não são enviados.

**Verificações**

- tipo de logradouro foi carregado e corresponde exatamente a um `des_tipo`;
- `codLogradouro` está presente no payload;
- cidade contém o código IBGE;
- CEP e número não foram enviados como zero;
- data de carga possui o formato aceito pelo ERP.

**Recuperação**

- selecionar novamente tipo, CEP e cidade;
- revisar o JSON antes de reenviar;
- ausência de complemento ou referência é limitação atual, não falha da API;
- não reenviar um pedido já integrado apenas para corrigir endereço sem seguir o procedimento funcional do ERP.

### 4.8 PDF ou Excel não é baixado

**Causas prováveis**

- navegador bloqueou múltiplos downloads;
- falha no carregamento dinâmico de `exceljs`, `jspdf` ou `jspdf-autotable`;
- logo não pôde ser carregado;
- item não selecionado, cliente ou pagamento ausente;
- memória insuficiente para proposta muito grande.

**Verificações**

- console e Network para chunks JavaScript e `nlprod2023.png`;
- permissão de download do site;
- se uma unidade gerou arquivo e a outra não;
- texto do modal de erro.

**Recuperação**

- permitir múltiplos downloads para o site;
- repetir a exportação, que é local e não cria pedido no backend;
- gerar uma unidade por vez não é opção da interface atual; se o navegador bloquear o segundo arquivo, autorizar múltiplos downloads e repetir;
- se contatos do cliente estiverem vazios, verificar `clientes/{codigo}`. Essa consulta possui fallback silencioso e a proposta pode ser gerada sem os contatos.

### 4.9 ERP bloqueia antes do envio

Validações locais esperadas:

- item selecionado;
- item com tributação;
- quantidade positiva;
- cliente;
- operação;
- condição de pagamento;
- ordem de compra.

Corrija o campo indicado. Margem abaixo do mínimo não bloqueia: ela direciona a situação para `70` e pede confirmação.

### 4.10 Situação 6, 32 ou 70 parece incorreta

**Verificações por unidade**

1. Confirme a modalidade: `2` ou `7`.
2. Recalcule a sobra total somente com itens marcados daquela unidade.
3. Consulte a classificação mais recente.
4. Verifique AC (`A/B`) com mínimo de 4%.
5. Verifique MMT (`I/T`) com mínimo de 6%.
6. Itens de contrato não participam da regra individual, mas participam do total.
7. Confirme se o frete está rateado.

Resultado normal:

```text
qualquer violação → 70
sem violação + modalidade 2 → 6
sem violação + modalidade 7 → 32
```

### 4.11 Envio ERP retorna erro ou timeout

**Não clique novamente antes de reconciliar.**

Registre:

- unidade;
- ordem de compra;
- horário;
- número, se retornado;
- `etapa` e `detalhe`;
- status HTTP.

Depois consulte o controle Oracle e o ERP. Timeout significa resultado desconhecido: o ERP pode ter processado a solicitação antes da conexão expirar.

## 5. Interpretação das etapas do backend ERP

As etapas abaixo aparecem internamente nos logs. O JSON devolvido ao navegador nem sempre preserva a etapa original da falha.

| Etapa | Interpretação provável | Verificação |
|---|---|---|
| `conectar_oracle` | pool, rede, credencial ou Instant Client | logs Oracle e variáveis |
| `gerar_numero_pedido` | sequence ausente ou sem permissão | `SEQ_PEDIDO_ERP_INTEGRACAO` |
| `montar_payload_erp` | corpo inválido ou erro de aplicação | request recebido e stack |
| `inserir_controle_integracao` | tabela, CLOB ou permissão | tabela e grants |
| `post_erp` | rede, timeout, token, aplicação ou rejeição do ERP | retorno externo e ERP |
| `atualizar_integracao_sucesso` | falha ao marcar `INTEGRADO` | linha pode continuar `ENVIANDO` |
| `atualizar_integracao_erro` | falha secundária de auditoria | logs e linha Oracle |

> Como INSERT e POST são iniciados em paralelo, a etapa registrada é uma pista, não uma prova isolada. Uma falha do INSERT pode ser registrada no log quando a variável já está em `post_erp`. Além disso, quando já existem conexão e número, o tratamento muda a etapa para `atualizar_integracao_erro` antes de responder ao frontend. Consulte o primeiro log do erro para recuperar a etapa original. Falhas de `atualizar_integracao_sucesso` ocorrem após a resposta de sucesso e aparecem somente nos logs.

## 6. Consulta de evidências no Oracle

Use acesso somente leitura e parâmetros vinculados. Exemplos conceituais:

```sql
SELECT NUM_PEDIDO,
       STATUS,
       USUARIO,
       DATA_ENVIO,
       DBMS_LOB.SUBSTR(ERRO, 2000, 1) AS ERRO_RESUMIDO
  FROM PEDIDO_ERP_INTEGRACAO
 WHERE NUM_PEDIDO = :num_pedido;
```

Para uma janela recente, quando autorizado:

```sql
SELECT NUM_PEDIDO, STATUS, USUARIO, DATA_ENVIO
  FROM PEDIDO_ERP_INTEGRACAO
 ORDER BY NUM_PEDIDO DESC
 FETCH FIRST 50 ROWS ONLY;
```

Campos úteis:

| Campo | Uso no diagnóstico |
|---|---|
| `NUM_PEDIDO` | correlação com o ERP |
| `STATUS` | `ENVIANDO`, `INTEGRADO` ou `ERRO` |
| `PAYLOAD` | unidade, cliente, OC e dados enviados |
| `RESPOSTA_ERP` | confirmação ou retorno funcional |
| `ERRO` | detalhe técnico |
| `USUARIO` | origem informada pelo frontend |
| `DATA_ENVIO` | conclusão/erro; pode ser nula em `ENVIANDO` |

O payload contém dados comerciais e pessoais. Restrinja a consulta e mascare evidências.

## 7. Integração parcial entre unidades

O frontend envia os payloads das unidades em paralelo. `Promise.all` encerra com erro quando uma chamada falha, mesmo que a outra já tenha sido integrada.

### Procedimento obrigatório

1. Suspenda novas tentativas.
2. Identifique separadamente 201 e 203 no Network e nos logs.
3. Levante todos os números gerados no intervalo.
4. Consulte cada número na tabela de controle.
5. Confirme no ERP, não apenas no Oracle, a existência de cada pedido.
6. Classifique cada unidade como:
   - confirmadamente integrada;
   - confirmadamente não integrada;
   - resultado desconhecido.
7. Reenvie somente a unidade confirmadamente não integrada.
8. Para resultado desconhecido, escale ao responsável pelo ERP antes de reenviar.

Na seleção de unidades, escolha apenas a unidade falha. Revise também os itens marcados para evitar incluir conteúdo diferente da tentativa original.

## 8. Status `ENVIANDO` persistente

`ENVIANDO` não significa necessariamente que o ERP não recebeu o pedido.

O comportamento atual responde sucesso ao frontend antes de concluir o `UPDATE INTEGRADO`. Se esse update falhar, a linha pode permanecer `ENVIANDO` apesar de o ERP possuir o pedido.

Recuperação segura:

1. consultar `PAYLOAD` para identificar unidade, cliente e OC;
2. localizar o número no ERP;
3. consultar logs da etapa `atualizar_integracao_sucesso`;
4. registrar a conclusão da reconciliação;
5. corrigir status somente por procedimento autorizado e auditável;
6. nunca apagar a linha nem reenviar apenas por estar `ENVIANDO`.

## 9. Suspeita de duplicidade

Indícios:

- mesma OC, cliente e unidade em números próximos;
- timeout seguido de nova tentativa;
- dois registros `INTEGRADO` com conteúdo equivalente;
- pedido presente no ERP sem confirmação visual da primeira tentativa.

Procedimento:

1. interromper novos envios;
2. comparar payloads e horários;
3. confirmar os dois números no ERP;
4. acionar o responsável funcional para cancelamento/regularização;
5. preservar ambos os registros de auditoria;
6. documentar qual tentativa originou cada número.

Não corrija duplicidade excluindo dados da tabela de integração.

## 10. Coleta e retenção de logs

Logs atuais estão em `console` do backend. Comandos:

```bash
podman compose logs --since=30m backend
podman compose logs -f backend
podman inspect projeto-cotacao-backend
```

Ao anexar logs:

- inclua intervalo de tempo e fuso;
- preserve `etapa`, status HTTP e número;
- masque cliente quando o chamado não exigir identificação;
- remova credenciais, tokens, senhas e string Oracle;
- evite anexar payload ou resposta integral.

## 11. Escalonamento

| Cenário | Destino recomendado |
|---|---|
| Campo ou regra de tela | produto/desenvolvimento |
| Cadastro de cliente/item | equipe responsável pelo ORDS/cadastro |
| Tributação | fiscal/ERP |
| Sem transportadora/erro externo | integração SimFrete |
| Oracle/sequence/tabela | DBA/infraestrutura |
| Token, aplicação ou rejeição ERP | integração ERP |
| Duplicidade ou integração parcial | integração ERP + área funcional |
| Container, rede, proxy ou certificado | infraestrutura |

## 12. Melhorias recomendadas para suporte

1. Adotar `requestId` de ponta a ponta e retorná-lo ao modal.
2. Usar logs estruturados com duração, unidade, etapa e número, sem payload integral.
3. Criar health checks de prontidão para ORDS e Oracle.
4. Criar painel para registros `ERRO` e `ENVIANDO` antigos.
5. Trocar o envio multiunidade por resultado explícito com `Promise.allSettled`.
6. Implementar idempotência por tentativa/unidade.
7. Padronizar tratamento de erros em modal, eliminando falhas silenciosas e `alert()`.
8. Registrar versão do frontend/backend em logs e no health check.
