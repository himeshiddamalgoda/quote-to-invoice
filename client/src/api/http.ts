import axios from 'axios';
import { z } from 'zod';
const baseURL = z.url().parse(import.meta.env.VITE_API_BASE_URL);
export const http = axios.create({ baseURL, timeout: 15_000 });
// Access tokens stay in memory; reloading requires a new login until refresh sessions are added.
export function setAccessToken(token: string | null) {
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete http.defaults.headers.common.Authorization;
}
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const parsed = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(error.response?.data);
    if (parsed.success) return parsed.data.error.message;
    return error.response ? 'The request could not be completed.' : 'Cannot reach the API.';
  }
  return 'Something went wrong. Please try again.';
}
