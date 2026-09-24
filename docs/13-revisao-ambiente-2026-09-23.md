# Revisão do ambiente — 23/09/2026

## Escopo e resultado

Revisão do frontend, serviços, backend, configuração Docker/Nginx e documentação. Nenhuma alteração funcional foi feita nesta revisão. Não houve envio real ao ERP, alteração de parâmetros, escrita no Oracle nem cotação real no SimFrete.

- Build de produção: aprovado.
- Sintaxe do backend: aprovada.
- ESLint com configuração react-app: zero erros e nove avisos.
- 64 cenários locais: 49 verificações funcionais passaram e 15 cenários de risco foram reproduzidos. Estes últimos confirmam defeitos/fragilidades; não significam aprovação do comportamento.
- Os testes incluem geração e leitura de Excel, PDF multipágina, importação, cálculos, parâmetros, cache, alvará, notas por cliente, carga antecipada e simulações do backend.
- Sete GETs reais, sequenciais, sem repetição, todos HTTP 200. São amostras de disponibilidade/contrato, não validação de todas as combinações fiscais e comerciais.
- Não foram executados teste de carga, auditoria atualizada de dependências, deploy Docker ou jornada manual completa no navegador. Oracle, ERP e SimFrete foram avaliados por código e simulações, sem comprovação de disponibilidade externa.

Scripts e evidências locais fora do deploy: `C:/Desenvolvimento/.codex-audit-quotation/`, arquivos `review.cjs`, `review-2026-09-23.json`, `api-review.json`, `lint-review.json`, `importacao.cjs`, `notas.cjs`, `preload.cjs` e `alvara.cjs`.

## Amostragem das APIs

Tempos de uma execução, sujeitos à rede e ao servidor; não são média nem SLA.

| Rota | HTTP | Tempo | Evidência |
| --- | --- | --- | --- |
| parsConf | 200 | 2,65 s | 17 parâmetros |
| itens | 200 | 9,52 s | 2.260 itens, aproximadamente 846 KB; todos com UM; 836 múltiplos nulos |
| clientes/22222 | 200 | 1,09 s | Agora inclui dta_validade_alvara |
| clientesUltimaCompra/22222 | 200 | 1,76 s | 2.539 registros; máximo de cinco por item; nenhum sem data ou quantidade |
| clientesItensNotas/22222 | 200 | 1,33 s | 673 itens, campos de NF e NFD corretos |
| itensDetalhados/7084 | 200 | 0,69 s | Campos de custo, estoque e dimensões presentes |
| impostos/150/201/22222/8/7084 | 200 | 0,97 s | Estrutura de tributação retornada |

Os endpoints de coleção amostrados informaram `hasMore: false`. Valores nulos de múltiplo usam sugestão 1, conforme comportamento combinado. O cadastro do cliente por código ainda não inclui cidade; o fluxo de proposta já possui complemento pela listagem, mas uniformizar esse contrato evita consultas auxiliares.

## Prioridade máxima: segurança e integridade do pedido

1. **Envio parcial pode provocar duplicidade.** `PedidoVenda.js`, função `enviarPedidosAoErp`: `Promise.all` perde o tratamento individual quando uma unidade falha. Simulação confirmou envios 201/203 repetidos após nova tentativa. Registrar resultado por unidade e introduzir chave de idempotência persistida no backend; reenviar somente pendências. Timeout também exige reconciliação antes de repetir.
2. **ERP pode receber pedido sem controle persistido.** `backend-simfrete/server.js:242`: INSERT e POST externo executam em paralelo. Teste confirmou POST mesmo quando INSERT falha. Persistir o controle antes do envio externo.
3. **Sucesso pode ser registrado como erro.** `server.js:261`: resposta de sucesso é enviada antes do UPDATE de confirmação; se este falhar, o catch marca ERRO apesar de o ERP ter aceitado. Diferenciar falha de integração de falha de registro da confirmação; implementar reconciliação. Não simplesmente repetir o POST.
4. **Rotas sensíveis sem autenticação/autorização no código.** PUT de parâmetros e POST de pedido ficam acessíveis a quem alcançar o backend. Ocultar o botão de configurações não protege a rota. Implementar identidade e permissão no servidor. Eventual proteção externa da infraestrutura não foi verificada. `cors()` aberto não é autenticação.
5. **Proxy permite URL absoluta fora do servidor ORDS previsto.** `server.js:147`: caminho recebido é passado ao Axios sem restrição de destino. Simulação confirmou resolução para outro host. Rejeitar URLs absolutas, protocolos e travessia de caminho; permitir apenas recursos esperados. Não foi feita exploração real.
6. **Segredos podem entrar na imagem Docker do backend.** Compose usa contexto `./backend-simfrete`, cujo diretório não tem `.dockerignore`; Dockerfile faz `COPY . .`. O `.dockerignore` da raiz não vale para esse contexto. Excluir `.env`, dependências locais e arquivos de desenvolvimento no contexto correto. A imagem publicada não foi inspecionada.

