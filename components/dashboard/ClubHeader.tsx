import { describeZone, formatMonthYear, initials } from "@/lib/format";
import type { Club } from "@/lib/types";

export function ClubAvatar({ name, className = "size-12 text-base" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-count font-extrabold text-count-foreground ${className}`}
    >
      {initials(name)}
    </span>
  );
}

export function ClubHeader({ club, nowIso }: { club: Club; nowIso: string }) {
  const zone = describeZone(club.timeZone, nowIso);
  return (
    <div className="flex items-center gap-4">
      <ClubAvatar name={club.name} />
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-extrabold tracking-tight md:text-[28px]">{club.name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Club since {formatMonthYear(club.createdAt)} <span aria-hidden>•</span> Times in {zone.city} ({zone.offset}){" "}
          <span aria-hidden>•</span> Weeks run Mon–Sun
        </p>
      </div>
    </div>
  );
}
