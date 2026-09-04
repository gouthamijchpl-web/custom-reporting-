import { useCallback, useState } from 'react';
import { settingsApi } from '@/api';
import { LogoutIcon, ShieldIcon } from '@/components/icons';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  FormField,
  PasswordInput,
} from '@/components/ui';
import { useAuth, useForm } from '@/hooks';
import { validateNewPassword, validatePasswordConfirmation, validateRequired } from '@/utils/validation';
import type { FormErrors } from '@/hooks';
import './SettingsSections.css';

interface PasswordFormValues extends Record<string, unknown> {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_VALUES: PasswordFormValues = {
  currentPassword: '',
  password: '',
  confirmPassword: '',
};

function validate(values: PasswordFormValues): FormErrors<PasswordFormValues> {
  return {
    currentPassword: validateRequired(values.currentPassword, 'Your current password'),
    password: validateNewPassword(values.password),
    confirmPassword: validatePasswordConfirmation(values.password, values.confirmPassword),
  };
}

/**
 * Security controls: changing the password and signing out.
 *
 * Changing the password ends every session on the server, so this screen signs the user
 * out locally too rather than leaving the interface in a state its token no longer backs.
 */
export function SecuritySection() {
  const { logout } = useAuth();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChangePassword = useCallback(
    async (values: PasswordFormValues) => {
      setSuccessMessage(null);
      const response = await settingsApi.changePassword({
        currentPassword: values.currentPassword,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      setSuccessMessage(response.message);

      // Give the confirmation a moment to be read before the redirect to login.
      window.setTimeout(() => void logout(), 2000);
    },
    [logout],
  );

  const form = useForm<PasswordFormValues>({
    initialValues: INITIAL_VALUES,
    validate,
    onSubmit: handleChangePassword,
    // The typed passwords must not linger on screen once the change goes through.
    resetOnSuccess: true,
  });

  const fieldError = (field: keyof PasswordFormValues & string) =>
    form.touched[field] ? form.errors[field] : undefined;

  const handleLogout = useCallback(() => {
    setIsLoggingOut(true);
    void logout().finally(() => {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    });
  }, [logout]);

  return (
    <>
      <div className="settings-security-layout">
      <Card>
        <CardHeader
          icon={<ShieldIcon size={18} />}
          title="Change password"
          description="Choose a new password for this account."
        />

        <form onSubmit={form.handleSubmit} autoComplete="off" noValidate>
          <CardBody className="settings-section__body">
            {form.formError && <Alert variant="danger">{form.formError}</Alert>}
            {successMessage && (
              <Alert variant="success" title="Password updated">
                {successMessage}
              </Alert>
            )}

            <div className="settings-section__grid settings-section__grid--password">
              <FormField
                htmlFor="current-password"
                label="Current password"
                error={fieldError('currentPassword')}
                required
              >
                <PasswordInput
                  id="current-password"
                  name="currentPassword"
                  autoComplete="off"
                  value={form.values.currentPassword}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  invalid={Boolean(fieldError('currentPassword'))}
                  disabled={form.isSubmitting}
                />
              </FormField>

              <FormField
                htmlFor="new-password"
                label="New password"
                error={fieldError('password')}
                hint="10–15 characters, with an uppercase letter, a lowercase letter and a number."
                required
              >
                <PasswordInput
                  id="new-password"
                  name="password"
                  autoComplete="off"
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
                htmlFor="confirm-new-password"
                label="Confirm new password"
                error={fieldError('confirmPassword')}
                required
              >
                <PasswordInput
                  id="confirm-new-password"
                  name="confirmPassword"
                  autoComplete="off"
                  value={form.values.confirmPassword}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  invalid={Boolean(fieldError('confirmPassword'))}
                  disabled={form.isSubmitting}
                  maxLength={15}
                />
              </FormField>
            </div>

            <Alert variant="info">
              Changing your password signs you out everywhere, including this device.
            </Alert>
          </CardBody>

          <CardFooter>
            <Button type="submit" isLoading={form.isSubmitting}>
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader
          icon={<LogoutIcon size={18} />}
          title="Sign out"
          description="End this session on this device."
        />

        <CardBody className="settings-section__body">
          <p className="settings-section__note">
            You will be returned to the login screen. Any other devices you are signed in on stay
            signed in.
          </p>
        </CardBody>

        <CardFooter>
          <Button variant="danger" onClick={() => setIsLogoutDialogOpen(true)}>
            Logout from account
          </Button>
        </CardFooter>
      </Card>
      </div>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Log out?"
        message="You will need to sign in again to get back to your workspace."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        isDestructive
        isConfirming={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutDialogOpen(false)}
      />
    </>
  );
}
