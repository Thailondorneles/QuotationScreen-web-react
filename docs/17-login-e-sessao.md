# Login NL e acesso às demandas de contrato

O React chama o Express de `backend-simfrete` pela mesma origem do site. O Nginx já encaminha `/api/` ao Express. O login no ORDS chama `NL.MS_AUTENTICACAO_APEX_PB.VALIDA_USUARIO` e consulta `MS_PERMISSOES.DES_USUARIO_INTEGRACAO` para identificar a pessoa.

## Contrato que o frontend usa

| Rota no Express | Entrada | Sucesso |
| --- | --- | --- |
| `POST /api/auth/login` | JSON com `usuario` e `senha` | `204` e `Set-Cookie` para a nova sessão |
| `GET /api/auth/sessao` | Cookie da sessão | `200` com `{"usuario":{"codigoPessoa":123},"validadeMs":1800000}` |
| `POST /api/auth/logout` | Cookie da sessão, quando presente | `204`, revogação no servidor e remoção do cookie |
| `GET /api/unimed/ambiente` | Consulta pública | `200` com `cor` antes de mostrar o login |

- Login negado retorna `401` com resposta genérica. Limite de tentativas retorna `429`. Indisponibilidade da integração retorna `503`.
- `GET /api/auth/sessao` retorna `401` para sessão ausente, expirada ou revogada. `validadeMs` é o tempo restante em milissegundos no momento da resposta, limitado pela primeira expiração aplicável. Essa consulta é somente de verificação.
- Nas rotas da aplicação, o middleware responde `401` com `{"codigo":"SESSAO_INVALIDA"}` quando faltar uma sessão válida. Permissão insuficiente com sessão válida retorna `403`. Para códigos de clientes consultados individualmente, pode retornar `404` tanto para cliente inexistente quanto para cliente fora da carteira.
- Ao enviar o formulário de login, a aba mantém “Entrando…” até confirmar o cookie e carregar os parâmetros. Em seguida abre o menu principal. As outras abas recarregam ao receber o aviso de alteração da sessão. Quando a aba já tem uma sessão válida ao ser aberta, ela mantém a página solicitada.

## Sessão no Express

O Express gera o token aleatório e envia seu hash SHA-256 ao ORDS. A `ES_WEB_SESSAO` guarda o hash, o código da pessoa e os horários da sessão. O cookie contém o token original e é compartilhado por abas no mesmo navegador. Em HTTPS, o cookie usa `__Host-quotation-session`, `Secure`, `HttpOnly`, `SameSite=Lax` e `Path=/`.

| Handler interno no ORDS | JSON enviado pelo Express | Confirmação esperada |
| --- | --- | --- |
| `POST auth/login` | `username`, `password`, `token_hash` e os prazos | `200` com `success: true` e `cod_pessoa` numérico |
| `POST auth/sessao/validar` | `token_hash`, `registrar_atividade` e os prazos quando renova | `200` com `cod_pessoa` e `validade_ms` na sessão válida. Na inválida, `codigo: "SESSAO_INVALIDA"` |
| `POST auth/sessao/revogar` | `token_hash` | `200` com `codigo: "SESSAO_REVOGADA"` ou `204` |

Execute `sql/es_pars_conf_prazos_sessao.sql` para cadastrar os parâmetros 50 e 51. O Express lê `SESSAO_INATIVIDADE_MINUTOS` e `SESSAO_LIMITE_ABSOLUTO_MINUTOS` da `ES_PARS_CONF` via ORDS, com padrões de 30 e 480 quando as linhas ainda não existem. O perfil 9000 pode alterar esses campos em `/conf`. O Express usa o novo prazo nos próximos logins e renovações e invalida a leitura local ao salvar. A verificação de sessão e a leitura de `parsConf` na abertura do app não renovam a inatividade.

Para montar a identificação do cabeçalho, o Express consulta `GET usuario?usuario=<cod_pessoa>` no ORDS após validar a sessão. A consulta usa o código de pessoa da sessão e aproveita `des_pessoa`, `cod_perfil` e `des_perfil` para exibição. Se o cadastro estiver indisponível, o cabeçalho usa os dados que já vieram na autenticação.

