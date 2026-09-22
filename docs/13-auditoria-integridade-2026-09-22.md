# Auditoria de integridade — 22/09/2026

Revisão do frontend React, serviços, cálculos, exportações, backend, rotas e arquivos de implantação no estado atual do workspace. As alterações anteriores do projeto foram preservadas. Esta auditoria não modificou regras, dependências ou configurações do sistema.

**Resultado e limites da verificação**

- Build de produção: passou (`npm.cmd run build`).
- Sintaxe do backend: passou (`node --check backend-simfrete/server.js`).
- ESLint nos 51 arquivos JavaScript de `src`: zero erros e 11 avisos. Incluem dependências de hooks, import sem uso e lançamento de objetos em vez de `Error`.
- Bateria local: **55 cenários**, sendo **35 verificações funcionais aprovadas e 20 reproduções de comportamentos problemáticos**. As reproduções confirmam defeitos/riscos; não significam que essas funcionalidades estejam aprovadas. Nenhum cenário ficou inconclusivo por erro do executor na execução final.
- Interfaces montadas com React e DOM simulado; regras internas executadas a partir das funções reais do projeto. Oracle, ERP, SimFrete e HTTP substituídos por respostas simuladas nesses testes.
- PDF e Excel gerados de verdade com dados fictícios. Excel reaberto e inspecionado programaticamente; PDF verificado estruturalmente, inclusive com 120 itens em várias páginas. Não houve inspeção visual em navegador nem homologação fiscal com o ERP.
- **Somente cinco GETs reais, sequenciais, sem repetição, nas APIs de negócio.** Nenhum PUT, POST, pedido, cotação ou alteração no Oracle foi executado nesta auditoria.
- Auditorias de dependências consultaram o registro público do npm. A consulta do frontend, inicialmente bloqueada pela revisão automática, foi executada após autorização explícita do usuário.

**Problemas de maior prioridade**

