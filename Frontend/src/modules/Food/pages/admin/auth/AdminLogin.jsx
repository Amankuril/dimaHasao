import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "@food/api";
import { setAuthData } from "@food/utils/auth";
import { setUnifiedAdminSession } from "../../../../Taxi/modules/admin/services/adminSession";
import { Lock, Loader2, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { resolveAdminHome } from "@/shared/utils/adminHome";
import AdminAuthShell, {
  authFieldClass,
  authLabelClass,
  authInputClass,
  authButtonClass,
} from "./AdminAuthShell";

/**
 * The one admin login for the whole platform.
 *
 * Every panel — Food, Taxi, Hotel, Tours, Global — redirects here; there is no
 * second admin login anywhere, and self-serve signup is gone (an administrator
 * is created by a platform superadmin in Global › Administrators).
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const submitting = useRef(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Enter your admin email";
    if (!password) nextErrors.password = "Enter your password";
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

      if (!accessToken || !adminUser || !refreshToken) {
        throw new Error("Invalid response from server");
      }

      setAuthData("admin", accessToken, adminUser, refreshToken);
      setUnifiedAdminSession({ token: accessToken, user: adminUser, refreshToken });

      toast.success(`Welcome back, ${adminUser.name || "Administrator"}`);
      // Land on a module this admin can actually open. Sending everyone to Food
      // dropped a tours-only admin on a panel their sidebar would not even
      // offer them a tab for.
      navigate(resolveAdminHome(adminUser), { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Sign in failed. Check your email and password.";
      toast.error(message);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <AdminAuthShell>
      <div className="flex items-center justify-center gap-2.5 md:justify-start">
        <ShieldCheck size={15} className="text-[#caa83e]" />
        <span className="dh-cinzel text-[11px] font-bold uppercase tracking-[0.22em] text-[#caa83e]">
          Administrator
        </span>
      </div>

      <h2 className="dh-montserrat mt-3 text-center text-2xl font-black tracking-wide text-[#f4efe2] md:text-left">
        Sign in
      </h2>
      <p className="mt-1.5 text-center text-[13px] text-[#9fb3a4] md:text-left">
        Accounts are issued by a platform superadmin.
      </p>

      <form onSubmit={handleLogin} className="mt-7 space-y-4" noValidate>
        <div>
          <label htmlFor="admin-email" className={authLabelClass}>
            Email
          </label>
          <div className={authFieldClass(errors.email)}>
            <span className="grid w-11 shrink-0 place-items-center text-[#caa83e]">
              <Mail size={16} />
            </span>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((c) => ({ ...c, email: undefined }));
              }}
              placeholder="admin@dimahasao.in"
              className={`${authInputClass} pr-3`}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-[11px] text-red-300">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="admin-password" className={authLabelClass}>
            Password
          </label>
          <div className={authFieldClass(errors.password)}>
            <span className="grid w-11 shrink-0 place-items-center text-[#caa83e]">
              <Lock size={16} />
            </span>
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((c) => ({ ...c, password: undefined }));
              }}
              placeholder="••••••••"
              className={authInputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="grid w-11 shrink-0 place-items-center text-[#5d7264] transition-colors hover:text-[#caa83e]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-[11px] text-red-300">{errors.password}</p>}
        </div>

        <div className="flex justify-end">
          {/* The reset flow already existed and worked; nothing linked to it,
              so an admin who forgot their password had no way in. */}
          <button
            type="button"
            onClick={() => navigate("/admin/forgot-password")}
            className="text-[12px] font-semibold text-[#caa83e] transition-colors hover:text-[#e8c558]"
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
        </button>
      </form>

      <p className="mt-7 text-center text-[11px] leading-relaxed text-[#5d7264] md:text-left">
        Authorised access only. Every action in this console is recorded against
        your account.
      </p>
    </AdminAuthShell>
  );
}
