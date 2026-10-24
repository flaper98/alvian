'use client';

import { PHONE_HINT, PHONE_PATTERN, keepDigits } from '@/lib/customer-validation';

/** Celular del seguimiento: solo números (también al pegar), máximo 9. */
export default function PhoneInput({ defaultValue }) {
  return (
    <input
      name="tel"
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      pattern={PHONE_PATTERN}
      title={PHONE_HINT}
      maxLength={9}
      placeholder="987654321"
      defaultValue={defaultValue}
      onInput={(event) => keepDigits(event, 9)}
      required
    />
  );
}
