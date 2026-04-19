import axios from "axios";

const unimedApiBaseUrl = process.env.REACT_APP_UNIMED_API_BASE_URL;

if (!unimedApiBaseUrl) {
    throw new Error("REACT_APP_UNIMED_API_BASE_URL nao configurada.");
}

export const unimedApi = axios.create({
    baseURL: unimedApiBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
});
