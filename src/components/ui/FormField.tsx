import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldWrapperProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldWrapper({
  id,
  label,
  error,
  hint,
  required,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
        {required ? (
          <span className="text-red-600 dark:text-red-400 ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_BASE =
  'w-full rounded-lg border bg-white dark:bg-[#0F172A] px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none';

const ERROR_BORDER = 'border-red-500 dark:border-red-500';
const NORMAL_BORDER = 'border-slate-200 dark:border-slate-700';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({
  id,
  label,
  error,
  hint,
  required,
  className = '',
  ...props
}: TextFieldProps) {
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${INPUT_BASE} h-9 ${error ? ERROR_BORDER : NORMAL_BORDER} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function TextareaField({
  id,
  label,
  error,
  hint,
  required,
  className = '',
  rows = 3,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${INPUT_BASE} py-2 leading-relaxed ${
          error ? ERROR_BORDER : NORMAL_BORDER
        } ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  options,
  className = '',
  ...props
}: SelectFieldProps) {
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${INPUT_BASE} h-9 ${error ? ERROR_BORDER : NORMAL_BORDER} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
