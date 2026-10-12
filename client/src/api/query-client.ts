import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        !(axios.isAxiosError(error) && error.response && error.response.status < 500) && count < 2,
    },
    mutations: { retry: false },
  },
});
