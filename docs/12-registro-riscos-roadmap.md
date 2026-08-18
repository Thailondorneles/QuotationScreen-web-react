# 12 — Registro de riscos e roadmap técnico

## 1. Objetivo

Este documento consolida fragilidades observadas no comportamento atual e propõe uma ordem de tratamento. Os riscos descrevem o estado implementado; as recomendações e o roadmap não representam funcionalidades já entregues e dependem de análise, implementação e homologação.

Escala utilizada:

| Nível | Interpretação |
|---|---|
| Crítico | Pode criar pedido duplicado, resultado financeiro incorreto, exposição indevida ou perda de rastreabilidade |
| Alto | Pode produzir decisão comercial incorreta, falha frequente ou documento inconsistente |
| Médio | Prejudica suporte, usabilidade, acessibilidade ou manutenção |
| Baixo | Melhoria de consistência, clareza ou evolução futura |

## 2. Riscos críticos

| ID | Risco atual | Consequência possível | Recomendação | Critério mínimo de aceite |
|---|---|---|---|---|
| RSK-001 | 201 e 203 são enviados simultaneamente e o frontend trata o conjunto como uma única operação | Uma unidade pode ser integrada e outra falhar; repetir pode duplicar a primeira | Adotar resultado individual por unidade com `Promise.allSettled`, informar sucesso parcial e bloquear repetição cega | A mensagem final identifica número/status de cada unidade e permite reprocessar apenas a que falhou |
| RSK-002 | O backend inicia o `INSERT` de controle e o POST ao ERP em paralelo | ERP pode aceitar o pedido sem registro inicial confiável | Persistir primeiro, enviar depois e atualizar o mesmo registro em transação bem definida | Todo POST externo possui registro prévio consultável e correlação única |
| RSK-003 | Não há idempotência/reconciliação automática | Timeout ou clique repetido pode gerar mais de um pedido | Criar chave idempotente por tentativa/unidade e rotina de consulta/reconciliação | Repetir a mesma chave nunca cria um segundo pedido |
| RSK-004 | Endpoint ERP não possui autenticação própria nem schema formal; usuário vem da query string | Payload adulterado, usuário de auditoria não confiável e superfície de acesso ampla | Autenticar no backend, obter identidade do contexto confiável, validar payload e restringir CORS/rede | Requisição sem identidade ou fora do schema é rejeitada antes de Oracle/ERP |

## 3. Riscos altos de cálculo e contexto

| ID | Risco atual | Consequência possível | Recomendação | Critério mínimo de aceite |
|---|---|---|---|---|
| RSK-005 | Trocar condição de pagamento não recalcula itens existentes | Preço e imposto podem permanecer ligados à condição anterior | Centralizar atualização do contexto comercial e invalidar/recalcular todos os itens | Após trocar a condição, todas as combinações unidade/item são consultadas novamente |
| RSK-006 | Ao trocar cliente, o primeiro recálculo pode usar operação/condição anteriores | Mistura temporária ou definitiva de dados comerciais | Resolver primeiro o novo contexto padrão e só depois enriquecer os itens | Nenhuma consulta fiscal usa combinação híbrida de cliente novo e contexto antigo |
| RSK-007 | Resposta fiscal cacheada pode ser mutada durante ajuste de DIFAL | Chamadas futuras podem calcular imposto com dado já alterado | Copiar o objeto antes de normalizá-lo e manter o cache imutável | Repetições da mesma consulta produzem o mesmo resultado de origem |
| RSK-008 | Frete selecionado é limpo em alguns fluxos, mas parcelas antigas podem permanecer nos itens | Sobra considera frete que o cartão informa como não cotado | Criar uma única função de invalidação que zere seleção, cotações e rateio | Qualquer mudança relevante marca o frete como vencido e remove todas as parcelas |
| RSK-009 | Quantidade, preço, seleção e itens podem mudar sem recotação automática | Frete, peso, valor segurado e margem tornam-se desatualizados | Invalidar a cotação e exigir nova cotação ou confirmação explícita | Alterações posteriores nunca mantêm cotação aparentemente válida |
| RSK-010 | SimFrete usa `Number` em preço localizado | `"9,30"` pode virar `NaN`/`null`, alterando o valor total da cotação | Reutilizar conversor decimal brasileiro e validar números finitos | Ponto, vírgula e quatro casas produzem o mesmo valor numérico esperado |
| RSK-011 | Destino do frete usa a cidade cadastral do cliente | Endereço de entrega alternativo pode receber cotação incorreta | Priorizar `codCidade` do endereço de entrega quando preenchido | Payload usa o destino efetivamente escolhido na tela |
| RSK-012 | Preço positivo não é validado antes do ERP ou da proposta | Pedido ou proposta pode conter item zerado | Incluir validação de quantidade, preço e total positivos em uma camada comum | Nenhuma saída é gerada com item selecionado de preço/quantidade inválidos |

