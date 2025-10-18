import { z } from 'zod';

export const HeartbeatSchema = z.object({
  installationId: z.string().uuid("Installation ID must be a valid UUID"),
  data: z.record(z.any()).nullable().optional(),
});
