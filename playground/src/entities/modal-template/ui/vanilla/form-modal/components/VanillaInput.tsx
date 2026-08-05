import type { ChangeEvent } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type VanillaInputProps = {
  readonly id?: string | undefined;
  readonly type?: 'text' | 'email' | 'password' | undefined;
  readonly value: string;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly error?: boolean | undefined;
  readonly placeholder?: string | undefined;
};

export function VanillaInput({
  id,
  type = 'text',
  value,
  onChange,
  error = false,
  placeholder,
}: VanillaInputProps) {
  const className = [styles['input'], error ? styles['error'] : ''].filter(Boolean).join(' ');

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
    />
  );
}
