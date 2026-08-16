// Puffy cloud silhouette built from overlapping circles — no image asset
// needed. Tint with `text-*` and size with the className you pass in.
export function CloudShape({ className }: { className: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} aria-hidden="true">
      <div className="relative h-full w-full">
        <div className="absolute bottom-0 left-0 h-[45%] w-full rounded-full bg-current" />
        <div className="absolute bottom-0 left-[8%] h-[55%] w-[32%] rounded-full bg-current" />
        <div className="absolute bottom-0 left-[30%] h-[85%] w-[45%] rounded-full bg-current" />
        <div className="absolute right-[8%] bottom-0 h-[55%] w-[32%] rounded-full bg-current" />
      </div>
    </div>
  );
}
