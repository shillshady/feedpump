import { z } from "zod";

export const launchTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(32, "Name must be 32 characters or less"),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(10, "Symbol must be 10 characters or less")
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]+$/, "Symbol must be alphanumeric")),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  twitter: z.string().url().optional().or(z.literal("")),
  telegram: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  initialBuyAmount: z
    .number()
    .min(0.0001, "Minimum dev buy is 0.0001 SOL")
    .max(100, "Initial buy must be 100 SOL or less"),
});

export type LaunchTokenInput = z.infer<typeof launchTokenSchema>;
