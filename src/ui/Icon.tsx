/** Inline stroke icons — no dependency. 24x24 viewBox, currentColor. */
type Props = { name: string; size?: number; className?: string }

const P: Record<string, JSX.Element> = {
  drafting: (
    <>
      <path d="M12 3v18" />
      <path d="M5 21 12 3l7 18" />
      <path d="M7.5 15h9" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.1-2.1 2.6-2.6Z" />,
  pump: (
    <>
      <rect x="4" y="10" width="10" height="9" rx="1.5" />
      <path d="M14 13h4v6M9 10V6h4" />
      <circle cx="9" cy="14.5" r="1.6" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  signal: (
    <>
      <path d="M5 18a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0" />
      <circle cx="12" cy="19" r="1.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  pivot: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 12h8.5" />
    </>
  ),
  pipe: (
    <>
      <path d="M3 9h12a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3" />
      <path d="M3 9V6m0 3v3m12-3V6m0 3v3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  // UI
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="14" width="10" height="7" rx="1" />
    </>
  ),
  check: <path d="m5 12 5 5 9-11" />,
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </>
  ),
}

export function Icon({ name, size = 22, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name] ?? P.box}
    </svg>
  )
}
