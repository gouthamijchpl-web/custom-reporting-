import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, ConfirmDialog, FormField, Modal, Switch, TextInput } from '@/components/ui';
import { useEntities, useForm } from '@/hooks';
import type { FormErrors } from '@/hooks';
import type { ReportingEntity } from '@/types';
import './EntityFormDialog.css';

interface EntityFormValues extends Record<string, unknown> {
  name: string;
  code: string;
  description: string;
  active: boolean;
}

const CODE_PATTERN = /^[A-Za-z0-9-]+$/;

function validate(values: EntityFormValues): FormErrors<EntityFormValues> {
  const name = values.name.trim();
  const code = values.code.trim();

  return {
    name: name.length > 120 ? 'Entity name must be 120 characters or fewer.' : undefined,
    code:
      code.length > 12
        ? 'Code must be 12 characters or fewer.'
        : code.length > 0 && !CODE_PATTERN.test(code)
          ? 'Code may only contain letters, numbers and hyphens.'
          : undefined,
    description:
      values.description.trim().length > 500 ? 'Description must be 500 characters or fewer.' : undefined,
  };
}

interface EntityFormDialogProps {
  isOpen: boolean;
  /** The entity being edited, or null to create a new one. */
  entity: ReportingEntity | null;
  onClose: () => void;
  onSaved?: (entity: ReportingEntity) => void;
}

/**
 * Create or edit an entity.
 *
 * One dialog serves both jobs: the fields are identical, and splitting them would mean
 * maintaining the same validation twice. Editing additionally offers deactivation and
 * deletion, the two actions that only make sense on something that already exists.
 */
export function EntityFormDialog({ isOpen, entity, onClose, onSaved }: EntityFormDialogProps) {
  const { create, update, remove } = useEntities();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isEditing = entity !== null;

  const initialValues = useMemo<EntityFormValues>(
    () => ({
      name: entity?.name ?? '',
      code: entity?.code ?? '',
      description: entity?.description ?? '',
      active: entity?.active ?? true,
    }),
    [entity],
  );

  const handleSubmit = useCallback(
    async (values: EntityFormValues) => {
      const payload = {
        groupId: entity?.groupId ?? null,
        primaryBranchName: '',
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        description: values.description.trim(),
        pan: entity?.pan ?? '',
        primaryGstin: entity?.primaryGstin ?? '',
        gstnUsername: entity?.gstnUsername ?? '',
        gstnPassword: '',
        tallyCompanyName: entity?.tallyCompanyName ?? '',
        tallyHost: entity?.tallyHost ?? 'localhost',
        tallyPort: entity?.tallyPort ?? 9000,
        active: values.active,
        multipleBranches: entity?.multipleBranches ?? false,
        eInvoiceEnabled: entity?.eInvoiceEnabled ?? false,
        eWayBillEnabled: entity?.eWayBillEnabled ?? false,
        stockEnabled: entity?.stockEnabled ?? false,
        costCentreExtractionEnabled: entity?.costCentreExtractionEnabled ?? false,
      };

      const saved = isEditing
        ? await update(entity.id, payload)
        : await create(payload);

      onSaved?.(saved);
      onClose();
    },
    [create, entity, isEditing, onClose, onSaved, update],
  );

  const form = useForm<EntityFormValues>({
    initialValues,
    validate,
    onSubmit: handleSubmit,
  });

  const fieldError = (field: keyof EntityFormValues & string) =>
    form.touched[field] ? form.errors[field] : undefined;

  const handleDelete = useCallback(() => {
    if (!entity) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);

    void remove(entity.id)
      .then(() => {
        setIsConfirmingDelete(false);
        onClose();
      })
      .catch(() => setDeleteError('Unable to delete this entity. Please try again.'))
      .finally(() => setIsDeleting(false));
  }, [entity, onClose, remove]);

  return (
    <>
      <Modal
        isOpen={isOpen && !isConfirmingDelete}
        size="md"
        title={isEditing ? 'Edit entity' : 'Add entity'}
        description={
          isEditing
            ? 'Update the details of this entity.'
            : 'Add a business you report on. You can switch between entities at any time.'
        }
        onClose={onClose}
        footer={
          <div className="entity-form__actions">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="entity-form__delete"
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete
              </Button>
            )}
            <div className="entity-form__actions-end">
              <Button type="button" variant="secondary" onClick={onClose} disabled={form.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" form="entity-form" isLoading={form.isSubmitting}>
                {isEditing ? 'Save changes' : 'Add entity'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="entity-form" className="entity-form" onSubmit={form.handleSubmit} autoComplete="off" noValidate>
          {form.formError && <Alert variant="danger">{form.formError}</Alert>}
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}

          <FormField htmlFor="entity-name" label="Entity name" error={fieldError('name')}>
            <TextInput
              id="entity-name"
              name="name"
              placeholder="Acme Private Limited"
              value={form.values.name}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              invalid={Boolean(fieldError('name'))}
              disabled={form.isSubmitting}
              autoFocus
            />
          </FormField>

          <FormField
            htmlFor="entity-code"
            label="Entity code"
            error={fieldError('code')}
            hint="Optional. Shown where the full name will not fit, for example ACME."
          >
            <TextInput
              id="entity-code"
              name="code"
              placeholder="ACME"
              maxLength={12}
              value={form.values.code}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              invalid={Boolean(fieldError('code'))}
              disabled={form.isSubmitting}
            />
          </FormField>

          <FormField
            htmlFor="entity-description"
            label="Description"
            error={fieldError('description')}
            hint="Optional. A note about what this entity covers."
          >
            <TextInput
              id="entity-description"
              name="description"
              placeholder="Primary trading company"
              maxLength={500}
              value={form.values.description}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              invalid={Boolean(fieldError('description'))}
              disabled={form.isSubmitting}
            />
          </FormField>

          {isEditing && (
            <div className="entity-form__switch">
              <Switch
                id="entity-active"
                label="Active"
                description="Inactive entities are kept on record but cannot be selected."
                checked={form.values.active}
                onChange={(checked) => form.setValue('active', checked)}
                disabled={form.isSubmitting}
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title={`Archive ${entity?.name ?? 'entity'}?`}
        message="The entity is archived while its historical relationships remain intact."
        confirmLabel="Archive entity"
        isDestructive
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  );
}
