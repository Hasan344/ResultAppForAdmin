import axios from "axios";

// import.meta.env.BASE_URL = vite.config.ts'teki `base` değeri
// dev'de "/", prod'da "/neticeler/" olur. Sonundaki "/" + "api" = "/neticeler/api"
export const api = axios.create({
    baseURL: `${import.meta.env.BASE_URL}api`,
    headers: { "Content-Type": "application/json" }
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        const data = err.response?.data;
        const extracted =
            data?.error ??
            data?.detail ??
            data?.title ??
            data?.message ??
            (typeof data === "string" && data.length < 500 ? data : null) ??
            err.message ??
            "Naməlum xəta";

        err.displayMessage = extracted;

        if (data?.detail && data.detail !== extracted) {
            err.displayDetail = data.detail;
        }

        console.error("[API xəta]", err.response?.status, extracted, data);
        return Promise.reject(err);
    }
);

declare module "axios" {
    interface AxiosError {
        displayMessage?: string;
        displayDetail?: string;
    }
}