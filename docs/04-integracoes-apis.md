# 04 — Integrações e catálogo de APIs

> **07/10/2026:** referencias a conexao direta, pool, SQL e log Oracle neste documento descrevem a implementacao anterior. O backend atual usa HTTP para dados e auditoria: consulte [Acesso a dados por APIs](16-acesso-dados-apis.md). Nao configure credenciais ou bibliotecas Oracle neste projeto.


## 1. Topologia

Em produção, o navegador usa apenas o host do frontend:

```mermaid
sequenceDiagram
    participant UI as React
    participant NX as Nginx
    participant BE as Express
    participant ORDS as API Unimed/ORDS
    participant SF as SimFrete
    participant DB as Oracle
    participant ERP as ERP/NL

    UI->>NX: /api/*
    NX->>BE: proxy_pass backend:3001
    BE->>ORDS: GET cadastral/tributário
    BE->>SF: POST cotação com credenciais
    BE->>DB: sequence e controle
    BE->>ERP: POST pedido com token/aplicação
```

## 2. Clientes HTTP do frontend

### API Unimed

Arquivo: `src/config/apis.js`.

```text
Base URL: REACT_APP_UNIMED_API_BASE_URL
Produção padrão: /api/unimed/
Content-Type: application/json
```

### Backend de frete/ERP

Arquivos: `src/config/simFreteService.js` e `src/services/pedidosErp.js`.

```text
Base URL: REACT_APP_SIMFRETE_API_BASE_URL
Produção padrão: /
Cotação timeout: 20 s
Pedido timeout: 30 s
```

## 3. Catálogo ORDS usado pelo frontend

Todos os caminhos abaixo são relativos a `REACT_APP_UNIMED_API_BASE_URL`.

| Domínio | Método e caminho | Finalidade | Consumidor |
|---|---|---|---|
| Clientes | `GET clientes` | Catálogo completo para LOV | `LovClientes` |
| Clientes | `GET clientes/{filtro}` | Busca por código/nome/CNPJ e contato da proposta | Tela/proposta |
| Clientes | `GET ClienteDetalhado/{codPessoa}` | Operação, pagamento, crédito, consumidor e dados complementares | Tela |
| Clientes | `GET clientesComentarios/{cliente}` | Comentários/observações | Tela |
| Clientes | `GET clientesHistorico/{cliente}` | Recência e status de compra | Tela |
| Clientes | `GET clientesUltimaCompra/{cliente}` | Últimas compras agrupadas por item | Tela/LOV |
| Representantes | `GET representantesCliente/{cliente}` | Representante padrão | Tela |
| Representantes | `GET representantes/{representante}/{cliente}` | Validação de representante | Tela |
| Operações | `GET operacoes` | LOV | `LovOperacoes` |
| Operações | `GET operacoes/{filtro}` | Busca direta | Tela |
| Pagamento | `GET condPgto` | LOV | `LovCondPgto` |
| Pagamento | `GET condPgto/{filtro}` | Busca direta | Tela |
| Itens | `GET itens` | Catálogo da LOV | `LovItens` |
| Itens | `GET itensDetalhados/{codigosCSV}` | Estoque, custo, múltiplo, dimensão e peso | Inclusão |
| Itens | `GET itensClassificacao/{codigosCSV}` | Segmento técnico para exibição e regra AC/MMT | Tela/ERP |
| Itens | `GET itensLotes` | Lotes próximos do vencimento | LOV/tela |
| Itens | `GET itensAcordos/{item}/{cliente}` | Acordos comerciais | LOV/tela |
| Itens | `GET itensUltimaCompra/{item}/{cliente}` | Última compra específica | Tela |
| Tributação | `GET impostos/{oper}/{unidade}/{cliente}/{condPgto}/{item}` | Preço e tributação por contexto | LOV/tela |
| Lista | `GET listaPreco/{lista}/{item}` | Promoção, contrato e base ST | Tela |
| CEP | `GET ceps` | LOV | `LovCep` |
| CEP | `GET ceps/{filtro}` | Busca por CEP | Tela |
| Cidade | `GET cidades` | LOV | `LovCidades` |
| Cidade | `GET cidades/{filtro}` | Busca por código IBGE | Tela |
| UF | `GET uf` | LOV | `LovUf` |
| UF | `GET uf/{filtro}` | Busca direta | Tela |
| Tipo logradouro | `GET tipLogradouro` | Tipos e `cod_tipo` | Tela |
| Endereço | `GET psEnderecos/{cliente}` | Endereços alternativos | `LovEnderecos` |
| Endereço | `GET psPessoasPadrao/{cliente}` | Endereço padrão | Tela |

