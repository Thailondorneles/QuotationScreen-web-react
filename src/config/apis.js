import axios from "axios";

export const unimedApi = axios.create({
    baseURL: "http://172.20.3.37:9595/ords/nl/unimed/",
    //https://nl-homolog.unimedcentralrs.com.br
    headers: {
        "Content-Type": "application/json",
    },
});