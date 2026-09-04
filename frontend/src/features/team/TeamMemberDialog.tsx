import { useCallback, useMemo } from 'react';
import { teamApi } from '@/api';
import { Alert, Button, FormField, Modal, Select, TextInput } from '@/components/ui';
import { useForm, useToast } from '@/hooks';
import { validateEmail, validateFullName } from '@/utils/validation';
import { ACCESS_STATUS_OPTIONS, ROLE_OPTIONS } from './options';
import { ROLE_DESCRIPTIONS } from '@/types';
import type { FormErrors } from '@/hooks';
import type { AccessStatus, Role, TeamMember } from '@/types';
import './TeamMemberDialog.css';

interface MemberFormValues extends Record<string, unknown> {
  fullName: string;
  email: string;
  role: Role;
  accessStatus: AccessStatus;
}

interface TeamMemberDialogProps {
  isOpen: boolean;
  /** The member being edited, or null to add someone new. */
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add or edit a team member.
 *
 * The email address is editable only when adding. It is the login identifier, so an
 * administrator changing it after the fact would silently move someone's ability to sign
 * in; a member changes their own address from the Account tab, where they are already
 * authenticated.
 */
export function TeamMemberDialog({ isOpen, member, onClose, onSaved }: TeamMemberDialogProps) {
  const toast = useToast();
  const isEditing = member !== null;

  const initialValues = useMemo<MemberFormValues>(
    () => ({
      fullName: member?.fullName ?? '',
      email: member?.email ?? '',
      role: member?.role ?? 'USER',
      accessStatus: member?.accessStatus ?? 'PENDING',
    }),
    [member],
  );

  const validate = useCallback(
    (values: MemberFormValues): FormErrors<MemberFormValues> => ({
      fullName: validateFullName(values.fullName),
      // Only validated when adding; when editing the field is read-only.
      email: isEditing ? undefined : validateEmail(values.email),
    }),
    [isEditing],
  );

  const handleSubmit = useCallback(
    async (values: MemberFormValues) => {
      if (isEditing) {
        await teamApi.update(member.id, {
          fullName: values.fullName.trim(),
          role: values.role,
          accessStatus: values.accessStatus,
        });
        toast.success('User access updated successfully.');
      } else {
        await teamApi.create({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          role: values.role,
          accessStatus: values.accessStatus,
        });
        toast.success('User added successfully.');
      }

      onSaved();
      onClose();
    },
    [isEditing, member, onClose, onSaved, toast],
  );

  const form = useForm<MemberFormValues>({ initialValues, validate, onSubmit: handleSubmit });

  const fieldError = (field: keyof MemberFormValues & string) =>
    form.touched[field] ? form.errors[field] : undefined;

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      title={isEditing ? 'Edit user' : 'Add user'}
      description={
        isEditing
          ? 'Update this person’s name, role and access to the application.'
          : 'Add someone to the team. They set their own password by signing up with this email address.'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="team-member-form" isLoading={form.isSubmitting}>
            {isEditing ? 'Save changes' : 'Add User'}
          </Button>
        </>
      }
    >
      <form id="team-member-form" className="member-form" onSubmit={form.handleSubmit} autoComplete="off" noValidate>
        {form.formError && <Alert variant="danger">{form.formError}</Alert>}

        <FormField htmlFor="member-full-name" label="Full name" error={fieldError('fullName')} required>
          <TextInput
            id="member-full-name"
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

        <FormField
          htmlFor="member-email"
          label="Email address"
          error={fieldError('email')}
          hint={
            isEditing
              ? 'The email address is used to sign in and cannot be changed here.'
              : 'They will sign up with this address to set a password.'
          }
          required
        >
          <TextInput
            id="member-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="jane@company.com"
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            invalid={Boolean(fieldError('email'))}
            disabled={form.isSubmitting || isEditing}
            readOnly={isEditing}
          />
        </FormField>

        <div className="member-form__row">
          <FormField htmlFor="member-role" label="Role" hint={ROLE_DESCRIPTIONS[form.values.role]} required>
            <Select<Role>
              id="member-role"
              name="role"
              options={ROLE_OPTIONS}
              value={form.values.role}
              onValueChange={(role) => form.setValue('role', role)}
              disabled={form.isSubmitting}
              required
            />
          </FormField>

          <FormField
            htmlFor="member-access-status"
            label="Access status"
            hint={
              form.values.accessStatus === 'ACTIVE' && !member?.registered
                ? 'Stays Pending until this person signs up and sets a password.'
                : undefined
            }
            required
          >
            <Select<AccessStatus>
              id="member-access-status"
              name="accessStatus"
              options={ACCESS_STATUS_OPTIONS}
              value={form.values.accessStatus}
              onValueChange={(accessStatus) => form.setValue('accessStatus', accessStatus)}
              disabled={form.isSubmitting}
              required
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
