import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

/** Show "n/max" once the user is past ~70% of the limit. */
function Counter({ value, maxLength }: { value: string; maxLength?: number }) {
  if (!maxLength) return null
  const near = value.length >= maxLength * 0.7
  return (
    <div className={`field__count ${value.length >= maxLength ? 'field__count--max' : ''}`}>
      {near ? `${value.length}/${maxLength}` : ''}
    </div>
  )
}

export function Text({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <Field label={label}>
      <input value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      <Counter value={value} maxLength={maxLength} />
    </Field>
  )
}

export function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
}) {
  return (
    <Field label={label}>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      <Counter value={value} maxLength={maxLength} />
    </Field>
  )
}

export function Num({
  label,
  value,
  onChange,
  step = 1,
  min,
  prefix,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  prefix?: string
  suffix?: string
}) {
  return (
    <Field label={suffix ? `${label} (${suffix})` : prefix ? `${label} (${prefix})` : label}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </Field>
  )
}
