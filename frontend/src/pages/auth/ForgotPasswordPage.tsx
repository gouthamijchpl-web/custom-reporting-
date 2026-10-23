import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, authApi } from '@/api';
import { Alert, Button, FormField, PasswordInput, TextInput } from '@/components/ui';
import { useForm } from '@/hooks';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RoutePath } from '@/routes/paths';
import { validateEmail, validateNewPassword, validatePasswordConfirmation } from '@/utils/validation';
import type { FormErrors } from '@/hooks';
import './AuthForms.css';

interface ForgotPasswordFormValues extends Record<string, unknown> {
  email: string;
  password: string;
  confirmPassword: string;
}

const GENERIC_FAILURE = 'Unable to create the password. Check the information and try again.';

function validate(values: ForgotPasswordFormValues): FormErrors<ForgotPasswordFormValues> {
  const passwordPolicyError = validateNewPassword(values.password);
  return {
    email: validateEmail(values.email),
    password:
      values.password.length === 0
        ? 'New password is required.'
        : passwordPolicyError
          ? 'Password does not meet the required security rules.'
          : undefined,
    confirmPassword:
      values.confirmPassword.length === 0
        ? 'Please confirm your new password.'
        : validatePasswordConfirmation(values.password, values.confirmPassword),
  };
}

/** Prototype-only password recovery performed entirely inside the authentication UI. */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = useCallback(async (values: ForgotPasswordFormValues) => {
    try {
      await authApi.forgotPassword({
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setIsComplete(true);
    } catch (error) {
      if (error instanceof ApiError && error.isValidationError) {
        throw error;
      }
      if (error instanceof ApiError && error.status > 0 && error.status < 500) {
        throw new ApiError(error.status, error.code, GENERIC_FAILURE);
      }
      throw new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    }
  }, []);

  const form = useForm<ForgotPasswordFormValues>({
    initialValues: { email: '', password: '', confirmPassword: '' },
    validate,
    onSubmit: handleSubmit,
  });

  const fieldError = (field: keyof ForgotPasswordFormValues & string) =>
    form.touched[field] ? form.errors[field] : undefined;

  const loginLink = (
    <Link className="auth-form__link" to={RoutePath.login}>
      Back to Login
    </Link>
  );

  if (isComplete) {
    return (
      <AuthLayout
        title="Password created successfully"
        subtitle="Your password has been changed successfully."
        footer={loginLink}
      >
        <div className="auth-form__outcome">
          <Alert variant="success" title="Password created successfully">
            You can now sign in using your new password.
          </Alert>
          <Button
            size="lg"
            fullWidth
            onClick={() => navigate(RoutePath.login, { replace: true, state: { passwordReset: true } })}
          >
            Back to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create a new password"
      subtitle="Enter your email address and create a new password."
      footer={loginLink}
    >
      <form className="auth-form" onSubmit={form.handleSubmit} autoComplete="off" noValidate>
        {form.formError && <Alert variant="danger">{form.formError}</Alert>}

        <FormField htmlFor="forgot-email" label="Email address" error={fieldError('email')} required>
          <TextInput
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="user@company.com"
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('email'))}
            disabled={form.isSubmitting}
            maxLength={254}
            autoFocus
          />
        </FormField>

        <FormField
          htmlFor="forgot-password"
          label="New password"
          error={fieldError('password')}
          hint="10-15 characters with uppercase, lowercase, and numbers."
          required
        >
          <PasswordInput
            id="forgot-password"
            name="password"
            autoComplete="off"
            placeholder="Create a new password"
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
          htmlFor="forgot-confirm-password"
          label="Confirm new password"
          error={fieldError('confirmPassword')}
          required
        >
          <PasswordInput
            id="forgot-confirm-password"
            name="confirmPassword"
            autoComplete="off"
            placeholder="Re-enter your new password"
            value={form.values.confirmPassword}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('confirmPassword'))}
            disabled={form.isSubmitting}
            maxLength={15}
          />
        </FormField>

        <Button type="submit" size="lg" fullWidth isLoading={form.isSubmitting}>
          {form.isSubmitting ? 'Creating...' : 'Create'}
        </Button>
      </form>
    </AuthLayout>
  );
}
