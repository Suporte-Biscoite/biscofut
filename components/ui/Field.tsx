import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Campos do formulário.
 *
 * Acessibilidade não é enfeite aqui: os formulários coletam CPF e senha, e
 * vão ser preenchidos no celular. Por isso cada
 * campo tem label real (não placeholder no lugar de label), erro ligado ao
 * input por aria-describedby, e aria-invalid — leitor de tela anuncia o erro
 * em vez do usuário descobrir por eliminação.
 */

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-black uppercase tracking-label text-steel"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink/50">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  error?: string;
  /** Marque quando o Field que envolve este input tiver `hint`, para o
   *  aria-describedby apontar para a dica. */
  hasHint?: boolean;
};

export function Input({ id, error, hasHint, className = "", ...rest }: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : hasHint ? `${id}-hint` : undefined}
      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink/35 ${
        error ? "border-alert" : "border-line focus:border-steel"
      } ${className}`}
      {...rest}
    />
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-relaxed text-ink/75">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-line accent-navy"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 pl-[30px] text-xs font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
