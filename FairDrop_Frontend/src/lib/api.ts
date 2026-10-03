import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("fairdrop:access-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
    if (axiosError.response?.data?.message) return axiosError.response.data.message;
    if (axiosError.response?.status === 401) return "Please sign in to continue.";
    if (axiosError.response?.status === 403) return "Your account does not have access to this action.";
    if (axiosError.code === "ECONNABORTED") return "The FairDrop API took too long to respond.";
    if (!axiosError.response) return "Could not reach the FairDrop API. Check that the backend is running.";
    return `The FairDrop API returned an error (${axiosError.response.status}).`;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
