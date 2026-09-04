import { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, FormField, PasswordInput, TextInput } from '@/components/ui';
import { useAuth, useForm } from '@/hooks';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DEFAULT_AUTHENTICATED_ROUTE, RoutePath } from '@/routes/paths';
import { validateEmail, validatePasswordPresence } from '@/utils/validation';
import type { FormErrors } from '@/hooks';
import './AuthForms.css';

interface LoginFormValues extends Record<string, unknown> {
  email: string;
  password: string;
  rememberMe: boolean;
}

const INITIAL_VALUES: LoginFormValues = {
  email: '',
  password: '',
  rememberMe: false,
};

function validate(values: LoginFormValues): FormErrors<LoginFormValues> {
  return {
    email: validateEmail(values.email),
    // Presence only: the sign-in form must not reveal the password policy.
    password: validatePasswordPresence(values.password),
  };
}

/** First screen of the application: sign in with an email address and password. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /** Where the user was heading before the guard redirected them here. */
  const navigationState = location.state as { from?: string; passwordReset?: boolean } | null;
  const redirectTo = navigationState?.from ?? DEFAULT_AUTHENTICATED_ROUTE;

  const handleLogin = useCallback(
    async (values: LoginFormValues) => {
      await login({
        email: values.email.trim(),
        password: values.password,
        rememberMe: values.rememberMe,
      });
      navigate(redirectTo, { replace: true });
    },
    [login, navigate, redirectTo],
  );

  const form = useForm<LoginFormValues>({
    initialValues: INITIAL_VALUES,
    validate,
    onSubmit: handleLogin,
  });

  const emailError = form.touched.email ? form.errors.email : undefined;
  const passwordError = form.touched.password ? form.errors.password : undefined;

  return (
    <AuthLayout
      connected
      title="Welcome back"
      subtitle="Sign in to reach your reporting workspace."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link className="auth-form__link" to={RoutePath.signup}>
            Sign Up
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={form.handleSubmit} autoComplete="off" noValidate>
        {navigationState?.passwordReset && (
          <Alert variant="success">Password updated. Log in with your new password.</Alert>
        )}
        {form.formError && <Alert variant="danger">{form.formError}</Alert>}

        <FormField htmlFor="email" label="Email address" error={emailError} required>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="you@company.com"
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(emailError)}
            disabled={form.isSubmitting}
            autoFocus
          />
        </FormField>

        <FormField htmlFor="password" label="Password" error={passwordError} required>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="off"
            placeholder="Enter your password"
            value={form.values.password}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(passwordError)}
            disabled={form.isSubmitting}
          />
        </FormField>

        <div className="auth-form__row">
          <Checkbox
            id="rememberMe"
            name="rememberMe"
            label="Remember me"
            checked={form.values.rememberMe}
            onChange={form.handleChange}
            disabled={form.isSubmitting}
          />
          <Link className="auth-form__link" to={RoutePath.forgotPassword}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={form.isSubmitting}>
          {form.isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>
    </AuthLayout>
  );
}