## Falhas funcionais reproduzidas

| Problema | Consequência | Correção recomendada |
| --- | --- | --- |
| Troca de condição de pagamento não recalcula dados existentes | Preço/impostos podem continuar pertencendo à condição anterior | Uma ação de mudança de contexto que invalida e recalcula os itens |
| Troca de operação com falha preserva item selecionado e impostos antigos | Pedido mistura operação nova e dados anteriores | Marcar item pendente/erro e impedir envio até resolver |
| Detalhes vazios permitem custo médio zero na adição manual | Sobra pode ser artificialmente elevada | Exigir detalhe válido; distinguir custo zero confirmado de custo desconhecido |
| Classificação vazia em HTTP 200 permite ignorar regra individual | Aprovação pode usar limiar inadequado | Exigir classificação para avaliar a regra, sem tratar ausência como aprovação |
| Quantidade alterada mantém cotação anterior | Frete não corresponde mais a peso/volume atuais | Invalidar cotação quando seus dados de entrada mudam |
| Origem SimFrete numérica cai na unidade 203 | Comparação atual só reconhece string da origem 201 | Normalizar tipo e rejeitar origem desconhecida |
| Resposta tardia de observações do cliente A sobrescreve B | Exibição de observações do cliente errado | Identificador da requisição ou cancelamento antes de atualizar estado |
| Múltiplo fracionário 0,3 / 0,1 é rejeitado | Validação diverge da LOV/importação | Centralizar validação com tolerância decimal |
| ERP aceita preço zero e proposta aceita quantidade zero | Validações divergem entre saídas | Definir exceções de negócio e compartilhar validação; bloquear por padrão se não autorizadas |
| Duas primeiras requisições criam pools Oracle concorrentes | Inicialização duplicada pode falhar/desperdiçar recursos | Compartilhar a Promise de criação do pool |
| Backend aceita payload vazio e encaminha ao ERP | Validações do frontend podem ser contornadas | Validar estrutura, tipos e regras essenciais no servidor |

Os dois riscos do fluxo de persistência ERP e o proxy também foram reproduzidos, totalizando os 15 cenários citados no resumo.

## Consultas, desempenho e cache

- **Manter a carga antecipada de itens:** ela atende ao fluxo do vendedor. Teste confirmou compartilhamento de requisição durante abertura da LOV, inclusive em StrictMode. Não remover para reduzir números artificialmente.
- **Unificar cache do catálogo no serviço:** hoje está dentro de `LovItens.js`; `importarItensExcel` faz outro `getItens()` direto. Reaproveitar a mesma Promise/listagem com expiração e atualização explícita.
- **Impostos/acordos por item:** página de 25 itens ainda pode exigir 50 chamadas fiscais e 25 de acordos em contexto novo. Cache e concorrência limitada ajudam; endpoints em lote são a próxima melhoria estrutural, sem modificar os cálculos.
- **Importação:** consulta detalhes por produto e calcula ambas as unidades, inclusive a ausente no arquivo. Funciona, mas pode ser demorada para 200 linhas. Buscar detalhes em pequenos lotes e avaliar carregamento da unidade desmarcada somente ao selecioná-la. Manter limite de concorrência.
- **Cache sem descarte global:** `consultaCache.js` expira logicamente, mas chaves nunca reutilizadas continuam no Map. Aplicar limpeza de expirados e limite de entradas para sessões longas.
- **Parâmetros já compartilham a primeira chamada:** teste confirmou um GET entre inicialização e configurações. Após salvar, o cache é invalidado; atualização completa do navegador também cria nova sessão. Isso não é duplicação involuntária.
- **Falhas silenciosas:** `catch(() => [])`, `catch(() => null)` e catches vazios em acordos/histórico podem apresentar falha como ausência de informação. Padronizar estados carregando/pronto/vazio/erro, como já feito para notas.
- **Paginação:** serviços de coleções devem definir comportamento se ORDS passar a retornar `hasMore: true`. Nas amostras atuais não ocorreu truncamento.

