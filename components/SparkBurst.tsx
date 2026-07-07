/** A brief radial spark shown on a correct answer (<500ms, non-blocking).
 * Purely decorative — sits absolutely over the feedback block. */
const ANGLES = ["0deg", "72deg", "144deg", "216deg", "288deg"];

export function SparkBurst() {
  return (
    <span
      aria-hidden
      data-testid="spark-burst"
      className="pointer-events-none absolute inset-0 z-10 overflow-visible text-emerald-300"
    >
      {ANGLES.map((a) => (
        <span key={a} className="spark-dot" style={{ ["--a" as string]: a }} />
      ))}
      <span className="spark-core absolute left-1/2 top-1/2 -ml-2 -mt-2 text-base">✨</span>
    </span>
  );
}
