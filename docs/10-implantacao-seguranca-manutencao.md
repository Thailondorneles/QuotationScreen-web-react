# 10 — Implantação, segurança e manutenção

## 1. Visão operacional

A solução é composta por:

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | React 18 | Tela, cálculos, propostas e montagem do payload |
| Servidor web | Nginx 1.27 | Arquivos estáticos, fallback SPA e proxy `/api/*` |
| Backend | Node.js 20 + Express | Proxy ORDS, SimFrete, Oracle e ERP |
| Banco | Oracle | sequência e auditoria de integração |
| Integrações | ORDS, SimFrete e ERP/NL | dados, frete e criação do pedido |

Arquivos principais:

```text
Dockerfile.frontend
backend-simfrete/Dockerfile
docker-compose.yml
docker/nginx/default.conf
backend-simfrete/server.js
```

## 2. Requisitos

### Desenvolvimento local

- Node.js 20 recomendado;
- npm compatível com os lockfiles;
- acesso de rede ao backend/serviços necessários;
- variáveis do frontend;
- variáveis e Oracle Instant Client para executar o backend completo.

### Produção em containers

- Podman e provedor de `podman compose`;
- porta 80 disponível ou mapeamento ajustado;
- diretório do Oracle Instant Client no host;
- acesso DNS/rede do backend para ORDS, SimFrete, Oracle e ERP;
- credenciais armazenadas fora do repositório;
- tabela e sequence de integração existentes no Oracle.

O backend exige todas as configurações de SimFrete, ORDS, ERP e Oracle na inicialização, mesmo que uma sessão use apenas consultas cadastrais.

## 3. Variáveis de ambiente

### 3.1 Frontend — incorporadas no build

| Variável | Padrão de container | Finalidade | Segredo? |
|---|---|---|:---:|
| `REACT_APP_SIMFRETE_API_BASE_URL` | `/` | Base do backend para cotação e pedido ERP | Não |
| `REACT_APP_UNIMED_API_BASE_URL` | `/api/unimed/` | Base das consultas ORDS pelo proxy | Não |
| `GENERATE_SOURCEMAP` | Não configurado atualmente | Opção do build para controlar source maps; definir `false` é uma recomendação de endurecimento | Não |

Variáveis `REACT_APP_*` são públicas: o React as grava nos arquivos estáticos. Nunca coloque token, usuário, senha ou string de conexão nessas variáveis.

Alterá-las requer novo `npm run build` ou rebuild da imagem do frontend.

### 3.2 Backend — lidas em runtime

| Variável | Obrigatória | Finalidade | Sensibilidade |
|---|:---:|---|---|
| `PORT` | Não | Porta HTTP; padrão 3001 | baixa |
| `HOST` | Não | Bind; padrão `0.0.0.0` | baixa |
| `UNIMED_API_BASE_URL` | Sim | ORDS upstream | interna |
| `SIMFRETE_USER` | Sim | Usuário SimFrete | secreta |
| `SIMFRETE_PASS` | Sim | Senha SimFrete | secreta |
| `ERP_PEDIDOS_URL` | Sim | Endpoint do ERP/NL | interna |
| `ERP_NL_TOKEN` | Sim | Token do ERP | secreta |
| `ERP_NL_APLICACAO` | Sim | Identificador da aplicação | restrita |
| `ORACLE_USER` | Sim | Usuário Oracle | secreta |
| `ORACLE_PASSWORD` | Sim | Senha Oracle | secreta |
| `ORACLE_CONNECT_STRING` | Sim | Conexão Oracle | secreta |
| `ORACLE_CLIENT_LIB_DIR` | Condicional | Diretório do Instant Client dentro do processo | interna |
| `ORACLE_POOL_MIN` | Não | Mínimo do pool; padrão 1 | baixa |
| `ORACLE_POOL_MAX` | Não | Máximo do pool; padrão 4 | baixa |

