import { montarEnderecoPersistencia } from './enderecoPersistencia';
import { criarAcoesEnderecos } from '../../hooks/pedido/acoes/enderecos';

jest.mock('../../services/ceps', () => ({}));
jest.mock('../../services/enderecosPadrao', () => ({}));
jest.mock('../../services/cidades', () => ({}));
jest.mock('../../services/uf', () => ({}));
jest.mock('../../services/tipLogradouro', () => ({}));

test('envia o código original do tipo consultado e mantém CEP e número como textos', () => {
    const { getCodigoTipoLogradouro } = criarAcoesEnderecos({ tiposLogradouro: [{ cod_tipo: 3, des_tipo: 'RUA' }] });
    expect(montarEnderecoPersistencia({
        codCepDigitado: '93540-090', codUfDigitado: 'RS', codCidadeDigitado: '4313409',
        tipoLogradouroSelecionado: 'RUA', logradouroDigitado: 'VIDAL BRASIL',
        numeroEnderecoDigitado: '1671', bairroDigitado: 'HAMBURGO VELHO'
    }, getCodigoTipoLogradouro)).toEqual({
        numCep: '93540090', codUf: 'RS', codCidade: 4313409, codTipLogradouro: 3,
        desLogradouro: 'VIDAL BRASIL', numLogradouro: '1671', desComplLogradouro: null,
        desBairro: 'HAMBURGO VELHO', desReferencia: null
    });
});

test('bloqueia tipo de logradouro sem código na consulta', () => {
    expect(() => montarEnderecoPersistencia({ tipoLogradouroSelecionado: 'RUA' }, () => null)).toThrow('Selecione um tipo');
});
