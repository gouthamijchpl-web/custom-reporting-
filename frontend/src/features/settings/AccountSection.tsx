import { useCallback, useState } from 'react';
import { settingsApi } from '@/api';
import { UserIcon } from '@/components/icons';
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, FormField, TextInput } from '@/components/ui';
import { useAuth, useForm } from '@/hooks';
import { formatDateTime } from '@/utils/formatters';
import { validateEmail, validateFullName } from '@/utils/validation';
import type { FormErrors } from '@/hooks';
import { ROLE_LABELS } from '@/types';
import type { AuthenticatedUser } from '@/types';
import './SettingsSections.css';

interface AccountFormValues extends Record<string, unknown> {
  fullName: string;
  email: string;
}

function validate(values: AccountFormValues): FormErrors<AccountFormValues> {
  return {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
  };
}

interface AccountSectionProps {
  user: AuthenticatedUser;
  /** Opens the Security section, where the password form lives. */
  onChangePassword: () => void;
}

/** Profile details the user can change: display name and login email address. */
export function AccountSection({ user, onChangePassword }: AccountSectionProps) {
  const { setUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = useCallback(
    async (values: AccountFormValues) => {
      setSuccessMessage(null);
      const updated = await settingsApi.updateAccount({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
      });
      setUser(updated);
      setSuccessMessage('Your account details have been saved.');
    },
    [setUser],
  );

  const form = useForm<AccountFormValues>({
    initialValues: { fullName: user.fullName, email: user.email },
    validate,
    onSubmit: handleSave,
  });

  const fieldError = (field: keyof AccountFormValues & string) =>
    form.touched[field] ? form.errors[field] : undefined;

  const isUnchanged =
    form.values.fullName.trim() === user.fullName && form.values.email.trim() === user.email;

  return (
    <Card>
      <CardHeader
        icon={<UserIcon size={18} />}
        title="Account"
        description="Your profile and sign-in identity."
      />

      <form onSubmit={form.handleSubmit} autoComplete="off" noValidate>
        <CardBody className="settings-section__body">
          {form.formError && <Alert variant="danger">{form.formError}</Alert>}
          {successMessage && (
            <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          <div className="settings-section__grid">
            <FormField htmlFor="account-full-name" label="Full name" error={fieldError('fullName')} required>
              <TextInput
                id="account-full-name"
                name="fullName"
                autoComplete="off"
                value={form.values.fullName}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                invalid={Boolean(fieldError('fullName'))}
                disabled={form.isSubmitting}
              />
            </FormField>

            <FormField
              htmlFor="account-email"
              label="Email address"
              error={fieldError('email')}
              hint="This address is also your sign-in username."
              required
            >
              <TextInput
                id="account-email"
                name="email"
                type="email"
                autoComplete="off"
                value={form.values.email}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                invalid={Boolean(fieldError('email'))}
                disabled={form.isSubmitting}
              />
            </FormField>
          </div>

          <dl className="settings-section__meta">
            <div className="settings-section__meta-item">
              <dt>Role</dt>
              <dd>{ROLE_LABELS[user.role]}</dd>
            </div>
            <div className="settings-section__meta-item">
              <dt>Member since</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
            </div>
            <div className="settings-section__meta-item">
              <dt>Last sign-in</dt>
              <dd>{formatDateTime(user.lastLoginAt)}</dd>
            </div>
          </dl>
        </CardBody>

        <CardFooter className="settings-section__footer">
          <Button type="button" variant="ghost" onClick={onChangePassword}>
            Change password
          </Button>
          <Button type="submit" isLoading={form.isSubmitting} disabled={isUnchanged}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
