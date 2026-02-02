export default function TaroLeafIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="none"
    >
      {/* Main leaf shape – more realistic taro silhouette */}
      <path
        d="M32 4 
           C 22 4, 12 12, 10 24 
           C 8 34, 12 44, 18 50 
           C 22 54, 28 56, 32 56 
           C 36 56, 42 54, 46 50 
           C 52 44, 56 34, 54 24 
           C 52 12, 42 4, 32 4 Z
           M 32 12 
           L 32 52"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Basal lobes / arrowhead indent */}
      <path
        d="M26 18 
           C 22 22, 20 28, 22 34 
           M 38 18 
           C 42 22, 44 28, 42 34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Inner highlight / shine – softer gradient-like */}
      <path
        d="M32 8 
           C 24 8, 16 14, 14 26 
           C 13 36, 18 46, 24 50 
           C 27 52, 30 53, 32 53 
           C 34 53, 37 52, 40 50 
           C 46 46, 51 36, 50 26 
           C 48 14, 40 8, 32 8 Z"
        fill="white"
        fillOpacity="0.16"
      />

      {/* Central vein (prominent midrib) */}
      <path
        d="M32 10 L 32 54"
        stroke="white"
        strokeOpacity="0.65"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Secondary veins – radiating, slightly curved for natural look */}
      <g opacity="0.5" stroke="white" strokeWidth="1.4" strokeLinecap="round">
        <path d="M32 14 L 20 24" />
        <path d="M32 14 L 44 24" />
        <path d="M32 22 L 16 36" />
        <path d="M32 22 L 48 36" />
        <path d="M32 34 L 22 46" />
        <path d="M32 34 L 42 46" />
      </g>
    </svg>
  );
}