Arquivos `.env` reais estão ignorados pelo Git. Mantenha apenas `.env.example` sem valores secretos.

### 3.3 Proteção recomendada

- permissões mínimas no arquivo `backend-simfrete/.env`;
- armazenamento em secret manager quando disponível;
- rotação periódica e imediata em caso de exposição;
- credenciais distintas por ambiente;
- usuário Oracle com privilégios apenas sobre a sequence e tabela necessárias;
- não imprimir `podman compose config` em chamados, pois a saída pode expandir segredos.

## 4. Execução local

### 4.1 Frontend

```bash
npm install
npm start
```

URL padrão:

```text
http://localhost:3000
```

O campo `proxy` de `package.json` encaminha chamadas relativas para `http://localhost:3001` durante o desenvolvimento.

### 4.2 Backend

```bash
cd backend-simfrete
npm install
node server.js
```

URL padrão:

```text
http://localhost:3001
```

Verificação:

```bash
curl http://localhost:3001/health
```

### 4.3 Build de validação

```bash
npm run build
```

Antes de publicar, o build deve finalizar sem erro. Warnings devem ser avaliados e registrados; não devem ser tratados automaticamente como irrelevantes.

## 5. Imagens e containers

### Frontend

O `Dockerfile.frontend`:

1. usa Node 20 Alpine para build;
2. instala dependências;
3. injeta as duas URLs como argumentos de build;
4. executa `npm run build`;
5. copia o resultado para Nginx 1.27 Alpine.

### Backend

O `backend-simfrete/Dockerfile`:

1. usa Node 20 Bookworm Slim;
2. instala `libaio1` e `libnsl2`;
3. instala dependências de produção;
4. inicia `node server.js`.

### Compose atual

- backend exposto apenas na rede interna, porta 3001;
- frontend publicado em `80:80`;
- `restart: unless-stopped` nos dois serviços;
- Instant Client montado como somente leitura;
- frontend depende da criação do backend, mas não de um health check de prontidão.

Valores padrão do volume Oracle:

```text
host:      /opt/oracle/instantclient_23_26
container: /opt/oracle/instantclient_23_26
```

Podem ser alterados por:

```text
ORACLE_CLIENT_LIB_DIR_HOST
ORACLE_CLIENT_LIB_DIR_CONTAINER
```

## 6. Nginx e roteamento

Configuração atual:

```text
/api/* → backend:3001
/*      → arquivos React; fallback /index.html
```

Consequências:

- o navegador fala apenas com o host do frontend;
- o backend não precisa ser publicado diretamente;
- `/health` externo não é encaminhado ao backend pela configuração atual;
- `GET /health` no host público pode retornar a aplicação React, e não `{ "ok": true }`;
- o health real deve ser chamado dentro da rede/container ou deve ser criada uma rota explícita, por exemplo `/api/health`.

O Nginx atual escuta HTTP na porta 80 e não configura TLS, HSTS, CSP ou outros headers de segurança. Em produção, TLS deve ser terminado em load balancer/reverse proxy confiável ou configurado no próprio Nginx.

## 7. Implantação com Podman

### 7.1 Preparação

1. Identifique e registre a revisão atualmente publicada.
2. Confirme backup seguro das configurações, sem copiá-las para o repositório.
3. Valide espaço em disco, acesso à registry e montagem do Instant Client.
4. Confirme conectividade com dependências.
5. Planeje uma janela compatível com o risco da alteração.

### 7.2 Construção e subida

```bash
podman compose build
podman compose up -d
podman compose ps
```

Não é necessário executar `down` para toda atualização. Derrubar previamente os serviços aumenta indisponibilidade.

### 7.3 Validação pós-implantação

```bash
podman compose logs --tail=200 backend
podman compose exec backend node -e "fetch('http://127.0.0.1:3001/health').then(r=>r.text()).then(console.log)"
```

Smoke test mínimo:

