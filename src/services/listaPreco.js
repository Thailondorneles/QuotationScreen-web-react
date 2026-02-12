import { unimedApi } from "../config/apis.js";

export function getListaPreco({ lista, item}) {

    return unimedApi.get(`listaPreco/${lista}/${item}`);
}