## Organização e simplificação profissional

`PedidoVenda.js` tem 3.794 linhas e mistura tela, requisições, regras, cálculos, importação, frete e ERP. A prioridade é separar responsabilidades com testes de comportamento, não apenas reduzir linhas.

Separação sugerida, gradual:

```text
features/pedido/
  components/     ClientePedido, TabelaUnidade, ResumoPedido, AcoesPedido
  hooks/          useClientePedido, useItensPedido, useCotacaoFrete
  domain/         calcularItem, validarItem, validarMultiplo, montarPedidoErp
  services/       importarPedido, integrarPedido
```

- Cálculos puros recebem dados e retornam resultados, sem acessar estado React nem HTTP.
- Uma função de carregamento de produto deve servir à inclusão manual e importação; hoje validam detalhes e preços de formas diferentes.
- Converter valores numéricos e formatos de data na fronteira da API; padronizar código como string ou número. Evitar vários aliases no restante da aplicação.
- Centralizar concorrência, formatação e validação de múltiplos. Não encurtar código com funções genéricas que escondam regras diferentes.
- Evitar guardar no item cópias do histórico já disponível no mapa por cliente; estado duplicado exige sincronização.
- Reduzir setters dispersos com ações claras de alteração de cliente/operação/condição e invalidação das dependências.
- Modais precisam de gerenciamento de foco, Escape e retorno ao botão de origem. A importação tem semântica de diálogo, mas não contenção do foco.
- Criar classes CSS para estilos compartilhados, substituindo estilos inline repetidos quando fizer sentido.

## Limpeza e manutenção

- `FaEdit` importado e não usado em PedidoVenda: remover.
- Escape desnecessário na expressão regular (linha 267): simplificar.
- Dois `throw` de objeto literal (linhas 2387/2398): usar Error com metadados para preservar stack e padronizar tratamento.
- Cinco avisos de dependências de hooks (LovCidades, LovClientes, LovItens, LovUf): reorganizar funções/efeitos antes de corrigir arrays; adicionar dependências cegamente pode criar loops.
- `SIMFRETE_DEBUG` não tem referência no código frontend/backend examinado: não produz efeito nesse código; documentar ou remover se não houver consumidor externo.
- Script `test` do backend é placeholder que sempre falha. Substituir por suíte real quando reintroduzir testes versionados.
- Scripts de auditoria externos atendem à preferência atual de não incluir testes no projeto, mas não dão regressão automática à equipe. Uma evolução profissional é versionar testes e excluí-los da imagem/runtime; teste não precisa entrar no deploy.
- README aponta para `12-registro-riscos-roadmap.md` e `14-otimizacao-consultas-frontend.md`, ausentes no diretório revisado. A referência geral de agosto está desatualizada frente aos recursos novos.
- Docker usa `npm install`; preferir `npm ci` com lockfile para instalação reproduzível. Executar backend como usuário sem privilégios e configurar healthcheck/readiness.
- `/health` retorna apenas `{ok:true}`: mede processo HTTP, não a disponibilidade de Oracle/integrações. Separar liveness de readiness com verificações limitadas/cacheadas.
- Nginx fornecido atende HTTP; confirmar terminação TLS na infraestrutura. Não foi verificado servidor externo que faça essa terminação.
- Aviso de base Browserslist desatualizada no build: manutenção de baixa prioridade; não é, por si só, evidência de vulnerabilidade.

## Ordem recomendada

1. Autorização, restrição do proxy e exclusão de segredos da imagem.
2. Idempotência, resultado por unidade e consistência do controle ERP.
3. Invalidação/recalculo de preço, tributos e frete; impedir envio com dados desconhecidos.
4. Consolidar catálogo/cache e carregamento dos itens; depois implementar consultas em lote.
5. Extrair módulos do PedidoVenda com regressões protegidas; limpar avisos e atualizar documentação.

Não é necessário reescrever todo o sistema ou trocar de framework para executar esse plano.
