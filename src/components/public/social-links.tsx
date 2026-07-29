import { Facebook, Instagram, Youtube, Music2 } from "lucide-react";
import { useSettings } from "@/lib/currency";

type Extras = Record<string, unknown>;

export type SocialPosition = "footer" | "header" | "both" | "none";

function extrasOf(settings: unknown): Extras {
  const e = (settings as Record<string, any> | undefined)?.extras;
  return e && typeof e === "object" ? (e as Extras) : {};
}

export function useSocialLinks() {
  const { data } = useSettings();
  const extras = extrasOf(data);
  const str = (k: string) => String(extras[k] ?? "").trim();
  const links = [
    { key: "facebook", label: "Facebook", href: str("social_facebook"), icon: Facebook },
    { key: "instagram", label: "Instagram", href: str("social_instagram"), icon: Instagram },
    { key: "tiktok", label: "TikTok", href: str("social_tiktok"), icon: Music2 },
    { key: "youtube", label: "YouTube", href: str("social_youtube"), icon: Youtube },
  ].filter((l) => !!l.href);
  const raw = String(extras.social_position ?? "footer");
  const position = (["footer", "header", "both", "none"].includes(raw) ? raw : "footer") as SocialPosition;
  return { links, position };
}

export function SocialLinks({ place, className = "" }: { place: "header" | "footer"; className?: string }) {
  const { links, position } = useSocialLinks();
  const visible = position === "both" || position === place;
  if (!visible || links.length === 0) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map(({ key, label, href, icon: Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="grid h-8 w-8 place-items-center rounded-full border border-current/20 transition-opacity hover:opacity-70"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