| Prioridade | Problema e evidência | Consequência | Correção recomendada |
| --- | --- | --- | --- |
| Alta | Envio das duas unidades usa `Promise.all`. Na simulação, 201 teve sucesso e 203 falhou; nenhum sucesso foi apresentado e um segundo clique enviou 201 novamente. [PedidoVenda.js](../src/views/PedidoVenda.js:2383) | Risco de pedido duplicado e perda da identificação de uma integração concluída. | Controlar resultado por unidade, preservar sequência de integração, impedir reenvio das unidades concluídas e adotar identificador estável de tentativa no servidor. |
| Alta | Backend dispara INSERT do controle e POST do ERP em paralelo. Com falha do INSERT, o ERP ainda é chamado. [server.js](../backend-simfrete/server.js:241) | Pedido pode existir no ERP enquanto a tela recebe erro e o controle local está ausente. | Confirmar persistência do controle antes do POST; registrar estado de resultado desconhecido em timeouts, com consulta antes de reenviar. |
| Alta | Backend responde sucesso antes do UPDATE de integração. Se esse UPDATE falha, o tratamento de erro grava `ERRO`, embora o ERP já tenha respondido sucesso. Reproduzido com mocks. [server.js](../backend-simfrete/server.js:261) | Controle de integração contradiz o pedido criado e favorece reprocessamento indevido. | Separar erro de envio de falha ao registrar o sucesso. Preservar o retorno e prever reconciliação. |
| Alta | Trocar condição de pagamento apenas chama `setCondPgto`, inclusive pela LOV; não recalcula itens. A simulação alterou 8 para 9 sem consultar impostos. [PedidoVenda.js](../src/views/PedidoVenda.js:1553), [seleção na LOV](../src/views/PedidoVenda.js:3083) | ERP recebe a nova condição com preço/impostos/sobra da condição anterior. | Centralizar a troca da condição e recalcular/inabilitar itens até obter os dados novos. |
| Alta | Trocar operação com erro na API conserva o item antigo selecionado. Reproduzido com operação 200 e tributação anterior. [PedidoVenda.js](../src/views/PedidoVenda.js:1474) | Pedido pode misturar operação nova com tributação e preço antigos. | Aplicar a mesma invalidação usada na troca de cliente: zerar dados comerciais inválidos e desmarcar o item até recuperar o cálculo. |
| Alta | Resposta 200 com `items: []` em detalhes permite adicionar item com custo médio zero. Classificação incompleta também não bloqueia a avaliação individual. Ambos reproduzidos. [adição](../src/views/PedidoVenda.js:909), [custo](../src/views/PedidoVenda.js:663), [classificação](../src/views/PedidoVenda.js:2130) | Sobra superestimada ou regra individual de aprovação ignorada. | Validar presença do código solicitado e campos obrigatórios. Tratar ausência de dados como erro, distinguindo-a de zero informado pela API. |
| Alta | Não há autenticação/autorização nas rotas locais de parâmetros, cotação ou ERP. O backend aceita até payload ERP vazio; regras de negócio são verificadas no navegador. [server.js](../backend-simfrete/server.js:140), [envio](../backend-simfrete/server.js:202) | Quem alcançar essas rotas pode contornar a tela, alterar parâmetros ou encaminhar dados arbitrários. A identidade de auditoria vem de `usuario` informado pelo cliente. | Implementar controle no servidor, inclusive antes das futuras permissões de tela; validar payload, unidades, itens e regras comerciais. A exposição externa depende da rede/proxy, não verificados nesta auditoria. |
| Alta | Proxy GET aceita uma URL absoluta como caminho, e o Axios a utiliza em lugar do endereço base. Confirmado exclusivamente com mocks e `getUri`, sem acessar destinos extras. [server.js](../backend-simfrete/server.js:151) | Possibilidade de usar o backend para consultar destinos fora da API prevista, inclusive recursos acessíveis à rede do servidor. | Restringir recursos permitidos, rejeitar URLs absolutas e traversal, validar o destino final e controlar redirecionamentos. |
| Alta | O contexto Docker do backend é `./backend-simfrete`, não possui `.dockerignore` próprio e o Dockerfile faz `COPY . .`. [docker-compose.yml](../docker-compose.yml:4), [Dockerfile](../backend-simfrete/Dockerfile:12) | Em build a partir desta pasta com `.env` presente, segredos entram na imagem. `node_modules` local também pode sobrescrever dependências instaladas no Linux. | Criar exclusão de `.env*`, `node_modules`, logs e artefatos no contexto do backend; injetar segredos somente em runtime. A regra de localização do arquivo consta na [documentação Docker](https://docs.docker.com/build/concepts/context/#dockerignore-files). |

Os dois timeouts de ERP são de 30 segundos, no frontend e no backend. O backend ainda precisa obter conexão e sequência antes do POST. Logo, o navegador pode desistir antes do resultado final, mesmo sem timeout no ERP. Ajustar tempos ajuda a experiência, mas a prevenção de duplicação exige rastreamento da tentativa e reconciliação, não somente aumentar timeout. [serviço frontend](../src/services/pedidosErp.js:12), [servidor](../backend-simfrete/server.js:85).

**Consultas desnecessárias, repetidas ou caras**

| Rota/fluxo | Evidência | Ajuste sugerido |
| --- | --- | --- |
| `clientesUltimaCompra/:cliente` | O efeito depende de `openLovItens`, então executa ao abrir e fechar a LOV, além da troca de cliente e do evento `focus`. No único GET real desse histórico, retornaram **13.085 registros em 7,785 s**, apesar de `limit=1`. [PedidoVenda.js](../src/views/PedidoVenda.js:188) | Deduplicar a requisição e aplicar TTL/invalidação. Tirar a dependência da abertura da LOV. No ORDS, retornar histórico limitado por produto ou oferecer filtro pelos códigos necessários. O parâmetro visual de cinco compras limita apenas depois de baixar tudo. |
| `impostos/.../:item` e `itensAcordos/:item/:cliente` na LOV | Uma página simulada de 25 itens gerou **50 GETs de impostos + 25 de acordos**. Houve mais um GET do catálogo e um de lotes: 77 no total. Os impostos têm até oito requisições simultâneas e acordos até cinco. [LovItens.js](../src/components/LovItens.js:333), [preços](../src/components/LovItens.js:383) | Preferir endpoint em lote ou incluir os dados necessários à listagem em resposta conjunta. Se acordos forem apenas informação auxiliar, carregar sob demanda. Diminuir o volume por página/concorrência pode aliviar o servidor enquanto isso. |
| Filas da LOV ao fechar/paginar | O cleanup marca `ativo=false`, mas os workers continuam consumindo os itens. A flag apenas impede atualizar o estado ao terminar. Revisão estática. [LovItens.js](../src/components/LovItens.js:64) | Parar a fila obsoleta e propagar cancelamento HTTP onde possível. |
| `parsConf` na rota `/config` | Montagem React sem StrictMode confirmou **três GETs**: carga da página, carga global do App e nova carga da página após mudar a `key`. [App.js](../src/App.js:21), [Configuracoes.js](../src/views/Configuracoes.js:52) | Compartilhar a resposta inicial e evitar desmontar/remontar o roteador para aplicar parâmetros. Atualização explícita da listagem pode continuar consultando a API quando necessária. |
| `tipLogradouro` ao iniciar | Confirmadas duas consultas na inicialização sem StrictMode, por remontagem. Não há cache, e a função percorre todas as páginas. [PedidoVenda.js](../src/views/PedidoVenda.js:576) | Carregar quando usar endereço e compartilhar cache/promise; eliminar a remontagem do App. |
| `clientes`, `itens`, `itensLotes` | São carregados ao montar o pedido, antes de abrir a seleção. O cache evita parte das duplicações, mas o carregamento antecipado existe. [LovClientes.js](../src/components/LovClientes.js:109), [LovItens.js](../src/components/LovItens.js:301), [PedidoVenda.js](../src/views/PedidoVenda.js:208) | Adiar até a primeira utilização. Avaliar paginação real para catálogos grandes; hoje a filtragem é local. |
| `operacoes/:id`, `condPgto/:id`, `cidades/:id`, `uf/:id` | Efeitos usam `isOpen || codigo`, permitindo busca com LOV fechada e código preenchido; fechar uma LOV também dispara busca. Reproduzido na LOV de operações. [LovOperacoes.js](../src/components/LovOperacoes.js:20), [LovCondPgto.js](../src/components/LovCondPgto.js:20) | Consultar apenas quando aberta e quando filtro/código relevante mudar. Fornecer `cacheKey` ao hook: atualmente nenhuma chamada configura esse recurso. |
| Acordos consultados na LOV e ao adicionar | `acordosCache` da LOV e `acordosItemCache` da tela são separados. O resultado já consultado não é reaproveitado entre eles. [LovItens.js](../src/components/LovItens.js:14), [PedidoVenda.js](../src/views/PedidoVenda.js:767) | Compartilhar o serviço/cache com chave cliente+item e prazo de validade. |
| Detalhes para múltiplos | Quando `qtd_multiplo` falta na listagem, a LOV consulta detalhes por página e novamente na adição. Os múltiplos carregados não excluem os itens de futuras consultas do efeito. [LovItens.js](../src/components/LovItens.js:284) | Se possível, retornar `qtd_multiplo` em `itens`; compartilhar detalhes já consultados, respeitando a atualização de custo/estoque. A UM já vem de `itens.cod_um`. |

`getItemUltimaCompra` ainda existe em `src/services/itens.js`, mas não há chamadores no projeto. Portanto, a função antiga **não gera consultas** atualmente; pode ser removida como limpeza, sem ser confundida com uma causa de tráfego.

As duas consultas de impostos, uma para cada unidade, possuem contextos diferentes e são necessárias no contrato atual. O cache compartilhado de impostos deduplicou requisições simultâneas no teste. A otimização principal é fornecer esses dados em lote, não eliminar a consulta de uma unidade.

**Outros erros e fragilidades confirmados**

| Prioridade | Evidência | Ajuste recomendado |
| --- | --- | --- |
| Média/alta | Ao mudar quantidade, preço ou composição do pedido, a cotação anterior continua válida na tela. O rateio é atualizado, mas o preço da transportadora não é recalculado. A simulação multiplicou a quantidade por dez e manteve o frete 100. [PedidoVenda.js](../src/views/PedidoVenda.js:961) | Invalidar/marcar cotação desatualizada quando mudar qualquer entrada relevante e exigir nova cotação antes de usar a margem final. |
| Média | Histórico e comentários gravam estado sem verificar o cliente atual. Resposta de A que chega depois de B substituiu comentários de B na simulação. [PedidoVenda.js](../src/views/PedidoVenda.js:2511) | Verificar identificador da requisição/cliente em cada gravação de estado e limpar dados anteriores ao iniciar a troca. |
| Média | Erros de acordos viram `[]` e ficam no cache sem TTL; o cache de preço dentro da LOV também guarda `null` após falha e não respeita o TTL do serviço de impostos. [acordos](../src/views/PedidoVenda.js:776), [preços](../src/components/LovItens.js:131) | Remover entradas com erro e distinguir indisponível de inexistente. Permitir nova tentativa e expiração. |
| Média | ERP aceita preço zero no validador; proposta aceita quantidade/preço inválidos porque verifica só cliente, condição e seleção. [validação ERP](../src/views/PedidoVenda.js:2021), [proposta](../src/services/proposta/propostaDataService.js:117) | Validar quantidade/preço finitos e positivos e integridade do item nos dois fluxos, além da validação do backend. |
| Média | Duas primeiras chamadas concorrentes executam `createPool` duas vezes, pois `oraclePool` só é atribuído depois do `await`. Confirmado com mocks. [server.js](../backend-simfrete/server.js:95) | Guardar a promise de inicialização ou criar o pool antes de aceitar requisições. O comportamento real de conflito/recursos depende do driver e deve ser homologado. |
| Média | Origem numérica `92120190` do SimFrete é classificada como unidade 203; a string equivalente vira 201. Reproduzido com payloads simulados. [simFreteService.js](../src/config/simFreteService.js:107) | Normalizar tipo ou associar cada retorno à unidade do payload enviado. Não foi feita cotação real para verificar o tipo atualmente retornado. |
| Média | Múltiplo decimal `0.1` rejeita quantidade `0.3` na tela por uso de `%` em ponto flutuante. A LOV já usa tolerância. [PedidoVenda.js](../src/views/PedidoVenda.js:1166) | Reutilizar a validação com tolerância, caso existam múltiplos fracionários no catálogo. |
| Média | Campo numérico inválido pode ser salvo nas configurações; ao recarregar, o parser descarta silenciosamente e usa padrão. Falha da API de parâmetros também libera a aplicação com padrões e apenas aviso no console. [Configuracoes.js](../src/views/Configuracoes.js:94), [parametros.js](../src/services/parametros.js:18) | Validar antes do PUT e informar rejeições. Definir tratamento específico para ausência de parâmetros que governam aprovação comercial, para evitar mínimos diferentes dos cadastrados. |
| Baixa/média | O proxy transforma erro da API em mensagem genérica e a página de configuração descarta seus detalhes. [server.js](../backend-simfrete/server.js:170), [Configuracoes.js](../src/views/Configuracoes.js:36) | Preservar status e mensagem de negócio segura para diagnóstico, sem repassar stack/HTML ou credenciais. |

**Disponibilidade real das APIs nesta execução**

Base: `http://172.20.2.223:8585/ords/nl/unimed/`. Tempos de uma única amostra, não de teste de carga.

| GET | HTTP | Tempo | Resultado |
| --- | --- | --- | --- |
| `parsConf` | 200 | 1,744 s | 17 parâmetros. |
| `itensDetalhados/10117` | 200 | 1,000 s | Um registro, campos de dimensões, múltiplo e custo presentes. |
| `impostos/150/201/22222/8/10117` | 200 | 0,968 s | Objeto de impostos com preço, lista e indicadores. |
| `clientesUltimaCompra/22222?limit=1` | 200 | 7,785 s | 13.085 registros; `dta_emissao` e `qtd_lancamento` presentes. A resposta ignorou o limite solicitado. |
| `listaPreco/1/10117` | 200 | 0,663 s | Um registro; `ind_promocao` e `tip_aplicacao` presentes. |

A lista de preço usada no quinto GET foi obtida da resposta de impostos. Não foram percorridos catálogos completos de itens/clientes nem consultadas repetidamente as APIs. O histórico já veio inteiro na única resposta, apesar da tentativa de limitar.

**Dependências e implantação**

| Auditoria npm | Crítica | Alta | Moderada | Baixa | Total de entradas |
| --- | --- | --- | --- | --- | --- |
| Frontend | 2 | 31 | 17 | 11 | 61 |
| Backend | 0 | 3 | 2 | 1 | 6 |

São entradas por pacote na árvore do npm, incluindo impactos transitivos, não 67 falhas independentes comprovadamente exploráveis no sistema. `react-scripts` está em `dependencies`; portanto `--omit=dev` também inclui a cadeia de build/desenvolvimento. As duas entradas críticas do frontend são `shell-quote@1.8.3` e `websocket-driver@0.7.4`, ambas ligadas à cadeia de desenvolvimento por `npm ls`. No Docker de produção o frontend serve arquivos estáticos via Nginx; isso muda a exposição desses achados.

Priorizar a análise/atualização das dependências usadas em runtime, especialmente Axios, React Router e as seis entradas do backend: `axios`, `body-parser`, `follow-redirects`, `form-data`, `path-to-regexp` e `qs`. Validar novamente após atualizar. Não aplicar `npm audit fix --force` indiscriminadamente: nesta execução o npm sugeriu até `react-scripts@0.0.0` e downgrade de ExcelJS para alguns caminhos transitivos.

Há um caso pertinente ao ERP: `follow-redirects@1.15.11` tem aviso de encaminhamento de cabeçalhos personalizados para outro domínio durante redirecionamento. O projeto usa `x-nl-token` e `x-nl-aplicacao`; portanto, **se o endpoint redirecionar para outro domínio**, esses cabeçalhos precisam de proteção. Não foi observada nem provocada essa condição no serviço real. Referência: [aviso do mantenedor](https://github.com/follow-redirects/follow-redirects/security/advisories/GHSA-r4q5-vmmm-2653).

Verificação local adicional: os três valores longos de senha/token identificados no `.env` do backend não foram encontrados literalmente nos arquivos JavaScript do build. Essa checagem pontual não substitui auditoria de segredos e não elimina o problema do `COPY` no Docker do backend.

Os Dockerfiles usam `npm install`, em vez de uma instalação estrita do lockfile. A execução de build nesta auditoria ocorreu no ambiente local; a imagem Docker não foi construída nem publicada.

**Evidências e reprodução local**

Os scripts de auditoria ficaram **fora do projeto**, em `C:\Desenvolvimento\.codex-audit-quotation`, para não integrar o deploy:

- `audit.cjs`: 55 cenários locais com integrações simuladas.
- `results.json` e `execution.log`: resultados individuais e evidências.
- `live-results.json`: status/tempos/campos dos cinco GETs; sem conteúdo dos cadastros.
- `audit-frontend.json` e `audit-backend.json`: respostas da auditoria npm.
- `amostra.pdf` e `amostra.xlsx`: exportações com dados fictícios.

Reexecução da bateria local: `node C:\Desenvolvimento\.codex-audit-quotation\audit.cjs`. Esse script bloqueia Axios não substituído por mock; não contém a rotina dos cinco GETs reais. Não foram adicionados arquivos `*.test.js` ao projeto.

**Ordem sugerida para correção**

1. Integridade do envio ERP: resultados por unidade, persistência/estados e prevenção de duplicidade.
2. Integridade de cálculo: condição/operação, dados incompletos, cotação desatualizada e validações antes do envio/exportação.
3. Proteção do backend/proxy e exclusão de segredos no contexto Docker.
4. Histórico do cliente e consultas da LOV em lote; eliminação de remontagem e de buscas de componentes fechados.
5. Atualização dirigida de dependências, correção de caches e melhoria do diagnóstico de erros.

Os cenários aprovados cobrem o funcionamento normal observado; os riscos reproduzidos impedem considerar a integridade completa do sistema homologada. Testes reais de ERP, SimFrete, Oracle e navegação visual devem ser feitos depois em ambiente de homologação, com massa controlada.
