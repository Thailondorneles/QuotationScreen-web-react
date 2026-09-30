# Organização da tela de pedido de venda

A tela foi separada por responsabilidade, preservando os corpos das funções, os contratos das APIs e os blocos JSX existentes. O ponto de entrada continua sendo `src/views/PedidoVenda.js`.

## Onde alterar cada comportamento

| Local | Responsabilidade |
|---|---|
| `src/views/PedidoVenda.js` | Composição da tela, mensagens e modais de integração/proposta |
| `src/components/pedido/` | Cabeçalho, itens e seus detalhes, observações, ordem de compra, triangulação, endereço e botões |
| `src/hooks/pedido/usePedidoVenda.js` | Conecta estado, regras e ações; calcula os valores derivados para exibição |
| `src/hooks/pedido/useEstadoPedido.js` | Estados React, referências de sequencial e caches da instância da cotação |
| `src/hooks/pedido/useCarregarCotacao.js` | Recuperação do cabeçalho salvo e dos cadastros relacionados |
| `src/hooks/pedido/useConsultasItensPedido.js` | Consultas de notas, últimas compras, lotes e classificação |
| `src/hooks/pedido/useDadosClientePedido.js` | Preenchimento dos padrões comerciais ao mudar o cliente |
| `src/domain/pedido/calculos.js` | Tributos, bases, totais e cálculo do preço pela sobra |
| `src/domain/pedido/validacoes.js` | Validações de envio e classificação das sobras mínimas |
| `src/domain/pedido/mapeadores.js` | Payload ERP por unidade, endereço, observações e dados da proposta |
| `src/domain/pedido/regrasItens.js` | Identificação de promoção, contrato, acordo e destaques dos itens |
| `src/domain/pedido/formatacao.js` | Conversões numéricas e formatação para o ERP |
| `src/hooks/pedido/acoes/` | Operações que consultam serviços, alteram estado ou apresentam mensagens |
| `src/services/` | Clientes HTTP e integrações existentes |

Os módulos de ações estão separados em `clientes`, `operacoes`, `precificacao`, `itens`, `enderecos`, `frete`, `observacoes`, `persistencia`, `integracao` e `proposta`.

## Dependências importantes

- O estado permanece único por instância da tela. Os componentes recebem dados e callbacks; não criam uma segunda cópia do pedido.
- As fábricas `criar...` recebem o estado do render atual e as funções necessárias dos outros módulos. Não guardam estado global e não fazem consultas ao serem criadas.
- As funções de encaminhamento no hook conectam dependências entre módulos sem acessar uma fábrica antes de sua inicialização. Não é necessário memorizar esses callbacks para preservar o comportamento existente.
- `cobrancaCalculada` é calculada antes de criar os cálculos e os mapeadores. Os tributos e a sobra continuam usando a cobrança por item.
- A ordem, os corpos, as dependências e as funções de cancelamento dos efeitos foram preservados. A restauração de uma cotação continua protegida por `clienteRestaurado` para não substituir os dados salvos pelos padrões do cliente.
- Referências de cache, `nextId`, `nextNumItem` e `recalculoClienteId` continuam pertencendo à mesma instância da cotação.
- `components/pedido/estilos.js` mantém a ordem original de carregamento dos estilos. Alterar essa ordem pode modificar a precedência de seletores globais.
- Salvar, remover, enviar ao ERP e emitir proposta mantêm os fluxos e contratos anteriores. A persistência disponível continua sendo a do cabeçalho.

## Verificação da separação

Foram comparados com uma cópia anterior à refatoração:

- Os corpos de 102 funções extraídas, três auxiliares visuais e sete blocos JSX.
- A inicialização de estados e referências e os nove efeitos.
- O HTML renderizado e as dependências dos efeitos em cinco cenários: vazio, preenchido, triangulação, carregamento e erro.
- 54 combinações de cálculos de tributos/sobra e 11 cenários de validação.
- Payloads completos do ERP para matriz e filial, dados da proposta e observações.
- Fluxos assíncronos de salvar novamente, falha ao salvar, integração total e integração parcial, com serviços simulados.

Os scripts de verificação e a cópia temporária foram removidos após a validação, conforme solicitado. Essas comparações locais não substituem a conferência de integração no ambiente conectado ao ORDS e ao ERP.
