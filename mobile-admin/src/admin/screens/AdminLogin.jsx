import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { adminAPI } from '../../api/food';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { Button, Div, Form, H2, Icon, Input, Label, P, Span } from '../../components/web';
import AdminAuthShell, { CINZEL, MONTSERRAT, authButtonClass, authButtonTextClass, authFieldClass, authInputClass, authLabelClass } from '../AdminAuthShell';
import { resolveAdminHome } from '../access';

/*
 * Port of Food/pages/admin/auth/AdminLogin.jsx: the one admin login for the
 * whole platform. Every panel (Food, Taxi, Hotel, Tours, Global) lands here;
 * accounts are created by a platform superadmin in Global > Administrators.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginWithAuthData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const submitting = useRef(false);

  const handleLogin = async () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Enter your admin email';
    if (!password) nextErrors.password = 'Enter your password';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (submitting.current) return;

    submitting.current = true;
    setLoading(true);
    try {
      const response = await adminAPI.login(email.trim(), password);
      const data = response?.data?.data || response?.data || {};
      const accessToken = data.accessToken;
      const adminUser = data.user || data.admin;
      const refreshToken = data.refreshToken ?? null;
      if (!accessToken || !adminUser || !refreshToken) throw new Error('Invalid response from server');

      await loginWithAuthData({ accessToken, refreshToken, user: adminUser });
      toast.success(`Welcome back, ${adminUser.name || 'Administrator'}`);
      // Land on a module this admin can actually open.
      navigate(resolveAdminHome(adminUser), { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Sign in failed. Check your email and password.';
      toast.error(message);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <AdminAuthShell>
      <Div className="flex items-center justify-center gap-2.5">
        <Icon as={ShieldCheck} size={15} className="text-[#caa83e]" />
        <Span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#caa83e]" style={CINZEL}>
          Administrator
        </Span>
      </Div>

      <H2 className="mt-3 text-center text-2xl font-black tracking-wide text-[#f4efe2]" style={MONTSERRAT}>
        Sign in
      </H2>
      <P className="mt-1.5 text-center text-[13px] text-[#9fb3a4]">Accounts are issued by a platform superadmin.</P>

      <Form onSubmit={handleLogin} className="mt-7 gap-4">
        <Div>
          <Label className={authLabelClass} style={MONTSERRAT}>
            Email
          </Label>
          <Div className={authFieldClass(errors.email)}>
            <Div className="w-11 h-12 shrink-0 items-center justify-center">
              <Icon as={Mail} size={16} className="text-[#caa83e]" />
            </Div>
            <Input
              type="email"
              autoComplete="username"
              textContentType="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((c) => ({ ...c, email: undefined }));
              }}
              placeholder="admin@dimahasao.in"
              placeholderTextColor="#5d7264"
              className={`${authInputClass} pr-3`}
              returnKeyType="next"
            />
          </Div>
          {errors.email ? <P className="mt-1.5 text-[11px] text-red-300">{errors.email}</P> : null}
        </Div>

        <Div>
          <Label className={authLabelClass} style={MONTSERRAT}>
            Password
          </Label>
          <Div className={authFieldClass(errors.password)}>
            <Div className="w-11 h-12 shrink-0 items-center justify-center">
              <Icon as={Lock} size={16} className="text-[#caa83e]" />
            </Div>
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              textContentType="password"
              autoCapitalize="none"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((c) => ({ ...c, password: undefined }));
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              placeholderTextColor="#5d7264"
              className={authInputClass}
            />
            <Button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              className="w-11 h-12 shrink-0 items-center justify-center"
            >
              <Icon as={showPassword ? EyeOff : Eye} size={16} className="text-[#5d7264]" />
            </Button>
          </Div>
          {errors.password ? <P className="mt-1.5 text-[11px] text-red-300">{errors.password}</P> : null}
        </Div>

        <Div className="flex justify-end">
          <Button type="button" onClick={() => navigate('/admin/forgot-password')} className="text-[12px] font-semibold text-[#caa83e]">
            Forgot password?
          </Button>
        </Div>

        <Button type="submit" disabled={loading} className={authButtonClass} style={loading ? { opacity: 0.7 } : null}>
          {loading ? (
            <ActivityIndicator size="small" color="#04190c" />
          ) : (
            <Span className={authButtonTextClass} style={MONTSERRAT}>
              Sign in
            </Span>
          )}
        </Button>
      </Form>

      <P className="mt-7 text-center text-[11px] leading-relaxed text-[#5d7264]">Authorised access only. Every action in this console is recorded against your account.</P>
    </AdminAuthShell>
  );
}
