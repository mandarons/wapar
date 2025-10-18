import { z } from 'zod';

export const HeartbeatSchema = z.object({
  installationId: z.string().min(10),
  data: z.record(z.any()).nullable().optional(),
});
