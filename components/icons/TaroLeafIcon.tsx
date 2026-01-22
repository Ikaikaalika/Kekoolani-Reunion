export default function TaroLeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 6C20 6 10 16 10 28c0 13.5 10.7 25 22 30 11.3-5 22-16.5 22-30C54 16 44 6 32 6z"
        fill="currentColor"
      />
      <path
        d="M32 18c-6 0-10 5-10 10 0 8 6 15 10 17 4-2 10-9 10-17 0-5-4-10-10-10z"
        fill="white"
        fillOpacity="0.18"
      />
      <path d="M32 20v26" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
