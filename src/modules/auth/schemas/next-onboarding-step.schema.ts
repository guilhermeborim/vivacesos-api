import { z } from 'zod';
import { UserOnboardingStep } from '../../users/enums/user-onboarding-step.enum.js';

export const nextOnboardingStepSchema = z.object({
  step: z.enum(UserOnboardingStep),
});

export type NextOnboardingStepDto = z.infer<typeof nextOnboardingStepSchema>;
