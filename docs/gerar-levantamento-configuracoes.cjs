const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const root = path.resolve(__dirname, '..');
const rows = [];
const P = 'src/views/PedidoVenda.js', B = 'backend-simfrete/server.js', L = 'src/components/LovItens.js';
function add(grupo, chave, valor, arquivo, trecho, finalidade, tipo = 'Texto', acesso = 'Gestor', prioridade = 'Média', obs = '') {
  const linhas = fs.readFileSync(path.join(root, arquivo), 'utf8').split(/\r?\n/);
  const n = linhas.findIndex(l => l.includes(trecho));
  if (n < 0) throw new Error(`Referência ausente: ${arquivo}: ${trecho}`);
  rows.push([`CFG-${String(rows.length+1).padStart(3,'0')}`, grupo, chave, valor, tipo, acesso, prioridade,
    finalidade, arquivo, n+1, linhas[n].trim(), obs || 'Chave proposta; requer centralização e persistência para edição pela tela.']);
}
function a(chave, valor, trecho, finalidade, tipo='Número', obs='') { add('Comercial e pedido',chave,valor,P,trecho,finalidade,tipo,'Gestor','Alta',obs); }
const C = 'src/config/propostaConfig.js';
add('Empresa e proposta','empresa.nome','Unimed Central de Serviços - RS',C,'nome:','Nome da empresa nos documentos');
add('Empresa e proposta','empresa.telefone','(51) 3462-6400',C,'telefone:','Contato comercial');
add('Empresa e proposta','empresa.email','vendas@centralrs.unimed.com.br',C,'email:','E-mail comercial');
add('Empresa e proposta','proposta.diasValidade','15 dias',C,'DIAS_VALIDADE_PROPOSTA','Prazo de validade da proposta','Inteiro positivo','Gestor','Alta');
add('Unidades','unidades.habilitadas','201; 203','src/components/LovUnidadesPedido.js','const UNIDADES','Cadastro de unidades disponíveis','Lista','Administrador','Alta','Duplicado em PedidoVenda, LovItens, simFreteService e propostaConfig; inclusão de unidade requer refatorar agrupamentos, colunas e campos matriz/filial.');
for (const [u,nome,cnpj,cep] of [['201','Matriz','02.494.715/0001-73','92120190'],['203','Filial','02.494.715/0004-16','29167650']]) {
 add('Unidades',`unidades.${u}.nome`,nome,C,`nome: '${nome}'`,'Nome da unidade em documentos e seleção');
 add('Unidades',`unidades.${u}.cnpj`,cnpj,C,cnpj,'Identificação da unidade e remetente do frete','CNPJ','Administrador','Alta','Duplicado sem máscara em src/config/simFreteService.js; manter cadastro único.');
 add('Unidades',`unidades.${u}.cepOrigem`,cep,'src/config/simFreteService.js',cep,'CEP de origem da cotação','CEP','Administrador','Alta','parseCotacoesSimFrete também usa CEP fixo para identificar unidade; atualizar mapeamento reverso.');
}
a('pedido.modalidadePadrao','2 - Orçamento','useState(2)','Modalidade inicial e após limpar pedido','Seleção: 2; 7');
a('pedido.modalidadesPermitidas','2 - Orçamento; 7 - Orçamento/Contrato','setModalidadeIntegracao(7)','Opções de modalidade integradas ao ERP','Lista','Validar códigos no ERP e adaptar rótulos e situações.');
a('frete.modalidadePadrao','CIF',"useState('CIF')",'Modalidade inicial e após limpar pedido','Seleção: CIF; COBRAR_NF');
a('cliente.diasCompraRecente','45','dias <= 45','Limite de dias para sinalizar compra recente','Inteiro >= 0');
a('sobra.minimaMMT','6%',"includes(classificacao)) return 6",'Sobra mínima individual para classes T/I','Percentual');
a('sobra.minimaAC','4%',"includes(classificacao)) return 4",'Sobra mínima individual para classes A/B','Percentual');
a('sobra.classesMMT','T; I',"includes(classificacao)) return 6",'Classes associadas ao grupo MMT','Lista');
a('sobra.classesAC','A; B',"includes(classificacao)) return 4",'Classes associadas ao grupo AC','Lista');
a('sobra.regraTotal','4% se todos AC; 6% se houver MMT ou sem classificação','const minimoSobraTotal','Limiar de sobra total por unidade','Regra','Não alterar apenas os percentuais individuais: o total compara explicitamente mínimo === 4.');
a('sobra.isentarItemContrato','Sim, apenas avaliação individual','if (item.precoListaBloqueado) return erros','Isenção de item bloqueado na lista de itens abaixo da sobra','Booleano','O item continua compondo a sobra total. Política candidata, sujeita à validação de negócio.');
a('sobra.classeDesconhecida','Sem mínimo individual; total sujeito a 6%','if (minimoSobra === null) return erros','Tratamento de classificação não mapeada','Regra');
a('pedido.situacaoAprovacao','70','? 70','Situação de pedido que exige aprovação');
a('pedido.situacaoContrato','32','modalidadeIntegracao === 7 ? 32 : 6','Situação aprovada da modalidade 7');
a('pedido.situacaoOrcamento','6','modalidadeIntegracao === 7 ? 32 : 6','Situação aprovada da modalidade 2');
a('erp.codigoEmpresa','01',"codEmp: '01'",'Empresa do cabeçalho, pedido e endereço','Código','Preservar zero inicial; aparece em três níveis do payload.');
a('erp.portadorPorUnidade','201 → 156; 203 → 203','codPortador:','Portador por unidade','Mapa','Trocar por cadastro por unidade; validar no ERP.');
a('erp.codigoPosicao','22','codPosicao:','Posição do pedido','Código');
a('erp.codigoReserva','7','codReserva:','Reserva dos itens','Código');
a('erp.codigoMaquina','1','codMaquina:','Identificação da máquina integradora','Código');
a('erp.tipoFrete','1','tipFrete: 1','Tipo de frete enviado ao ERP','Código','Atualmente fixo mesmo quando opcaoFrete é COBRAR_NF; validar semântica ERP antes de mapear.');
a('pedido.quantidadeInicial','Múltiplo do produto; na ausência, 1','Number(qtdMultiplo) > 0','Estratégia de quantidade inicial','Regra','Manter restrições de múltiplo do cadastro do produto.');
a('pedido.limiteOrdemCompra','20 caracteres','maxLength={20}','Comprimento máximo da ordem de compra','Inteiro positivo','Limitar ao tamanho aceito no ERP.');
add('Comercial e pedido','observacao.limiteCaracteres','4000','src/components/LovObservacao.js','maxLength={4000}','Limite de texto das observações','Inteiro positivo','Administrador','Média','Não ultrapassar contrato da API/ERP.');
for (const flag of ['pedido','nota','registro','financeiro']) add('Comercial e pedido',`observacao.destinoPadrao.${flag}`,'Desmarcado','src/components/LovObservacao.js',`${flag}: false`,'Destino inicial de novas observações','Booleano');
add('Frete','frete.fatorCubagem','300 kg/m³',P,'const FATOR_CUBAGEM','Conversão de volume em peso cubado','Decimal positivo','Gestor','Alta');
add('Frete','frete.criterioRateio','Maior entre peso real e cubado; sem peso, rateia por quantidade',P,'Math.max(pesoReal, pesoCubado)','Regra para distribuir custo do frete','Seleção de regra','Gestor','Alta','Política candidata; implementação atual não usa tipoRateio retornado pela transportadora.');
add('Frete','frete.selecaoAutomatica','Primeira transportadora retornada',P,'const primeiraTransportadora = lista[0]','Critério de seleção inicial da cotação','Seleção de regra','Gestor','Média','Não há ordenação explícita por menor preço ou menor prazo neste ponto.');
add('Frete','simfrete.empresa','central unimed',B,"wsEmp: 'central unimed'",'Empresa informada ao SimFrete','Texto','Administrador','Alta');
add('Frete','simfrete.tipoOperacao','0',B,'tipoOperacao: 0','Tipo de operação de cotação','Código','Administrador','Alta');
add('Busca e interface','itens.filtroInicial','POLIMAX',L,'const FILTRO_PADRAO','Busca inicial dos itens','Texto','Usuário','Alta','Hoje também identifica marca própria; separar as duas configurações.');
add('Busca e interface','itens.marcaPropria','POLIMAX',L,"=== FILTRO_PADRAO",'Marca destacada como própria','Texto','Gestor','Alta','Reutiliza FILTRO_PADRAO; chave independente sugerida.');
add('Busca e interface','itens.porPagina','25',L,'const ITENS_POR_PAGINA','Quantidade de itens por página','Inteiro positivo','Usuário');
add('Busca e interface','clientes.porPagina','25','src/components/LovClientes.js','const CLIENTES_POR_PAGINA','Quantidade de clientes por página','Inteiro positivo','Usuário');
add('Busca e interface','consultas.porPagina','25','src/hooks/useLovPagination.js','limit = 25','Página de CEP, cidade, condição, operação, representante e UF','Inteiro positivo','Administrador','Média','Há overrides limit:25 nas LOVs e defaults nos serviços; centralizar todos.');
add('Busca e interface','consultas.limiteEnderecos','25','src/components/LovEnderecos.js','limit: 25','Limite da consulta de endereços','Inteiro positivo','Administrador');
add('Busca e interface','consultas.limiteAcordos','25',P,'limit: 25','Limite de registros por consulta de acordos e históricos','Inteiro positivo','Administrador','Média','Serviços possuem defaults e a tela possui overrides; não é o mesmo que paginação visual.');
add('Busca e interface','historico.comprasPorItem','5','src/services/clientes.js','.slice(0, 5)','Quantidade de últimas compras exibidas','Inteiro positivo','Usuário','Média','LovItens também aplica slice(0,5); centralizar ambos.');
add('Busca e interface','interface.urlPortalNL','http://nl.unimedcentralrs.com.br:8585/NLWeb/site/9000/1','src/components/Header.js','window.open','Destino do clique no logotipo','URL','Administrador');
add('Busca e interface','interface.logo','src/imagens/nl-logo.png','src/components/Header.js','import logo','Logotipo do cabeçalho','Imagem','Administrador');
add('Empresa e proposta','proposta.logo','src/imagens/nlprod2023.png','src/services/proposta/propostaAssetsService.js','import logoUrl','Logotipo das propostas','Imagem','Gestor');
add('Empresa e proposta','proposta.corPrincipal','#00844A','src/services/proposta/propostaExcelService.js','const VERDE','Cor dos títulos e tabelas dos documentos','Cor','Gestor','Baixa','Duplicada em RGB [0,132,74] no PDF.');
add('Empresa e proposta','proposta.titulo','PROPOSTA COMERCIAL','src/services/proposta/propostaPdfService.js',"doc.text('PROPOSTA COMERCIAL'",'Título dos documentos','Texto','Gestor','Baixa','Centralizar também no Excel.');
add('Empresa e proposta','proposta.formatosDisponiveis','PDF; Excel','src/components/ModalEmitirProposta.js',"onSelecionar('pdf')",'Formatos disponíveis para emissão','Lista','Gestor','Baixa');
add('Empresa e proposta','proposta.nomeArquivo','Proposta_{unidade}_{cliente}_{data}.{extensao}','src/services/proposta/propostaDownloadService.js','return `Proposta_','Modelo do nome dos arquivos','Modelo de texto','Gestor','Baixa','Manter sanitização e extensão controlada.');
add('Empresa e proposta','proposta.pdf.pagina','A4 paisagem','src/services/proposta/propostaPdfService.js','new jsPDF','Formato de impressão','Seleção','Administrador','Baixa','Layout possui posições e larguras fixas; mudar formato exige adaptar o template.');
add('Formatação','formatacao.localidade','pt-BR','src/utils/format.js',"toLocaleString('pt-BR')",'Localidade de apresentação','Seleção','Administrador','Baixa','Duplicada nas LOVs, PedidoVenda e documentos; parser aceita padrão brasileiro.');
add('Formatação','formatacao.moeda','BRL','src/utils/format.js',"currency: 'BRL'",'Moeda de apresentação','Seleção','Administrador','Baixa','Alterar símbolo não converte preços; depende de suporte monetário no ERP.');
for (const [k,v,t] of [['percentual','2','minimumFractionDigits: 2'],['peso','3','minimumFractionDigits: 3'],['volume','4','minimumFractionDigits: 4']]) add('Formatação',`formatacao.casas.${k}`,v,'src/utils/format.js',t,'Casas decimais de exibição','Inteiro >= 0','Administrador','Baixa');
add('Formatação','formatacao.casasPreco','Tela/ERP/Excel: 4; moeda do PDF: 2',P,'toFixed(4).replace','Precisão de preço unitário','Inteiro >= 0','Administrador','Média','Há diferença de exibição entre PDF e Excel. Preservar precisão contratada no ERP e separar cálculo de apresentação.');
add('Formatação','formatacao.fusoHistorico','UTC',P,"timeZone: 'UTC'",'Fuso de apresentação do histórico de compra','Fuso horário','Administrador','Baixa','Propostas usam fuso local do navegador; padronização requer tratar datas sem horário.');
for (const [k,f,t] of [['clientes','src/services/clientes.js','const CLIENTES_CACHE_TTL'],['impostos','src/services/impostos.js','const IMPOSTOS_CACHE_TTL'],['lotes','src/services/itens.js','const LOTES_CACHE_TTL'],['lovGeral','src/hooks/useLovPagination.js','const CACHE_TTL_PADRAO'],['lovItens',L,'const CACHE_TTL'],['lovClientes','src/components/LovClientes.js','const CACHE_TTL']]) add('Desempenho',`cache.${k}.ttlMs`,'300000 ms (5 minutos)',f,t,'Tempo de validade do cache','Inteiro >= 0','Administrador','Média','Centralizar com opção de invalidar cache após mudanças relevantes.');
for (const [k,v,f,t] of [['recalculo',3,P,'mapComConcorrencia(itensPedido, 3'],['acordos',5,L,'mapComConcorrencia(itensParaBuscar, 5'],['precos',4,L,'mapComConcorrencia(itensPaginados, 4']]) add('Desempenho',`concorrencia.${k}`,String(v),f,t,'Limite de tarefas simultâneas','Inteiro positivo','Administrador','Média','Cada tarefa pode disparar mais de uma requisição; não representa limite absoluto HTTP.');
add('Desempenho','recalculo.tentativas','2',P,'totalTentativas = 2','Tentativas para carregar dados de item','Inteiro positivo','Administrador');
for (const [k,v,t] of [['consultaErp.tentativas','3','tentativa < 3'],['consultaErp.intervaloMs','700','setTimeout(resolve, 700)'],['consultaErp.timeoutMs','5000','timeout: 5000']]) add('Desempenho',k,v,'src/services/pedidosErp.js',t,'Consulta do número de pedido após envio','Inteiro positivo','Administrador');
for (const [k,v,f,t] of [['freteFrontend',20000,'src/config/simFreteService.js','timeout: 20000'],['freteBackend',20000,B,'{ timeout: 20000 }'],['unimedBackend',20000,B,'timeout: 20000'],['erpFrontend',30000,'src/services/pedidosErp.js','timeout: 30000'],['erpBackend',30000,B,'timeout: 30000']]) add('Desempenho',`timeout.${k}.ms`,String(v),f,t,'Prazo máximo de espera HTTP','Inteiro positivo','Administrador','Média','Coordenar frontend, backend e proxy para evitar interrupção antes do processamento.');
const envs = [
 ['REACT_APP_UNIMED_API_BASE_URL','/api/unimed/ (default Docker)','src/config/apis.js'],
 ['REACT_APP_SIMFRETE_API_BASE_URL','/ (default Docker)','src/config/simFreteService.js'],
 ['UNIMED_API_BASE_URL','Definido no ambiente; sem default',B],['ERP_PEDIDOS_URL','Definido no ambiente; sem default',B],
 ['SIMFRETE_USER','Não exportado (credencial)',B],['SIMFRETE_PASS','Não exportado (segredo)',B],
 ['ERP_NL_TOKEN','Não exportado (segredo)',B],['ERP_NL_APLICACAO','Definido no ambiente; sem default',B],
 ['ORACLE_USER','Não exportado (credencial)',B],['ORACLE_PASSWORD','Não exportado (segredo)',B],
 ['ORACLE_CONNECT_STRING','Definido no ambiente; sem default',B],['ORACLE_CLIENT_LIB_DIR','Opcional; sem default',B],
 ['ORACLE_POOL_MIN','1 (default)',B],['ORACLE_POOL_MAX','4 (default)',B],['PORT','3001 (default)',B],['HOST','0.0.0.0 (default)',B]
];
for (const [k,v,f] of envs) add('Ambiente e integrações',k,v,f,`process.env.${k}`,'Configuração existente por variável de ambiente',/PASS|TOKEN/.test(k)?'Segredo':'Ambiente','Infraestrutura','Alta',k.startsWith('REACT_APP')?'Incorporada no build React; edição em runtime exige carregamento de configuração externa.':'Manter no servidor. Tela administrativa técnica pode gerenciar referência/valor mascarado; aplicação pode exigir reinício. Valores reais dos .env não foram exportados.');
add('Ambiente e integrações','SIMFRETE_URL','https://centralunimed.simfrete.com/CotacaoService/consultar',B,'const simFreteUrl','Endpoint externo da cotação','URL','Administrador','Alta');
add('Ambiente e integrações','ORACLE_POOL_INCREMENT','1',B,'poolIncrement: 1','Incremento do pool de conexões','Inteiro positivo','Infraestrutura');
add('Ambiente e integrações','http.limiteJson','1mb',B,"limit: '1mb'",'Tamanho máximo do corpo JSON','Tamanho','Infraestrutura');
add('Ambiente e integrações','http.origensCors','cors() sem restrição explícita',B,'app.use(cors())','Origens permitidas no backend','Lista de origens','Infraestrutura','Média');
add('Ambiente e integrações','http.erpKeepAlive','true',B,'keepAlive: true','Reutilização de conexão com ERP','Booleano','Infraestrutura');
for (const k of ['ORACLE_CLIENT_LIB_DIR_HOST','ORACLE_CLIENT_LIB_DIR_CONTAINER']) add('Implantação',k,'/opt/oracle/instantclient_23_26 (default)','docker-compose.yml',k,'Caminho do Oracle Instant Client no host/container','Caminho','Infraestrutura','Baixa','Configuração de implantação; manter fora da tela funcional.');
add('Implantação','frontend.portaPublicada','80:80','docker-compose.yml','"80:80"','Porta publicada do frontend','Porta','Infraestrutura','Baixa');
add('Implantação','proxy.destinoBackend','http://backend:3001','docker/nginx/default.conf','proxy_pass','Destino do proxy das APIs','URL interna','Infraestrutura','Baixa');
add('Implantação','desenvolvimento.proxy','http://localhost:3001','package.json','"proxy"','Proxy do servidor de desenvolvimento','URL interna','Infraestrutura','Baixa');
add('Identidade visual','interface.corCabecalho','#2e8b1c','src/style/menuStyle.css','background:','Cor principal do cabeçalho','Cor','Gestor','Baixa','Demais cores e medidas CSS compõem tema/layout; centralizar tokens antes de oferecer editor de tema.');
add('Identidade visual','aplicacao.titulo','Cotação','public/index.html','<title>','Nome exibido na aba do navegador','Texto','Administrador','Baixa');
add('Identidade visual','aplicacao.nomePwa','Create React App Sample','public/manifest.json','"name"','Nome da aplicação instalada','Texto','Administrador','Baixa');
add('Identidade visual','aplicacao.nomeCurtoPwa','React App','public/manifest.json','"short_name"','Nome curto da aplicação instalada','Texto','Administrador','Baixa');
for (const [k,v] of [['theme_color','#000000'],['background_color','#ffffff'],['display','standalone'],['start_url','.']]) add('Identidade visual',`pwa.${k}`,v,'public/manifest.json',`"${k}"`,'Preferência do manifesto PWA','Texto','Infraestrutura','Baixa','Arquivo estático: requer atualização da implantação e cache do navegador.');
const exclusions = [
 ['Estado de tela','useState/useRef; cliente, itensPedido, freteSelecionado, loading, modais','Dados da sessão ou pedido, não parâmetros globais. Defaults com utilidade foram separados.'],
 ['Cadastros comerciais','Operação, condição de pagamento, representante e endereço padrão','Carregados das APIs/ERP por cliente; manter fonte de verdade. Configuração local só com regra explícita de precedência.'],
 ['Cadastro de produtos','Estoque, custo médio, múltiplos, dimensões, peso, classificação, lote próximo','Valores por produto/unidade vindos do ERP. Janela de vencimento de lotes não está definida no frontend.'],
 ['Preço e contratos','cod_lista, vlr_item, ind_promocao, tip_aplicacao; acordos e última compra','Dados comerciais recebidos; bloqueio e mínimo promocional são regras existentes, não simples constantes globais.'],
 ['Tributação','per_icms, per_aliq_pis, per_aliq_cofins, per_ipi, per_fcp, per_subst_trib, per_funrural e indicadores de base','Retornados por operação/unidade/cliente/condição/item; não propor alíquotas globais na tela.'],
 ['Fórmulas fiscais e sobra','ST, DIFAL, bases; Funrural não reduz sobra; solver linear','Lógica de cálculo exige especificação e validação própria; não transformar automaticamente em chaves liga/desliga.'],
 ['Contrato ERP','numPedido=-1; codCompl=0; tipTransacao=1; indVlrAlterado=0; observação reservada 99','Constantes de protocolo; manter técnicas. A sequência 99 é reservada no frontend e reescrita no backend.'],
 ['Banco de integração','ES_PEDIDO_ERP_INTEGRACAO; SEQ_PEDIDO_ERP_INTEGRACAO; estados ENVIANDO/INTEGRADO/ERRO','Objetos e estados do contrato de integração; alterações exigem migração, não configuração funcional.'],
 ['Rotas e endpoints relativos','/config; /api/cotacao; /api/pedidos/enviar-erp; recursos dos serviços','Contrato de navegação/API, não preferência do usuário. URLs base estão no inventário.'],
 ['Validações estruturais','Quantidade positiva/múltiplo, tributação presente, OC sem | e /, dados obrigatórios','Regras de integridade e compatibilidade; não expor desativação como configuração comum.'],
 ['Identidade do usuário','usuario/user/codUsuario/cod_usuario na query string','Identidade por requisição; não senha nem usuário global fixo configurável.'],
 ['Detalhes internos','Offsets iniciais, contadores, zeros de fallback, timeout de foco, revogação de Blob, epsilon do solver','Implementação, não parâmetro de produto.'],
 ['Layout','Larguras, fontes, margens, cores de status, dimensões do PDF e CSS','Agrupar como tema/template se houver requisito; não listar cada pixel como variável global.'],
 ['Dependências e artefatos','node_modules, lockfiles, build, .git, imagens binárias e versões de dependências','Excluídos do inventário de configurações de negócio; não editar via tela.'],
 ['Projeto vizinho','C:/Desenvolvimento/myfinance-web-dotnet','Fora do escopo: projeto distinto do QuotationScreen-web-react indicado pelo IDE.']
];
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => {
 if (['node_modules','.git','build','dist'].includes(e.name)) return [];
 const p=path.join(dir,e.name); return e.isDirectory()?files(p):[p];
}); }
const covered=files(root).filter(p=>!p.includes('gerar-levantamento')&&!p.endsWith('.xlsx')&&!/package-lock\.json$/.test(p));
const wb = new ExcelJS.Workbook(); wb.creator='Levantamento técnico do projeto'; wb.created=new Date('2026-09-19T12:00:00Z');
function sheet(name, headers, data, widths) {
 const s=wb.addWorksheet(name); s.columns=headers.map((header,i)=>({header,key:`c${i}`,width:widths[i]||35}));
 data.forEach(r=>s.addRow(r)); s.views=[{state:'frozen',ySplit:1,xSplit:1}];
 s.autoFilter={from:{row:1,column:1},to:{row:s.rowCount,column:headers.length}};
 s.getRow(1).height=32;
 s.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF166534'}};});
 s.eachRow((r,n)=>{r.alignment={vertical:'top',wrapText:true};if(n>1){r.height=75;r.eachCell(c=>{c.font={name:'Calibri',size:11};if(n%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F7F2'}};});}});
 s.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}; return s;
}
sheet('Leia-me',['Assunto','Descrição'],[
 ['Entrega','Levantamento de candidatos a configuração; nenhuma funcionalidade da aplicação foi alterada.'],
 ['Data','19/09/2026 — análise estática do código local, incluindo alterações locais existentes.'],
 ['Escopo','Todo o projeto QuotationScreen-web-react: frontend, serviços, backend-simfrete, documentação e implantação. O projeto vizinho myfinance-web-dotnet não integra este escopo.'],
 ['Interpretação','Variáveis globais inclui constantes exportadas, parâmetros ambientais e valores fixos/regras locais que poderiam ser centralizados. Não é uma lista de todos os const/let/useState.'],
 ['Quantidade',`${rows.length} candidatos; detalhes na aba Inventário e prioridades na aba Resumo.`],
 ['Chaves','As chaves com pontos são sugestões para futura implementação; nomes de ambiente existentes foram preservados.'],
 ['Valores','Valores fixos e defaults observados no código. Configuração efetiva em produção não foi consultada. Segredos e valores reais dos .env não foram exportados.'],
 ['Situação atual','src/views/Configuracoes.js contém somente <div>teste</div>; rota /config existe. Persistência de configurações e controle de acesso não estão implementados nessa tela.'],
 ['Acesso','Gestor/Usuário/Administrador/Infraestrutura são recomendações futuras, não permissões já implementadas.'],
 ['Validação','Números positivos para tempos/limites; percentuais dentro da regra comercial; códigos validados no ERP; CNPJ/CEP tratados como texto; URLs e imagens validadas.'],
 ['Persistência sugerida','Parâmetros comerciais em backend/banco, com escopo por empresa/unidade e histórico; preferências visuais por usuário; segredos no servidor; infraestrutura no ambiente.'],
 ['Dependências principais','Centralizar unidades e CEP reverso, separar filtro inicial de marca própria, harmonizar sobras individuais/totais e timeouts entre camadas.'],
 ['Limites','Propostas de parametrização não equivalem a requisitos aprovados. Contratos do ERP e dados retornados por sistemas externos precisam de validação antes de alterar comportamento.'],
 ['Rastreabilidade','Cada candidato contém arquivo, primeira linha relevante e trecho literal. Aba Cobertura registra arquivos encontrados e classificação de escopo.']
],[27,125]);
sheet('Inventário',['ID','Grupo','Variável / chave sugerida','Valor atual ou default','Tipo de campo','Acesso sugerido','Prioridade','Finalidade na tela','Arquivo','Linha','Evidência no código','Dependências / validação'],rows,[13,25,39,53,25,20,14,58,57,10,80,85]);
sheet('Resumo',['Grupo','Total','Alta','Média','Baixa','Recomendação'],[...new Set(rows.map(r=>r[1]))].map(g=>{const rr=rows.filter(r=>r[1]===g);return[g,rr.length,...['Alta','Média','Baixa'].map(p=>rr.filter(r=>r[6]===p).length),g==='Implantação'?'Manter em implantação':g==='Ambiente e integrações'?'Administração técnica; proteger segredos':'Avaliar implementação conforme prioridade e acesso'];}),[30,12,12,12,12,85]);
sheet('Não parametrizar diretamente',['Categoria','Exemplos encontrados','Motivo / orientação'],exclusions,[30,90,115]);
sheet('Cobertura',['Arquivo','Classificação','Candidatos referenciados','Observação'],covered.map(p=>{
 const rel=path.relative(root,p).replaceAll('\\','/'); const sensitive=path.basename(p).startsWith('.env');
 const n=rows.filter(r=>r[8]===rel).length;
 return [rel,sensitive?'Ambiente — conteúdo não exportado':/\.(png|jpg|jpeg|ico|svg)$/i.test(p)?'Recurso visual':rel.startsWith('docs/')?'Documentação de apoio':'Código / configuração',n,sensitive?'Inventário baseado nos nomes consumidos pelo código; defaults documentados.':n?'Referências detalhadas no Inventário':'Sem candidato independente selecionado; consultar critérios da aba Não parametrizar diretamente.'];
}),[80,40,23,100]);
(async()=>{
 const out=path.join(__dirname,'levantamento-configuracoes.xlsx');await wb.xlsx.writeFile(out);
 const check=new ExcelJS.Workbook();await check.xlsx.readFile(out);
 if(check.getWorksheet('Inventário').rowCount!==rows.length+1)throw new Error('Contagem incorreta');
 const ids=new Set(rows.map(r=>r[0]));if(ids.size!==rows.length)throw new Error('IDs duplicados');
 console.log(JSON.stringify({arquivo:out,candidatos:rows.length,abas:check.worksheets.map(s=>s.name),arquivosCobertura:covered.length,bytes:fs.statSync(out).size}));
})().catch(e=>{console.error(e);process.exit(1)});
