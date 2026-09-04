import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, FormField, PasswordInput, TextInput } from '@/components/ui';
import { useAuth, useForm } from '@/hooks';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RoutePath } from '@/routes/paths';
import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validatePasswordConfirmation,
} from '@/utils/validation';
import type { FormErrors } from '@/hooks';
import './AuthForms.css';

interface SignupFormValues extends Record<string, unknown> {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_VALUES: SignupFormValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function validate(values: SignupFormValues): FormErrors<SignupFormValues> {
  return {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
    confirmPassword: validatePasswordConfirmation(values.password, values.confirmPassword),
  };
}

/**
 * Account registration.
 *
 * On success the form is replaced by a confirmation panel rather than signing the user
 * straight in, so the new credentials are exercised once before they are relied on.
 */
export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleSignup = useCallback(
    async (values: SignupFormValues) => {
      const created = await signup({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setRegisteredEmail(created.email);
    },
    [signup],
  );

  const form = useForm<SignupFormValues>({
    initialValues: INITIAL_VALUES,
    validate,
    onSubmit: handleSignup,
  });

  const fieldError = (field: keyof SignupFormValues & string) =>
    form.touched[field] ? form.errors[field] : undefined;

  if (registeredEmail) {
    return (
      <AuthLayout
        title="Account created"
        subtitle="Your account is ready to use."
        footer={
          <>
            Already have an account?{' '}
            <Link className="auth-form__link" to={RoutePath.login}>
              Login
            </Link>
          </>
        }
      >
        <div className="auth-form__outcome">
          <Alert variant="success" title="Registration successful">
            <strong>{registeredEmail}</strong> can now sign in to Custom Reporting.
          </Alert>

          <Button size="lg" fullWidth onClick={() => navigate(RoutePath.login)}>
            Continue to login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up access to your reporting workspace."
      footer={
        <>
          Already have an account?{' '}
          <Link className="auth-form__link" to={RoutePath.login}>
            Login
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={form.handleSubmit} autoComplete="off" noValidate>
        {form.formError && <Alert variant="danger">{form.formError}</Alert>}

        <FormField htmlFor="fullName" label="Full name" error={fieldError('fullName')} required>
          <TextInput
            id="fullName"
            name="fullName"
            autoComplete="off"
            placeholder="Jane Cooper"
            value={form.values.fullName}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('fullName'))}
            disabled={form.isSubmitting}
            autoFocus
          />
        </FormField>

        <FormField htmlFor="signup-email" label="Email address" error={fieldError('email')} required>
          <TextInput
            id="signup-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="you@company.com"
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('email'))}
            disabled={form.isSubmitting}
          />
        </FormField>

        <FormField
          htmlFor="signup-password"
          label="Password"
          error={fieldError('password')}
          hint="10–15 characters, with an uppercase letter, a lowercase letter and a number."
          required
        >
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="off"
            placeholder="Create a password"
            value={form.values.password}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('password'))}
            disabled={form.isSubmitting}
            maxLength={15}
            showStrengthMeter
          />
        </FormField>

        <FormField
          htmlFor="confirmPassword"
          label="Confirm password"
          error={fieldError('confirmPassword')}
          required
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="off"
            placeholder="Re-enter your password"
            value={form.values.confirmPassword}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('confirmPassword'))}
            disabled={form.isSubmitting}
            maxLength={15}
          />
        </FormField>

        <Button type="submit" size="lg" fullWidth isLoading={form.isSubmitting}>
          {form.isSubmitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
