import axios from "axios";
// Ana (login) app adresi — 401'de bura döneriz.
const LOGIN_APP_URL = "/qabiliyyet/"; // ← kurulumuna göre doğrula
export const api = axios.create({
    baseURL: `${import.meta.env.BASE_URL}api`,
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // paylaşılan Identity cookie gönderilsin
});
api.interceptors.response.use((r) => r, (err) => {
    const status = err.response?.status;
    if (status === 401) {
        window.location.href = LOGIN_APP_URL; // oturum yok/bitti -> login app
        return new Promise(() => { }); // pending bırak, downstream hata göstermesin
    }
    const data = err.response?.data;
    const extracted = data?.error ??
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
    console.error("[API xəta]", status, extracted, data);
    return Promise.reject(err);
});