1. frontend abre sem erro de console;
2. uma consulta ORDS simples funciona;
3. cliente carrega dados complementares;
4. item carrega preço e tributação nas duas unidades;
5. proposta PDF e Excel são geradas;
6. cotação é testada somente quando autorizado e com dados controlados;
7. integração ERP deve usar ambiente/cliente de teste e autorização explícita;
8. registro Oracle deve evoluir para o status esperado.

## 8. Health, prontidão e capacidade

### Comportamento atual

`GET /health` retorna `{ "ok": true }` sem consultar dependências.

O backend cria o pool Oracle sob demanda:

```text
poolMin padrão: 1
poolMax padrão: 4
poolIncrement: 1
```

O corpo JSON é limitado a 1 MB.

### Recomendação

Separar:

- **liveness:** processo Express responde;
- **readiness:** configuração válida, Oracle acessível e pool disponível;
- **diagnóstico externo:** ORDS/ERP/SimFrete, preferencialmente sem produzir operações reais.

Não use uma cotação ou envio de pedido como health check automático.

## 9. Logs e observabilidade

### Estado atual

- logs em `console`;
- mensagens de inicialização e erros;
- etapa e número do pedido no erro ERP;
- payload, resposta e erro persistidos como CLOB no Oracle;
- sem `requestId` comum ao navegador, backend, Oracle e ERP;
- sem métricas, tracing ou endpoint de versão;
- sem política de retenção definida no repositório.

Comandos operacionais:

```bash
podman compose logs --since=1h backend
podman compose logs -f backend
podman stats
```

### Recomendações

- logs JSON estruturados;
- identificador de correlação por requisição e unidade;
- versão/commit no startup e no health;
- duração e status de cada dependência;
- métricas de cotação, integração, timeout e erro por etapa;
- alerta para `ENVIANDO` antigo e crescimento de `ERRO`;
- centralização e retenção de logs;
- mascaramento de CNPJ, cliente e conteúdo comercial;
- nunca registrar senha, token ou string de conexão.

## 10. Segurança

### 10.1 Situação atual versus recomendação

| Área | Comportamento atual | Recomendação |
|---|---|---|
| Transporte | Nginx do projeto apenas HTTP | TLS e HSTS no ponto de entrada |
| CORS | `cors()` aberto no backend | limitar às origens necessárias |
| Autenticação interna | endpoint ERP não autentica o usuário final | autenticação e autorização por perfil |
| Usuário de auditoria | aceito da query string | obter de identidade validada no backend |
| Validação | corpo ERP repassado por spread | schema estrito, limites e campos permitidos |
| Proxy ORDS | aceita qualquer GET sob a base | allowlist de recursos necessários |
| Segredos | `.env` ignorado pelo Git | secret manager, rotação e auditoria |
| Headers web | configuração mínima | CSP, `nosniff`, política de frame e referrer |
| Rate limit | inexistente | limitar endpoints sensíveis |
| Dependências | instalação direta no build | `npm ci`, auditoria e atualização controlada |
| Auditoria | payload/resposta completos em CLOB | retenção, acesso mínimo e mascaramento |

### 10.2 Dados sensíveis

Podem aparecer na tela, payload, banco e logs:

- cliente e CNPJ;
- telefone e e-mail;
- endereço;
- condições comerciais;
- itens, valores e ordem de compra;
- usuário informado pela aplicação.

Defina base legal, perfis de acesso, prazo de retenção e procedimento de atendimento a incidentes de dados.

### 10.3 Backend ERP

O endpoint atual:

- aceita payload do navegador sem schema;
- gera número Oracle;
- envia ao ERP com credenciais privilegiadas do servidor;
- não implementa chave de idempotência;
- permite risco de duplicidade em retry.

Prioridades recomendadas:

1. autenticar o chamador;
2. autorizar a operação;
3. validar e reconstruir o payload no backend;
4. implementar idempotência por tentativa/unidade;
5. registrar auditoria antes do POST;
6. concluir o status antes de responder sucesso.