Parâmetros comuns de paginação: `offset` e `limit`, normalmente 25.

## 4. Normalização de respostas

`ceps.js`, `enderecos.js` e `enderecosPadrao.js` aceitam três formatos:

- `{ items: [...] }`;
- array direto;
- objeto único.

Todos são convertidos para uma estrutura com `items`, `hasMore` e `count`.

Outros serviços normalmente esperam o envelope ORDS:

```json
{
  "items": [],
  "hasMore": false,
  "count": 0
}
```

## 5. Cache e deduplicação

| Dado | Chave | TTL | Observação |
|---|---|---:|---|
| Clientes completos | global | 5 min | Compartilha requisição em andamento |
| Itens completos da LOV | global | 5 min | Filtro/paginação são locais |
| Lotes | global | 5 min | Compartilha requisição |
| Impostos | operação, unidade, cliente, pagamento e item | 5 min | Remove cache se falhar |
| Páginas de LOV | componente, filtro, offset e limite | 5 min | Suporte do hook `useLovPagination`; inativo atualmente porque as LOVs não fornecem `cacheKey` |
| Lista de preço | lista e item | sessão da tela | `useRef(Map)` |
| Acordos | cliente e item | sessão/módulo | Promessa e resultado |
| Última compra | cliente e item | sessão da tela | Promessa e resultado |

### Proteção contra corrida

- LOVs baseadas no hook paginado, além das LOVs de clientes e itens, usam contador de requisição; componentes como `LovEnderecos` não possuem a mesma proteção.
- Mudanças de cliente/operação usam `recalculoClienteId`.
- Respostas de um contexto antigo não devem sobrescrever o contexto novo.

## 6. SimFrete

### 6.1 Endpoint interno

```http
POST /api/cotacao
```

### 6.2 Agrupamento

O frontend gera um payload para cada unidade com itens selecionados.

### 6.3 Configuração de origem

| Unidade | CNPJ remetente | CEP origem |
|---:|---|---:|
| 201 | `02494715000173` | `92120190` |
| 203 | `02494715000416` | `29167650` |

### 6.4 Payload frontend → backend

```json
{
  "remetenteCnpj": "02494715000173",
  "origem": 92120190,
  "destino": 3526902,
  "volumeTotal": 1.2345,
  "valorTotal": 1500.50,
  "pesoTotal": 125.350,
  "quantidadeTotalDecimal": 10,
  "quantidadeTotal": 10
}
```

`destino` usa `cliente.cod_cidade` mesclado com `ClienteDetalhado`.

### 6.5 Backend → SimFrete

O backend acrescenta:

```json
{
  "wsEmp": "central unimed",
  "wsUsr": "<SIMFRETE_USER>",
  "wsPwd": "<SIMFRETE_PASS>"
}
```

Endpoint externo fixo no backend:

```text
https://centralunimed.simfrete.com/CotacaoService/consultar
```

Credenciais nunca devem ser enviadas pelo frontend.

### 6.6 Normalização do retorno

Cada transportadora é convertida para:

```json
{
  "nome": "SIGLA",
  "prazo": 8,
  "valor": 80.98,
  "cnpj": "...",
  "tipoRateio": "...",
  "raw": {}
}
```

## 7. Proxy ORDS e autenticação

