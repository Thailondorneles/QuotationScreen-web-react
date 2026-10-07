# Parâmetros da aplicação

O frontend renderiza a tela inicial com os padrões e uma sobreposição de carregamento, bloqueando a interação enquanto consulta `GET parsConf` pelo mesmo proxy das demais APIs. A consulta inicial é compartilhada entre o App e a página de configurações. Ao concluir, os componentes são notificados pelo contexto React e a tela é liberada, sem desmontar as rotas. O retorno esperado é `{ "items": [{ "des_conf": "EMPRESA_NOME", "parametro": "Empresa" }] }`.

Os parâmetros ficam em memória durante a sessão da página. Navegar, emitir documentos, abrir LOVs ou voltar à janela não os recarrega. Atualizar a página inicia uma nova consulta. Não é necessário reconstruir a aplicação para mudar valores na tabela.

Salvar uma configuração invalida apenas o cache da listagem para consultas posteriores. Os parâmetros em uso pelo sistema continuam os mesmos até recarregar a página.

O serviço tem timeout de 10 segundos. Em falha usa os padrões de `src/config/parametrosAplicacao.js` até atualizar a página. Chaves desconhecidas são ignoradas; valores ausentes ou inválidos usam o padrão da chave.

## Chaves consumidas

- Empresa: `EMPRESA_NOME`, `EMPRESA_TELEFONE`, `EMPRESA_EMAIL`.
- Proposta: `PROPOSTA_VALIDADE_DIAS`, `PROPOSTA_TITULO`, `PROPOSTA_COR_PRINCIPAL`, `PROPOSTA_LOGO`.
- Sobras: `SOBRA_MINIMA_MMT_ITEM`, `SOBRA_MINIMA_AC_ITEM`, `SOBRA_MINIMA_TOTAL_AC`, `SOBRA_MINIMA_TOTAL_GERAL`, `SOBRA_CLASSES_MMT`, `SOBRA_CLASSES_AC`.
- Histórico: `CLIENTE_COMPRA_RECENTE_DIAS`, `HISTORICO_COMPRAS_POR_ITEM`.
- Interface: `AMBIENTE_COR_PRINCIPAL`, `AMBIENTE_LOGO`.

Percentuais aceitam 0 a 100. Dias são inteiros de 0 a 36500. Histórico aceita 1 a 100 compras por item. Classes são listas separadas por vírgula; grupos sobrepostos voltam aos padrões. O total AC é identificado pelas classes dos itens, não pela igualdade entre percentuais.

Cores usam `#RRGGBB`. A cor do ambiente controla os estilos de identidade e seus tons derivados. Indicadores de erro, sobra, classificação e a cor específica da Unidade 203 permanecem independentes.

## Imagens e textos

Use PNG em `public/imagens/` e grave caminhos como `/imagens/nlprod2023.png`. A imagem desse exemplo acompanha o projeto. Imagens novas precisam ser publicadas no servidor; trocar entre arquivos já publicados exige apenas atualizar a página. Em falha da imagem configurada é utilizado o logotipo original. A proposta valida a assinatura PNG antes de usar o arquivo no PDF e Excel.

Os textos são apresentados como recebidos: caracteres `?` no lugar de acentos precisam ser corrigidos no banco/API. Segredos e configurações de infraestrutura continuam no `.env` do backend.