## 11. Manutenção preventiva

| Frequência | Atividade |
|---|---|
| Diária | monitorar erros, `ENVIANDO` antigos e disponibilidade |
| Semanal | revisar espaço, logs, falhas recorrentes e pool Oracle |
| Mensal | revisar dependências npm, imagens base e vulnerabilidades |
| Trimestral | testar restore/rollback, rotacionar segredos conforme política e revisar acessos |
| Por release | build, testes, smoke, contrato ORDS/ERP e plano de reversão |

Também devem ser controlados:

- compatibilidade do Oracle Instant Client;
- mudanças de contrato no ORDS;
- validade do token ERP e credenciais SimFrete;
- capacidade e índices da tabela `PEDIDO_ERP_INTEGRACAO`;
- crescimento e retenção dos CLOBs;
- certificados e regras de firewall;
- alterações nas constantes por unidade.

## 12. Mudanças de contrato

Antes de alterar um endpoint ou campo:

1. documente formato antigo e novo;
2. identifique todos os consumidores;
3. mantenha compatibilidade ou versione a API;
4. adicione teste de contrato;
5. valide unidades 201 e 203;
6. valide valores com vírgula e quatro casas;
7. valide situação 6, 32 e 70;
8. valide auditoria Oracle e retorno do ERP.

Respostas ORDS não possuem validação de schema no frontend. Uma mudança de nome pode resultar em zero, `null` ou campo omitido sem erro explícito.

## 13. Backup e rollback

### Antes da publicação

- registre commit/tag da versão ativa;
- preserve arquivos de ambiente em local seguro;
- registre versões das imagens e do Instant Client;
- confirme a compatibilidade do schema Oracle;
- não inclua `.env` em artefatos ou backup compartilhado sem criptografia.

### Rollback da aplicação

O rollback recomendado é republicar imagens versionadas previamente aprovadas. Enquanto o Compose construir diretamente do workspace, use uma revisão/tag limpa e conhecida e execute novo build.

Depois do rollback:

1. confira containers;
2. valide health interno;
3. valide consulta ORDS;
4. confirme que a versão realmente mudou;
5. reconcilie pedidos que estavam em andamento durante a troca.

### O que o rollback não faz

- não desfaz pedidos já enviados ao ERP;
- não remove números consumidos da sequence;
- não corrige duplicidades;
- não deve apagar auditoria Oracle;
- não reverte automaticamente alterações de schema ou cadastro externo.

Qualquer correção de pedido integrado deve seguir o processo funcional do ERP.

## 14. Checklist de release

### Antes

- [ ] revisão identificada e aprovada;
- [ ] build concluído;
- [ ] testes relevantes executados;
- [ ] variáveis conferidas sem expor valores;
- [ ] Instant Client montado;
- [ ] dependências acessíveis;
- [ ] plano de rollback definido;
- [ ] impacto em payload e regras avaliado.

### Depois

- [ ] containers saudáveis;
- [ ] health interno retorna JSON esperado;
- [ ] frontend e assets carregam;
- [ ] proxy ORDS funciona;
- [ ] PDF e Excel funcionam;
- [ ] logs sem erro de startup;
- [ ] versão registrada;
- [ ] nenhum pedido ficou sem reconciliação durante a janela.

## 15. Melhorias estruturais recomendadas

1. Pipeline CI/CD com `npm ci`, testes, SBOM e scan de imagens.
2. Imagens imutáveis e versionadas em registry.
3. Secrets gerenciados fora de `.env`.
4. Health checks no Compose e readiness real.
5. TLS e headers de segurança.
6. Autenticação, autorização e rate limiting.
7. Idempotência e máquina de estados da integração.
8. Migrações/versionamento do schema Oracle.
9. Logs estruturados, métricas e alertas.
10. Testes automatizados de contrato e recuperação parcial.
