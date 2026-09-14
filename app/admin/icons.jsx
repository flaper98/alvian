function Base({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconHome(props) {
  return (
    <Base {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </Base>
  );
}

export function IconCart(props) {
  return (
    <Base {...props}>
      <path d="M6 8h12l-1.2 10.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Base>
  );
}

export function IconBottle(props) {
  return (
    <Base {...props}>
      <rect x="10" y="2" width="4" height="3" rx="0.5" />
      <path d="M10 5v2.4c0 .5-.2 1-.6 1.4L8 10.2c-.6.6-1 1.5-1 2.4V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6.4c0-.9-.4-1.8-1-2.4l-1.4-1.4c-.4-.4-.6-.9-.6-1.4V5" />
    </Base>
  );
}

export function IconLayers(props) {
  return (
    <Base {...props}>
      <rect x="5" y="15" width="14" height="3.5" rx="1" />
      <rect x="6.5" y="10.5" width="11" height="3.5" rx="1" />
      <rect x="8" y="6" width="8" height="3.5" rx="1" />
    </Base>
  );
}

export function IconReceipt(props) {
  return (
    <Base {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Base>
  );
}

export function IconCoin(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M9.5 9.7c0-1 .9-1.7 2.5-1.7s2.5.7 2.5 1.6c0 2.2-5 1-5 3.2 0 .9 1 1.6 2.5 1.6s2.5-.7 2.5-1.7" />
    </Base>
  );
}

export function IconClock(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Base>
  );
}

export function IconWallet(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 10h17" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconCheck(props) {
  return (
    <Base {...props}>
      <path d="M5 12.5 9.5 17 19 7" />
    </Base>
  );
}

export function IconUser(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    </Base>
  );
}
