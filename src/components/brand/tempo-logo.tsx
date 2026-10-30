/** Display the existing public logo without its transparent outer padding. */
export function TempoLogo({
  className = "h-auto w-24",
}: {
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label="Tempo"
      viewBox="189 70 488 148"
      width="488"
      height="148"
      className={className}
    >
      <image
        href="/Tempo_Logo_original.png"
        x="0"
        y="0"
        width="866"
        height="288"
      />
    </svg>
  );
}
