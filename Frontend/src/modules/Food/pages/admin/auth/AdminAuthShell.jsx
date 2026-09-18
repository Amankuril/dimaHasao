/*
 * The admin auth frame now lives in shared/components/auth, because every
 * module's sign-in, sign-up and onboarding screen uses the same one. This file
 * stays as the re-export so the two admin screens that import it keep working.
 */
export {
  default,
  authFieldClass,
  authLabelClass,
  authInputClass,
  authButtonClass,
} from '@/shared/components/auth/DimaHasaoAuthShell';
