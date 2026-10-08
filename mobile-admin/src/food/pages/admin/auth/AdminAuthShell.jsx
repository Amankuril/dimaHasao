/* Ported from Frontend/src/modules/Food/pages/admin/auth/AdminAuthShell.jsx (tools/port.js first pass). */
/*
 * The admin auth frame now lives in shared/components/auth, because every
 * module's sign-in, sign-up and onboarding screen uses the same one. This file
 * stays as the re-export so the two admin screens that import it keep working.
 */
export { default, authButtonTextClass, MONTSERRAT, CINZEL, authFieldClass, authLabelClass, authInputClass, authButtonClass } from '../../../../admin/AdminAuthShell';
