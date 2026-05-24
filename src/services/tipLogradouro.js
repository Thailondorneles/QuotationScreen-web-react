import { unimedApi } from "../config/apis.js";

export function getTipLogradouro({ offset = 0, limit = 25 }) {
    return unimedApi.get("tipLogradouro", {
        params: { offset, limit }
    });
}
