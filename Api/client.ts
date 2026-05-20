import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Backend-dən gələn xəta strukturu prioritet sırası ilə oxunur:
    //  1. { error: "..." }              — bizim ImportsController-in yeni strukturu
    //  2. { detail: "..." }             — ProblemDetails (RFC 7807)
    //  3. { title: "..." }              — ProblemDetails title
    //  4. { message: "..." }            — bəzi framework xətaları
    //  5. HTTP status text              — yuxarıdakıların hamısı yoxdursa
    const data = err.response?.data;
    const extracted =
      data?.error   ??
      data?.detail  ??
      data?.title   ??
      data?.message ??
      (typeof data === "string" && data.length < 500 ? data : null) ??
      err.message   ??
      "Bilinməyən xəta";

    // `err.displayMessage`-ə yaz ki, hər yerdə istifadə edə bilək
    err.displayMessage = extracted;

    // Əgər `detail` ayrı məlumat gətirsə saxla
    if (data?.detail && data.detail !== extracted) {
      err.displayDetail = data.detail;
    }

    console.error("[API xəta]", err.response?.status, extracted, data);
    return Promise.reject(err);
  }
);

// TypeScript üçün tip genişlətməsi
declare module "axios" {
  interface AxiosError {
    displayMessage?: string;
    displayDetail?: string;
  }
}
