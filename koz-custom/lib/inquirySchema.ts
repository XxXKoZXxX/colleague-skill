import { z } from 'zod'

export const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  budget_usd: z
    .number({ error: 'Budget must be a number' })
    .min(200, 'Minimum custom order is $200.'),
  description: z.string().optional(),
  facet_cut_id: z.string().uuid().optional().or(z.literal('')),
})

export type InquiryInput = z.infer<typeof inquirySchema>