## 4. Riscos altos de documento e dados

| ID | Risco atual | Consequência possível | Recomendação | Critério mínimo de aceite |
|---|---|---|---|---|
| RSK-013 | Excel não apresenta ordem de compra nem referência, enquanto o PDF apresenta | Documentos comerciais divergentes | Definir matriz oficial de conteúdo e aplicar a ambos os geradores | Teste automatizado confirma os mesmos campos obrigatórios nos dois formatos |
| RSK-014 | Coordenadas fixas do PDF permitem sobreposição de data, endereço e tabela | Documento ilegível em combinações válidas | Calcular cursor vertical a partir dos blocos realmente renderizados | Cenários com/sem OC, endereço e data não se sobrepõem |
| RSK-015 | Textos longos de cliente/observação não têm paginação robusta | Conteúdo cortado ou fora da página | Quebrar linhas, medir altura e criar páginas com cabeçalho consistente | Documento com textos máximos permanece legível em todas as páginas |
| RSK-016 | Falha ao atualizar contato do cliente é silenciosa | Proposta é emitida com `-` sem o operador saber | Mostrar aviso não bloqueante e indicar uso do dado em cache/tela | Usuário sabe quando contato não foi atualizado |

## 5. Riscos médios funcionais e de integração

| ID | Risco atual | Consequência possível | Recomendação |
|---|---|---|---|
| RSK-017 | Margem é comparada após arredondamento para duas casas | `5,999%` pode ser tratado como `6,00%` | Definir regra contábil oficial e comparar precisão integral ou tolerância formal |
| RSK-018 | Rateio arredonda cada item sem compensar resíduo | Soma pode divergir centavos da cotação | Ajustar diferença no último item elegível |
| RSK-019 | Origem 201 é reconhecida apenas como string no retorno SimFrete | Origem numérica pode ser atribuída à 203 | Normalizar CEP para string antes da comparação |
| RSK-020 | Complemento e referência não entram em `peEndEntrega` | Endereço ERP incompleto | Validar contrato e incluir campos, se suportados |
| RSK-021 | Endereço parcial envia zeros e número alfanumérico perde caracteres | Dados de entrega ambíguos | Validar obrigatórios e confirmar tipos aceitos pelo ERP |
| RSK-022 | Triangulação não exige cliente e operação como par | Payload parcialmente configurado | Aplicar regra conjunta ou documentar combinações aceitas pelo ERP |
| RSK-023 | `indVlrAlterado` permanece `0` após edição | ERP pode não reconhecer alteração manual | Confirmar semântica com equipe ERP e calcular o indicador |
| RSK-024 | Transportadora e valor do frete não entram no ERP | Resultado logístico da simulação não é transmitido | Confirmar se o ERP possui campos/serviço específico e integrar se necessário |
| RSK-025 | `numItem` pode ter lacunas por unidade | Consumidores podem esperar sequência contínua | Confirmar contrato; renumerar apenas se permitido pelo ERP |
| RSK-026 | A LOV de endereços limita-se aos primeiros 25 | Endereço válido pode não aparecer | Implementar paginação ou carga completa controlada |

## 6. Riscos médios de interface e acessibilidade