Leituras simultâneas do mesmo cookie podem compartilhar a chamada ao ORDS enquanto ela estiver em andamento no mesmo processo do Express. Verificações que renovam o prazo são agrupadas separadamente das que apenas consultam. Gravações e a reserva de sequencial em `EsPeSequencia` fazem validações individuais. O Express descarta a resposta quando a chamada termina e invalida o compartilhamento local ao confirmar a revogação.

Para substituir sessões antigas, o handler de login deve excluir e inserir na mesma transação depois de validar o usuário. Se a regra for uma sessão por pessoa, a restrição de unicidade em `COD_PESSOA` no Oracle é a garantia entre instâncias do Express. Trate a colisão de dois logins simultâneos sem manter a transação pela metade. O teste automatizado com ORDS simulado verifica concorrência no Express. A capacidade do banco e do pool do ORDS precisa ser medida em homologação com a carga esperada.

No `.env` do backend, configure `AUTH_APP_ORIGIN` com a origem do frontend, sem barra final. Configure `AUTH_ORDS_BASE_URL` quando os handlers de autenticação estiverem em outra base que a `UNIMED_API_BASE_URL`. O protocolo é definido pela própria URL. `AUTH_ORDS_AUTHORIZATION` só precisa ser configurado se os handlers exigirem credencial de serviço. Em HTTP, o tráfego não é criptografado e o cookie não pode usar `Secure`.

Se o ORDS retornar HTML com `500 JDBCException` mesmo com o JSON completo, consulte o primeiro código `ORA-...` ou `PLS-...` no log do ORDS no horário da chamada. Confira, no schema do módulo, se `ES_WEB_SESSAO` e `MS_PERMISSOES` estão acessíveis e se as colunas usadas nos `%TYPE` existem. Se o log apontar um erro de bind, leia `:body_text` uma vez e extraia os campos do JSON pelo nome em cada handler.

## Autorização de demandas

O middleware de sessão protege as consultas de dados e as operações do Express. A gravação dos prazos em `parsConf/50` e `parsConf/51` exige perfil 9000. A autorização por perfil das demais operações deve ser definida de acordo com a regra de negócio. Restrinja o acesso direto ao ORDS na infraestrutura para preservar os controles do Express.

- **Contratos e carteira.** O Express preenche `cod_rep_externo` com o `codigoPessoa` da sessão em `demandaContratos` e na rota `/api/unimed/carteira/clientes`. O ORDS aplica o filtro antes de paginar, e o Express só aceita páginas cujas linhas correspondem ao representante. Quando houver `cod_cliente` na consulta de contratos, ele é encaminhado junto com o representante. A lupa de Pedidos continua usando a rota original `/api/unimed/clientes`.
- **Cadastro e histórico.** A busca por código, os detalhes e os representantes de Demandas usam `/api/unimed/carteira/`. O Express verifica o vínculo com a carteira nessas rotas e em `/api/unimed/notasSaida`. Cliente fora da carteira devolve `404`. Se um cliente tiver vendas de vários representantes, `notasSaida` ainda precisa de filtro próprio para separar as vendas. As rotas cadastrais compartilhadas com Pedidos mantêm o comportamento anterior.
- **Exportações.** As exportações desta aba são montadas a partir dos dados que a API entrega. O mesmo escopo deve valer para qualquer rota futura de download ou relatório.

## Segurança e validação

- Use HTTPS no site e nas chamadas que transportam credenciais para o ORDS. Guarde credenciais de serviço fora do código. Aplique `Cache-Control: no-store` nas respostas de autenticação e de dados privados.
- O Express verifica `Origin` no login, logout e operações mutáveis. O proxy local do React tem tratamento restrito a conexões locais de mesma origem. O limite de tentativas usa a combinação de IP e conta por processo. Registre diagnósticos sem gravar senhas, cookies nem tokens.
- Antes de publicar, teste nova aba e atualização da página, expiração após X minutos, prorrogação por atividade em outra aba, expiração absoluta e logout entre abas. Com dois representantes de carteiras diferentes, cubra visão geral, paginação, pesquisa direta por cliente, consultas complementares, vendas e tentativas de trocar o representante ou consultar o ORDS diretamente.

[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) · [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
