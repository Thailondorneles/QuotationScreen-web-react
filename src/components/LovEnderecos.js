import '../style/lovStyle.css';
import { FaX } from "react-icons/fa6";
import { useEffect, useState } from 'react';
import { getEnderecosByFilter } from '../services/enderecos';

export function LovEnderecos({ isOpen, setLovOpen, codPessoa, onSelect }) {
    const [enderecos, setEnderecos] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function carregarEnderecos() {
            if (!isOpen || !codPessoa) {
                setEnderecos([]);
                return;
            }

            setLoading(true);

            try {
                const response = await getEnderecosByFilter({
                    filtro: codPessoa,
                    offset: 0,
                    limit: 25
                });

                setEnderecos(response.data.items || []);
            } catch (error) {
                setEnderecos([]);
            } finally {
                setLoading(false);
            }
        }

        carregarEnderecos();
    }, [isOpen, codPessoa]);

    if (!isOpen) return null;

    return (
        <div className="lov-overlay">
            <div className="lov-modal lov-modal-enderecos">
                <div className="lov-header">
                    <span>Relação de endereços do cliente</span>
                    <FaX className="lov-close" onClick={() => setLovOpen(false)} />
                </div>

                <div className="lov-list lov-list-enderecos">
                    <table>
                        <thead>
                            <tr>
                                <th>Endereço</th>
                                <th>Cidade</th>
                                <th>Estado</th>
                                <th>CEP</th>
                                <th>Descrição</th>
                                <th>Rota</th>
                                <th>Sequencia rota</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && enderecos.map((endereco, index) => (
                                <tr
                                    key={`${endereco.num_cep}-${index}`}
                                    onClick={() => {
                                        onSelect(endereco);
                                        setLovOpen(false);
                                    }}
                                    className="lov-row"
                                >
                                    <td>{endereco.des_endereco || ''}</td>
                                    <td>{endereco.des_cidade || ''}</td>
                                    <td>{endereco.cod_uf || ''}</td>
                                    <td>{endereco.num_cep || ''}</td>
                                    <td>{endereco.des_bairro || ''}</td>
                                    <td>{endereco.cod_rota || ''}</td>
                                    <td>{endereco.num_sequencia_rota || ''}</td>
                                </tr>
                            ))}
                            {!loading && enderecos.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="lov-empty">
                                        Nenhum endereço encontrado para este cliente.
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan="7" className="lov-empty">
                                        Carregando endereços...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="lov-footer lov-footer-center">
                    <button className="lov-close-button" onClick={() => setLovOpen(false)}>
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    );
}
