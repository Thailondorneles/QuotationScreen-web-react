import axios from "axios";

export const unimedApi = axios.create({
    baseURL: "https://nl-homolog.unimedcentralrs.com.br/ords/nl/unimed/",
    headers: {
        "Content-Type": "application/json",
    },
});


