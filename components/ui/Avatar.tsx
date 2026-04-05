import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string | null;
  name?: string | null;
  className?: string;
}

export function Avatar({ src, alt, name, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.55)]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? name ?? "User avatar"} className="size-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
