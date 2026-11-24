# Login NL e acesso às demandas de contrato

O React chama o Express de `backend-simfrete` pela mesma origem do site. O Nginx já encaminha `/api/` ao Express. O login no ORDS chama `NL.MS_AUTENTICACAO_APEX_PB.VALIDA_USUARIO` e consulta `MS_PERMISSOES.DES_USUARIO_INTEGRACAO` para identificar a pessoa.

## Contrato que o frontend usa

| Rota no Express | Entrada | Sucesso |
| --- | --- | --- |
| `POST /api/auth/login` | JSON com `usuario` e `senha` | `204` e `Set-Cookie` para a nova sessão |
| `GET /api/auth/sessao` | Cookie da sessão | `200` com `{"usuario":{"codigoPessoa":123},"validadeMs":1800000}` |
| `POST /api/auth/logout` | Cookie da sessão, quando presente | `204`, revogação no servidor e remoção do cookie |

- Login negado retorna `401` com resposta genérica. Limite de tentativas retorna `429`. Indisponibilidade da integração retorna `503`.
- `GET /api/auth/sessao` retorna `401` para sessão ausente, expirada ou revogada. `validadeMs` é o tempo restante em milissegundos no momento da resposta, limitado pela primeira expiração aplicável. Essa consulta é somente de verificação.
- Nas rotas da aplicação, o middleware responde `401` com `{"codigo":"SESSAO_INVALIDA"}` quando faltar uma sessão válida. Permissão insuficiente com sessão válida retorna `403`. Para códigos de clientes consultados individualmente, pode retornar `404` tanto para cliente inexistente quanto para cliente fora da carteira.
- A tela mantém a URL solicitada durante o login. Ao entrar ou sair, as abas abertas recebem um aviso de sessão alterada e recarregam para descartar os dados em memória. Ao voltar para uma aba ou atingir o prazo informado, o frontend consulta a sessão novamente.

## Sessão no Express

O Express gera o token aleatório e envia seu hash SHA-256 ao ORDS. A `ES_WEB_SESSAO` guarda o hash, o código da pessoa e os horários da sessão. O cookie contém o token original e é compartilhado por abas no mesmo navegador. Em HTTPS, o cookie usa `__Host-quotation-session`, `Secure`, `HttpOnly`, `SameSite=Lax` e `Path=/`.

| Handler interno no ORDS | JSON enviado pelo Express | Confirmação esperada |
| --- | --- | --- |
| `POST auth/login` | `username`, `password`, `token_hash` e os prazos | `200` com `success: true` e `cod_pessoa` numérico |
| `POST auth/sessao/validar` | `token_hash`, `registrar_atividade` e os prazos | `200` com `cod_pessoa` e `validade_ms`, ou `401` com `codigo: "SESSAO_INVALIDA"` |
| `POST auth/sessao/revogar` | `token_hash` | `204` |

Os campos de prazo são `inatividade_minutos` e `limite_absoluto_minutos`. O Express lê `SESSAO_INATIVIDADE_MINUTOS` e `SESSAO_LIMITE_ABSOLUTO_MINUTOS` do ambiente do backend, com padrões de 30 e 480. A verificação de sessão e a leitura de `parsConf` na abertura do app não renovam a inatividade.

No `.env` do backend, configure `AUTH_APP_ORIGIN` com a origem do frontend, sem barra final, e `AUTH_ORDS_BASE_URL` com a base do módulo que contém os três handlers. Mantenha `UNIMED_API_BASE_URL` no mesmo ambiente. O backend aceita `AUTH_ORDS_AUTHORIZATION` como valor do cabeçalho de autorização do serviço. Para um ambiente interno que opera por HTTP, configure explicitamente `AUTH_ORDS_ALLOW_HTTP=true`. Em HTTP, o tráfego não é criptografado e o cookie não pode usar `Secure`.

Se o ORDS retornar HTML com `500 JDBCException` mesmo com o JSON completo, consulte o primeiro código `ORA-...` ou `PLS-...` no log do ORDS no horário da chamada. Confira, no schema do módulo, se `ES_WEB_SESSAO` e `MS_PERMISSOES` estão acessíveis e se as colunas usadas nos `%TYPE` existem. Se o log apontar um erro de bind, leia `:body_text` uma vez e extraia os campos do JSON pelo nome em cada handler.

## Autorização de demandas

O middleware de sessão cobre `/api/unimed`, `/api/cotacao` e `/api/pedidos/enviar-erp`. Antes de liberar o ambiente para representantes, implemente também a política por operação e por carteira abaixo. Restrinja alterações em `parsConf` a administradores. O ORDS deve receber chamadas do serviço autenticado e ficar inacessível diretamente a partir do navegador.

- **Visão geral e contratos por cliente.** Em `GET /api/unimed/demandaContratos`, o Express resolve `cod_representante` pelo `codigoPessoa` da sessão e o ORDS aplica `cod_representante = :cod_representante` antes da paginação, dos totais e dos agrupamentos. Quando houver `cod_cliente`, aplique os dois critérios. Rejeite parâmetros de representante enviados pelo navegador.
- **Cadastro e histórico.** A tela também lê `clientes/:codigo`, `ClienteDetalhado/:codigo`, `representantesCliente/:codigo` e `notasSaida`. Nas operações disponíveis ao perfil de representante, valide no servidor o vínculo com o cliente pela relação oficial de carteira e restrinja as linhas ao representante sempre que a consulta for de dados comerciais por representante. Proteja também listagens e rotas equivalentes. Se outro perfil precisar de consultas globais, conceda essa permissão explicitamente por perfil.
- **Exportações.** As exportações desta aba são montadas a partir dos dados que a API entrega. O mesmo escopo deve valer para qualquer rota futura de download ou relatório.

## Segurança e validação

- Use HTTPS no site e nas chamadas que transportam credenciais para o ORDS. Guarde credenciais de serviço fora do código. Aplique `Cache-Control: no-store` nas respostas de autenticação e de dados privados.
- Proteja login, logout e operações que alteram estado contra CSRF. Na implantação de mesma origem, valide estritamente o `Origin` esperado, com fallback controlado para `Referer`, e remova o CORS permissivo. Aplique limite de tentativas por conta e IP, com respostas públicas uniformes. Registre tentativas e recusas sem gravar senhas, cookies nem tokens.
- Antes de publicar, teste nova aba e atualização da página, expiração após X minutos, prorrogação por atividade em outra aba, expiração absoluta e logout entre abas. Com dois representantes de carteiras diferentes, cubra visão geral, paginação, pesquisa direta por cliente, consultas complementares, vendas e tentativas de trocar o representante ou consultar o ORDS diretamente.

[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) · [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
