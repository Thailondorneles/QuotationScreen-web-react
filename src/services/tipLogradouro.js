import axios from "axios";

const tipLogradouroApi = axios.create({
    baseURL: "http://172.20.3.37:9595/ords/nl/unimed/",
    headers: {
        "Content-Type": "application/json",
    },
});

export function getTipLogradouro({ offset = 0, limit = 25 }) {
    return tipLogradouroApi.get("tipLogradouro", {
        params: { offset, limit }
    });
}
