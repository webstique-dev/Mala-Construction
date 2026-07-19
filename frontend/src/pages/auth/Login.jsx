import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';
import { isEmail, trimString } from '../../utils/validators';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '', rememberMe: false } });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const payload = { ...values, email: trimString(values.email), password: trimString(values.password) };
      const user = await login(payload);
      const redirectTo = location.state?.from?.pathname || (user.role === 'super_admin' ? '/dashboard' : '/dashboard');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Unable to sign in. Check your credentials and try again.');
    }
  };

  return (
    <div className="login-container">
      {/* Left Panel - Background with Overlay */}
      <div className="login-left">
        <div className="login-left__overlay">
          <div className="login-left__header">
            <div className="login-left__logo">
              {/* <div className="login-left__logo-icon">MC</div> */}
              <span className="login-left__logo-text">MALA CONSTRUCTION</span>
            </div>
            {/* <a href="/" className="login-left__back-link">← Back to Website</a> */}
          </div>

          <div className="login-left__content">
            <h2 className="login-left__headline">
              Powerful Construction<br />Management Platform
            </h2>
            <p className="login-left__subtext">
              Manage your projects efficiently with real-time insights and seamless workflows
            </p>
          </div>

         
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right">
        <div className="login-card">
          <h1 className="login-card__title">Welcome Back!</h1>
          <p className="login-card__subtitle">Enter your credentials to access your dashboard</p>

          {serverError && (
            <div className="login-card__error" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="login-form">
            {/* Email Field */}
            <div className="login-field-group">
              <label className="login-label">Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="Input your email"
                className="login-input"
                {...register('email', { required: 'Email is required', validate: (v) => isEmail(v) || 'Invalid email' })}
              />
              {errors.email && <span className="login-field-error">{errors.email.message}</span>}
            </div>

            {/* Password Field with Toggle */}
          <div className="login-field-group">
  <label className="login-label">Password</label>

  <div className="login-password-wrapper">
    <input
      type={showPassword ? 'text' : 'password'}
      autoComplete="current-password"
      placeholder="Enter your password"
      className="login-input"
      {...register('password', {
        required: 'Password is required',
      })}
    />

    <button
      type="button"
      className="login-password-toggle"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>

  {errors.password && (
    <span className="login-field-error">
      {errors.password.message}
    </span>
  )}
</div>

            {/* Remember Me & Forgot Password */}
            <div className="login-row">
              <label className="login-checkbox">
                <input type="checkbox" {...register('rememberMe')} />
                <span>Remember me</span>
              </label>
              {/* <a href="/forgot-password" className="login-forgot-link">Forgot Password?</a> */}
            </div>

            {/* Login Button */}
            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          {/* <div className="login-divider">
            <span>Or continue with:</span>
          </div> */}

          {/* Google Button */}
          {/* <button className="login-google-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
            Continue with Google
          </button> */}

          {/* Sign Up Link */}
          {/* <p className="login-signup">
            Don't have an account? <a href="/signup" className="login-signup-link">Sign up here</a>
          </p> */}
        </div>
      </div>
    </div>
  );
}
