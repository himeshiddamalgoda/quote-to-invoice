import { z } from 'zod';
import { http } from './http';
const healthSchema = z.object({ data: z.object({ status: z.literal('ok') }) });
export async function fetchHealth() {
  const response = await http.get<unknown>('/health');
  return healthSchema.parse(response.data).data;
}