| ID | Risco atual | Recomendação |
|---|---|---|
| RSK-027 | Diversas linhas de LOV só são acionáveis por mouse | Adicionar foco, semântica, Enter/Espaço e indicador visual |
| RSK-028 | Tooltips importantes dependem de hover | Disponibilizar por foco e toque, com associação ARIA |
| RSK-029 | Modais não implementam de forma uniforme foco, Escape e armadilha de foco | Criar componente de diálogo único e acessível |
| RSK-030 | Loading global e status de proposta não têm anúncio assistivo | Aplicar `role="status"`, `aria-live` e `aria-busy` |
| RSK-031 | Falhas e estados vazios das LOVs não são uniformes | Padronizar loading, vazio, erro e nova tentativa |
| RSK-032 | Cor verde da sobra significa apenas valor não negativo | Exibir também indicador explícito de margem mínima atendida |
| RSK-033 | Sequência mostrada na confirmação pode usar `seq` técnico em vez de `numItem` visível | Usar a mesma sequência exibida na grade |

## 7. Riscos de manutenção

| ID | Risco atual | Recomendação |
|---|---|---|
| RSK-034 | `PedidoVenda.js` reúne interface, domínio, cálculo e integração | Extrair hooks/controladores e funções puras por domínio |
| RSK-035 | Backend concentra proxy, Oracle, frete e ERP em `server.js` | Separar rotas, validadores, serviços externos e repositório |
| RSK-036 | Caches sem TTL armazenam dados e falhas durante a sessão | Definir política de expiração, tamanho, invalidação e retry |
| RSK-037 | Cache do hook de paginação existe, mas não é ativado pelas LOVs | Ativar com chaves corretas ou remover complexidade inativa |
| RSK-038 | Configuração institucional da proposta exige nova publicação | Externalizar valores por ambiente ou cadastro controlado |
| RSK-039 | Não há testes automatizados dos fluxos críticos | Implantar testes unitários, de contrato e E2E conforme documento 09 |
| RSK-040 | Erros alternam modal, `alert` e silêncio | Criar política única de erro, correlação e observabilidade |

## 8. Roadmap recomendado

### Fase 0 — Proteção operacional imediata

1. Orientar suporte a conferir Oracle e ERP antes de reenviar após erro ou timeout.
2. Registrar manualmente resultados separados de 201 e 203.
3. Orientar o usuário a recotar frete após qualquer mudança nos itens ou contexto.
4. Incluir os cenários críticos na homologação manual obrigatória.

### Fase 1 — Integridade da integração

1. Tratar resultado individual por unidade.
2. Serializar registro e POST no backend.
3. Implementar idempotência e reconciliação.
4. Validar schema, autenticar e obter usuário confiável.
5. Melhorar health checks e correlação de logs.

### Fase 2 — Integridade dos cálculos

1. Centralizar mudança de contexto comercial.
2. Invalidar frete de forma completa.
3. Corrigir decimal localizado do SimFrete.
4. Tornar caches imutáveis e com política explícita.
5. Formalizar arredondamento e resíduo do rateio.

### Fase 3 — Consistência documental e experiência

1. Alinhar PDF e Excel.
2. Corrigir paginação/layout dos documentos.
3. Padronizar erros, loading e estados vazios.
4. Tornar LOVs e modais acessíveis por teclado e leitor de tela.

### Fase 4 — Sustentabilidade

1. Refatorar a tela e o backend por responsabilidades.
2. Externalizar configurações institucionais.
3. Implantar suíte automatizada e pipeline de qualidade.
4. Criar painel de consulta e reprocessamento controlado da integração.

## 9. Governança sugerida

Para cada risco tratado, registrar:

- responsável funcional e técnico;
- decisão de negócio aprovada;
- versão de frontend e backend;
- evidência de teste;
- impacto no contrato ERP/ORDS/SimFrete;
- plano de reversão;
- atualização dos documentos afetados.

O registro deve ser revisado sempre que houver mudança em cálculo, tributação, classificação, payload, situação ERP, frete ou geração de documentos.
