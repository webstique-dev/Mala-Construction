import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, LoaderCircle, ShieldCheck, Building2, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import '../../styles/tokens.css';
import './Login.css';
import { isEmail, isStrongPassword, trimString } from '../../utils/validators';
import apiClient from '../../services/apiClient';

const ROLE_OPTIONS = [
  {
    value: 'super_admin',
    title: 'Super Admin',
    description: 'Full system access. Manage all sites, users, and settings.',
    icon: ShieldCheck,
  },
  {
    value: 'site_admin',
    title: 'Site Admin',
    description: 'Access only to the assigned site. Manage inventory, sales, and expenses.',
    icon: Building2,
  },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sites, setSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginForm = useForm({ defaultValues: { email: '', password: '', rememberMe: false } });
  const registerForm = useForm({
    defaultValues: {
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'site_admin',
      assignedSite: '',
      acceptedTerms: false,
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (activeTab !== 'register') return;
    let cancelled = false;
    const loadSites = async () => {
      setIsLoadingSites(true);
      try {
        const { data } = await apiClient.get('/lookups/sites');
        if (!cancelled) setSites(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSites([]);
      } finally {
        if (!cancelled) setIsLoadingSites(false);
      }
    };
    loadSites();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const onLoginSubmit = async (values) => {
    setIsLoggingIn(true);
    try {
      const payload = { ...values, email: trimString(values.email), password: trimString(values.password) };
      const user = await login(payload);
      let redirectTo = location.state?.from?.pathname || '/dashboard';
      const superAdminOnlyRoutes = ['/sites', '/site-admins', '/settings'];
      if (user?.role !== 'super_admin' && superAdminOnlyRoutes.some((r) => redirectTo.startsWith(r))) {
        redirectTo = '/dashboard';
      }
      toast.success(`Welcome back, ${user?.name || 'there'}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to sign in. Check your credentials and try again.';
      toast.error(message);
      setIsLoggingIn(false);
    }
  };

  const onRegisterSubmit = async (values) => {
    setServerError(null);
    try {
      const payload = {
        ...values,
        name: trimString(values.name),
        username: trimString(values.username || ''),
        email: trimString(values.email),
        phone: trimString(values.phone),
        password: trimString(values.password),
        confirmPassword: trimString(values.confirmPassword),
      };

      if (!payload.name) throw new Error('Full name is required.');
      if (!isEmail(payload.email)) throw new Error('Please enter a valid email address.');
      if (!isStrongPassword(payload.password)) throw new Error('Password must be at least 8 characters with letters and numbers.');
      if (payload.password !== payload.confirmPassword) throw new Error('Passwords do not match.');
      if (payload.role === 'site_admin' && !payload.assignedSite) throw new Error('Please select a site for the Site Admin account.');

      const { message } = await apiClient.post('/auth/register', payload);
      toast.success(message || 'Account created successfully.');
      setActiveTab('login');
      loginForm.reset({ email: payload.email, password: '', rememberMe: payload.rememberMe });
      registerForm.reset({
        name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'site_admin',
        assignedSite: '',
        acceptedTerms: false,
        rememberMe: false,
      });
      setServerError(null);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setServerError(message);
      toast.error(message);
    }
  };

  const tabContent = useMemo(() => ({
    login: (
      <motion.div key="login" className="auth-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} noValidate className="login-form">
          <div className="login-field-group">
            <label className="login-label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="email" placeholder="Enter your email" className="login-input" {...loginForm.register('email', { required: 'Email is required', validate: (value) => isEmail(value) || 'Invalid email' })} />
            {loginForm.formState.errors.email && <span className="login-field-error">{loginForm.formState.errors.email.message}</span>}
          </div>
          <div className="login-field-group">
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-password-wrapper">
              <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="login-input" {...loginForm.register('password', { required: 'Password is required' })} />
              <button type="button" className="login-password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {loginForm.formState.errors.password && <span className="login-field-error">{loginForm.formState.errors.password.message}</span>}
          </div>
          <div className="login-row">
            <label className="login-checkbox">
              <input type="checkbox" {...loginForm.register('rememberMe')} />
              <span>Remember me</span>
            </label>
          </div>
          <button type="submit" className="login-button" disabled={isLoggingIn || loginForm.formState.isSubmitting}>
            {isLoggingIn || loginForm.formState.isSubmitting ? (<span className="login-button__content"><LoaderCircle size={16} className="login-spinner" />Signing In...</span>) : 'Sign In'}
          </button>
        </form>
      </motion.div>
    ),
    register: (
      <motion.div key="register" className="auth-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} noValidate className="login-form login-form--stacked">
          <div className="login-field-group">
            <label className="login-label" htmlFor="register-name">Full Name</label>
            <input id="register-name" type="text" autoComplete="name" className="login-input" placeholder="Enter your full name" {...registerForm.register('name', { required: 'Full name is required' })} />
            {registerForm.formState.errors.name && <span className="login-field-error">{registerForm.formState.errors.name.message}</span>}
          </div>
          <div className="login-field-group">
            <label className="login-label" htmlFor="register-username">Username (optional)</label>
            <input id="register-username" type="text" autoComplete="username" className="login-input" placeholder="Choose a username" {...registerForm.register('username')} />
          </div>
          <div className="login-field-group">
            <label className="login-label" htmlFor="register-email">Email</label>
            <input id="register-email" type="email" autoComplete="email" className="login-input" placeholder="Enter your work email" {...registerForm.register('email', { required: 'Email is required', validate: (value) => isEmail(value) || 'Invalid email' })} />
            {registerForm.formState.errors.email && <span className="login-field-error">{registerForm.formState.errors.email.message}</span>}
          </div>
          <div className="login-field-group">
            <label className="login-label" htmlFor="register-phone">Phone Number</label>
            <input id="register-phone" type="tel" autoComplete="tel" className="login-input" placeholder="Enter phone number" {...registerForm.register('phone', { required: 'Phone number is required' })} />
            {registerForm.formState.errors.phone && <span className="login-field-error">{registerForm.formState.errors.phone.message}</span>}
          </div>
          <div className="login-field-group">
            <label className="login-label" htmlFor="register-password">Password</label>
            <div className="login-password-wrapper">
              <input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="login-input" placeholder="Create a strong password" {...registerForm.register('password', { required: 'Password is required', validate: (value) => isStrongPassword(value) || 'Use at least 8 characters with letters and numbers' })} />
              <button type="button" className="login-password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {registerForm.formState.errors.password && <span className="login-field-error">{registerForm.formState.errors.password.message}</span>}
          </div>
          <div className="login-field-group">
            <label className="login-label" htmlFor="register-confirm-password">Confirm Password</label>
            <div className="login-password-wrapper">
              <input id="register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" className="login-input" placeholder="Confirm your password" {...registerForm.register('confirmPassword', { required: 'Please confirm your password' })} />
              <button type="button" className="login-password-toggle" onClick={() => setShowConfirmPassword((prev) => !prev)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {registerForm.formState.errors.confirmPassword && <span className="login-field-error">{registerForm.formState.errors.confirmPassword.message}</span>}
          </div>
          <div className="role-selector" role="radiogroup" aria-label="Choose account type">
            {ROLE_OPTIONS.map((roleOption) => {
              const Icon = roleOption.icon;
              const selected = registerForm.watch('role') === roleOption.value;
              return (
                <label key={roleOption.value} className={`role-option ${selected ? 'role-option--active' : ''}`}>
                  <input type="radio" value={roleOption.value} className="role-option__input" {...registerForm.register('role')} />
                  <span className="role-option__icon"><Icon size={18} /></span>
                  <span className="role-option__content">
                    <span className="role-option__title">{roleOption.title}</span>
                    <span className="role-option__description">{roleOption.description}</span>
                  </span>
                  {selected ? <CheckCircle2 size={18} className="role-option__check" /> : <Circle size={18} className="role-option__check" />}
                </label>
              );
            })}
          </div>
          {registerForm.watch('role') === 'site_admin' && (
            <div className="login-field-group">
              <label className="login-label" htmlFor="register-assigned-site">Site Selection</label>
              <select id="register-assigned-site" className="login-input" {...registerForm.register('assignedSite', { required: registerForm.watch('role') === 'site_admin' ? 'Site is required for Site Admin' : false })}>
                <option value="">Select a site</option>
                {sites.map((site) => <option key={site._id || site.id} value={site._id || site.id}>{site.name}</option>)}
              </select>
              {isLoadingSites && <span className="login-field-hint">Loading sites…</span>}
              {registerForm.formState.errors.assignedSite && <span className="login-field-error">{registerForm.formState.errors.assignedSite.message}</span>}
            </div>
          )}
          <label className="login-checkbox login-checkbox--stacked">
            <input type="checkbox" {...registerForm.register('acceptedTerms', { required: 'You must accept the terms and conditions.' })} />
            <span>I agree to the Terms & Conditions</span>
          </label>
          {registerForm.formState.errors.acceptedTerms && <span className="login-field-error">{registerForm.formState.errors.acceptedTerms.message}</span>}
          <button type="submit" className="login-button" disabled={registerForm.formState.isSubmitting}>
            {registerForm.formState.isSubmitting ? (<span className="login-button__content"><LoaderCircle size={16} className="login-spinner" />Creating account...</span>) : 'Create account'}
          </button>
        </form>
      </motion.div>
    ),
  }), [loginForm, registerForm, showPassword, showConfirmPassword, sites, isLoadingSites, isLoggingIn]);

  return (
    <div className="login-container">
      <div className="login-main-box">
        {/* Left Image Panel */}
        <div className="login-left">
          <div className="login-left__card">
            <div className="login-left__overlay">
              <div className="login-left__tagline">
                <span>A WISE QUOTE</span>
                <div className="login-left__line" />
              </div>
              <div className="login-left__content">
                <h2 className="login-left__headline">Coordinate projects with clarity and confidence.</h2>
                <p className="login-left__subtext">
                  Monitor operations, manage teams, and keep your construction business moving forward seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="login-right">
          <div className="login-right__inner">
            <div className="login-logo-container">
              <img
                src="https://res.cloudinary.com/rlokioxu/image/upload/v1784539749/Mala_Construction_logo_oyced2.png"
                alt="Mala Constructions"
                className="login-logo-img"
              />
            </div>
            <div className="login-card__header">
              <h1 className="login-card__title">Welcome Back</h1>
              <p className="login-card__subtitle">Enter your email and password to access your account</p>
            </div>
            {serverError && <div className="login-card__error" role="alert"><AlertCircle size={16} /><span>{serverError}</span></div>}
            <AnimatePresence mode="wait">{tabContent[activeTab]}</AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