O Express exige sessão em /api/unimed, /api/cotacao e /api/pedidos/enviar-erp. A rota GET /api/unimed/ambiente é pública e retorna apenas a cor do ambiente. O frontend confirma o cookie com GET /api/auth/sessao. Consulte [Login e sessão](17-login-e-sessao.md) para os contratos de login, validação e saída.

O proxy encaminha GETs e aceita operações de gravação explícitas para parâmetros, cotação, itens, observações, endereço e integração. A exclusão usa DELETE EsPePedidos/:id. As rotas de carteira validam o representante da sessão. O cliente HTTP de dados do ORDS tem timeout de 20 segundos.

## 8. Integração ERP

1. O React envia um POST /api/pedidos/enviar-erp por unidade com o sequencial da cotação salva em numSeqPedido.
2. O Express consulta EsPePedidos/:id para verificar a versão atual e se a unidade já tem número de pedido confirmado.
3. Para uma unidade ainda não integrada, o Express fixa numPedido como "-1" e codCompl como 0. A observação 99 recebe o sequencial da cotação.
4. O Express envia o pedido a ERP_PEDIDOS_URL com x-nl-token e x-nl-aplicacao. Para cada envio ao ERP, tenta registrar INTEGRADO ou ERRO via EsPePedidosIntegracaoLog. A confirmação do registro de auditoria em caso de sucesso vem em logRegistrado.
5. O React concilia o número e complemento via ConsultaPedidosSeq/:id e registra a integração da cotação via EsPePedidos/integracao. Resultados parciais são apresentados por unidade.

A auditoria guarda payload, retorno e erro serializados. O campo usuario desse registro é enviado como nulo. Uma falha no registro da auditoria não repete um envio que o Express já fez. [Acesso a dados por APIs](16-acesso-dados-apis.md)

## 9. Erros da integração

A resposta de erro pode incluir sucesso: false, numSeq, erro, etapa e detalhe. As etapas atuais são inicio, consultar_cotacao, montar_payload_erp e post_erp. O status 409 pode indicar cotação ainda não salva, envio em andamento ou número registrado em formato inválido. Reconcilie o pedido no ERP antes de reenviar uma tentativa cujo resultado não foi confirmado.

## 10. Health check

```http
GET /health
```

Resposta:

```json
{ "ok": true }
```

O health check confirma apenas que o processo HTTP responde; não valida ORDS, Oracle, SimFrete ou ERP.

## 11. Timeouts

| Integração | Timeout |
|---|---:|
| ORDS no backend | 20 s |
| SimFrete externo | 20 s |
| Pedido frontend → backend | 30 s |
| ERP no backend | 30 s |

## 12. Pontos de atenção

1. O proxy não guarda respostas das consultas comerciais. O navegador mantém caches de consulta e o Express compartilha validações de sessão simultâneas e mantém um cache curto dos prazos de sessão.
2. Falhas de algumas consultas auxiliares retornam valores vazios para não bloquear a experiência.
3. O health check não mede dependências.
4. O backend exige todas as credenciais e Oracle já na inicialização, mesmo que o usuário queira apenas consultar dados.
5. O frontend usa a mesma origem para suas chamadas ao backend.
6. Logs podem conter detalhes do retorno externo; revisar política de dados sensíveis.
7. O POST ao ERP e o registro de auditoria via ORDS são operações independentes. A resposta logRegistrado acompanha o resultado do envio.
8. O frontend envia as unidades em paralelo. Uma falha geral não significa necessariamente que nenhuma unidade foi integrada; antes de repetir, consultar a tabela de controle e o ERP.
9. Não existe atualmente chave de idempotência ou reconciliação automática. Uma repetição sem conferência pode duplicar o pedido.
10. O endpoint de pedido aceita o corpo montado pelo navegador sem validação formal de schema e o usuário de auditoria vem da URL; autenticação, autorização e validação devem ser tratadas como melhorias prioritárias.
11. Caches de alguns dados auxiliares não possuem TTL e podem armazenar inclusive um fallback vazio após falha, impedindo nova tentativa até a tela ser desmontada.
12. Alterar a condição de pagamento não aciona o mesmo recálculo de preço/imposto executado ao alterar a operação.
