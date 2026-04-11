import axios from "axios";

const ufApi = axios.create({
    baseURL: "http://172.20.3.37:9595/ords/nl/unimed/",
    headers: {
        "Content-Type": "application/json",
    },
});

export function getUf({ offset = 0, limit = 25 }) {
    return ufApi.get("uf", {
        params: { offset, limit }
    });
}

export function getUfByFilter({ filtro, offset = 0, limit = 25 }) {
    return ufApi.get(`uf/${filtro}`, {
        params: { offset, limit }
    });
}
