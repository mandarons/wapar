import { z } from 'zod';

export const InstallationSchema = z.object({
  appName: z.string().min(5),
  appVersion: z.string().min(5),
  previousId: z.string().min(10).optional(),
  data: z.record(z.any()).nullable().optional(),
});

export const HeartbeatSchema = z.object({
  installationId: z.string().min(10),
  data: z.record(z.any()).nullable().optional(),
});
