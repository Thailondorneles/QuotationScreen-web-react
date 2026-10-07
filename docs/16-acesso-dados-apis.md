# Acesso a dados por APIs — 07/10/2026

O frontend e o backend não abrem conexões Oracle. A persistência pertence às APIs ORDS. O backend usa `UNIMED_API_BASE_URL` e mantém as credenciais do ERP e SimFrete.

| Operação | Endpoint |
|---|---|
| Reservar sequencial | GET EsPeSequencia |
| Consultar versão atual | GET EsPePedidos/:id |
| Salvar cabeçalho | POST EsPePedidosIns |
| Consultar itens | GET EsPeItens/:id |
| Sincronizar itens | POST EsPeItensIns |
| Registrar números do NL | POST EsPePedidos/integracao |
| Incluir resultado de cada envio | POST EsPePedidosIntegracaoLog |
| Consultar pedidos no NL | GET ConsultaPedidosSeq/:numSeqPedido |

O GET EsPeSequencia consome um número: não deve fazer parte de testes de disponibilidade. A observação 99 do NL recebe o sequencial da cotação. A consulta anterior ao envio permite excluir pedidos antigos do resultado posterior.

O log é uma inclusão por envio, com status INTEGRADO ou ERRO, payload serializado, resposta, erro e usuário nulo. Não há INSERT/UPDATE SQL, sequência técnica ou tabela de log acessada pelo aplicativo. Falhar ao registrar o log não repete o envio ao ERP.

Foram retirados o pacote oracledb, as variáveis ORACLE dos arquivos de ambiente, o volume e LD_LIBRARY_PATH do Compose e as bibliotecas libaio1/libnsl2 do Dockerfile. O Instant Client instalado fora do projeto não foi removido. Os documentos anteriores mantêm contexto histórico explicitamente sinalizado.

O bloqueio de envios simultâneos é local ao processo do backend, não um bloqueio transacional distribuído. `/health` verifica somente o processo HTTP.
