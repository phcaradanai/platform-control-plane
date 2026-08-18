import { cloneElement, useId } from 'react';
import type {
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from 'react';

import { cn } from '../../lib/cn.js';
import { Label } from '../ui/label.js';

export interface FormPageProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
}

/** Form rhythm and action placement; fields and validation remain product-owned. */
export function FormPage({
  children,
  actions,
  status,
  className,
  ...props
}: FormPageProps) {
  return (
    <form className={cn('min-w-0', className)} {...props}>
      <div className="grid gap-8">{children}</div>
      {status ? (
        <div className="mt-6 text-sm" aria-live="polite">
          {status}
        </div>
      ) : null}
      {actions ? (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
          {actions}
        </div>
      ) : null}
    </form>
  );
}

export interface FormSectionProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

/** Fieldset/legend grouping that keeps long and short forms equally legible. */
export function FormSection({
  title,
  description,
  children,
  className,
  ...props
}: FormSectionProps) {
  const descriptionId = useId();

  return (
    <fieldset className={cn('min-w-0 space-y-5', className)} {...props}>
      <legend className="text-lg font-semibold tracking-tight">{title}</legend>
      {description ? (
        <p
          id={descriptionId}
          className="max-w-2xl text-sm leading-6 text-muted-foreground"
        >
          {description}
        </p>
      ) : null}
      <div className="grid gap-5">{children}</div>
    </fieldset>
  );
}

interface FieldControlProps {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  'aria-required'?: boolean | 'false' | 'true';
}

export interface FormFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  id: string;
  label: ReactNode;
  control: ReactElement<FieldControlProps>;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
}

/** Label, help, error, and control wiring for one form field. */
export function FormField({
  id,
  label,
  control,
  description,
  error,
  required = false,
  className,
  ...props
}: FormFieldProps) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const existingControlProps = control.props;
  const describedBy = [
    existingControlProps['aria-describedby'],
    description ? descriptionId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const controlId = existingControlProps.id ?? id;

  const enhancedControl = cloneElement(control, {
    id: controlId,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : existingControlProps['aria-invalid'],
    'aria-required': required ? true : existingControlProps['aria-required'],
    required: required || existingControlProps.required,
  });

  return (
    <div className={cn('grid gap-2', className)} {...props}>
      <Label htmlFor={controlId}>
        {label}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {description ? (
        <p
          id={descriptionId}
          className="text-sm leading-5 text-muted-foreground"
        >
          {description}
        </p>
      ) : null}
      {enhancedControl}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
