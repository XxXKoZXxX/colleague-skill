import { z } from 'zod'

export const inquirySchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Valid email required'),
    title: z.string().min(1, 'Briefly name your piece (e.g. "Custom Opal Ring")'),
    budget_min: z.number({ error: 'Budget must be a number' }).min(0).optional(),
    budget_max: z
      .number({ error: 'Budget must be a number' })
      .min(200, 'Minimum custom order is $200.'),
    description: z.string().optional(),
    facet_cut_id: z.string().uuid().optional().or(z.literal('')),
  })
  .refine(
    (d) => d.budget_min === undefined || d.budget_min <= d.budget_max,
    { message: 'Minimum budget cannot exceed maximum.', path: ['budget_min'] }
  )

export type InquiryInput = z.infer<typeof inquirySchema>
