export function Mark({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#12151c" />
      <ellipse cx="32" cy="33" rx="10.5" ry="21" fill="none" stroke="#d6b17a" strokeWidth="2.2" />
      <path d="M15.5 33h33" stroke="#f4efe6" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M32 10.2 34.3 12.7 32 14.8 29.7 12.7Z" fill="#f4efe6" />
    </svg>
  );
}
