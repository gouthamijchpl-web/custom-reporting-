import { useCallback, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ApiError } from '@/api';

export type FormErrors<TValues> = Partial<Record<keyof TValues & string, string>>;

export interface UseFormOptions<TValues extends Record<string, unknown>> {
  initialValues: TValues;
  /** Synchronous field validation run on submit and on blur. */
  validate?: (values: TValues) => FormErrors<TValues>;
  onSubmit: (values: TValues) => Promise<void>;
  /**
   * Clears the fields once the submission succeeds. Used by forms that should not leave
   * their input on screen afterwards, such as changing a password.
   */
  resetOnSuccess?: boolean;
}

export interface UseFormResult<TValues extends Record<string, unknown>> {
  values: TValues;
  errors: FormErrors<TValues>;
  touched: Partial<Record<keyof TValues & string, boolean>>;
  /** Error that applies to the whole form, such as "Incorrect email or password". */
  formError: string | null;
  isSubmitting: boolean;
  setValue: <TKey extends keyof TValues & string>(field: TKey, value: TValues[TKey]) => void;
  handleChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (event: { target: { name: string } }) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setFormError: (message: string | null) => void;
  reset: (values?: TValues) => void;
}

/**
 * Small form controller shared by every form in the application.
 *
 * It owns the parts that would otherwise be copied into each screen: field state, when to
 * show an error, the submitting flag that disables the button, and the translation of a
 * backend {@link ApiError} into per-field messages plus a form level message.
 */
export function useForm<TValues extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
  resetOnSuccess = false,
}: UseFormOptions<TValues>): UseFormResult<TValues> {
  type FieldName = keyof TValues & string;

  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors<TValues>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(<TKey extends FieldName>(field: TKey, value: TValues[TKey]) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the message as soon as the user starts fixing the field.
    setErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = event.target;
      const value =
        target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value;
      setValue(target.name as FieldName, value as TValues[FieldName]);
    },
    [setValue],
  );

  const handleBlur = useCallback(
    (event: { target: { name: string } }) => {
      const field = event.target.name as FieldName;
      setTouched((current) => ({ ...current, [field]: true }));

      if (!validate) {
        return;
      }
      const fieldError = validate(values)[field];
      setErrors((current) => ({ ...current, [field]: fieldError }));
    },
    [validate, values],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const validationErrors: FormErrors<TValues> = validate ? validate(values) : {};
      const invalidFields = Object.keys(validationErrors).filter(
        (field) => validationErrors[field as FieldName] !== undefined,
      );

      if (invalidFields.length > 0) {
        setErrors(validationErrors);
        setTouched(
          Object.fromEntries(Object.keys(values).map((field) => [field, true])) as Partial<
            Record<FieldName, boolean>
          >,
        );
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      void onSubmit(values)
        .then(() => {
          if (resetOnSuccess) {
            setValues(initialValues);
            setTouched({});
          }
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError) {
            const fieldMessages = error.toFieldMessages<FieldName>();
            const hasFieldMessages = Object.keys(fieldMessages).length > 0;

            if (hasFieldMessages) {
              setErrors(fieldMessages);
              setTouched(
                Object.fromEntries(Object.keys(values).map((field) => [field, true])) as Partial<
                  Record<FieldName, boolean>
                >,
              );
            }
            // Show the summary too unless the per-field messages already say it all.
            setFormError(hasFieldMessages ? null : error.message);
            return;
          }
          setFormError('Something went wrong. Please try again.');
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [initialValues, onSubmit, resetOnSuccess, validate, values],
  );

  const reset = useCallback(
    (nextValues?: TValues) => {
      setValues(nextValues ?? initialValues);
      setErrors({});
      setTouched({});
      setFormError(null);
      setIsSubmitting(false);
    },
    [initialValues],
  );

  return {
    values,
    errors,
    touched,
    formError,
    isSubmitting,
    setValue,
    handleChange,
    handleBlur,
    handleSubmit,
    setFormError,
    reset,
  };
}
