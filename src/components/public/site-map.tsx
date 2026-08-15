import { useSettings } from "@/lib/currency";

const DEFAULT_LAT = -1.6602694;
const DEFAULT_LNG = 29.2329362;

export const DEFAULT_MAPS_LINK =
  "https://www.google.com/maps/place/CONETEC/@-1.6602694,29.2329362,17z/data=!3m1!4b1!4m6!3m5!1s0x19dd0700216e9405:0xe8ad95d11188fb1a!8m2!3d-1.6602694!4d29.2329362!16s%2Fg%2F11zds3hsjh";

/** @deprecated use useMapConfig().link */
export const MAPS_LINK = DEFAULT_MAPS_LINK;

/** Extracts coordinates from a pasted Google Maps URL. */
export function parseMapsLink(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|center|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

export function useMapConfig() {
  const { data } = useSettings();
  const s = (data ?? {}) as Record<string, any>;
  const link: string = s.extras?.map_url || DEFAULT_MAPS_LINK;
  const parsed = parseMapsLink(link);
  const lat = Number.isFinite(Number(s.map_lat)) && s.map_lat != null ? Number(s.map_lat) : parsed?.lat ?? DEFAULT_LAT;
  const lng = Number.isFinite(Number(s.map_lng)) && s.map_lng != null ? Number(s.map_lng) : parsed?.lng ?? DEFAULT_LNG;
  return { link, lat: parsed?.lat ?? lat, lng: parsed?.lng ?? lng };
}

export function SiteMap({ className = "", height = 340 }: { className?: string; height?: number }) {
  const { lat, lng } = useMapConfig();
  return (
    <div className={`overflow-hidden rounded-xl border ${className}`}>
      <iframe
        title="Localisation sur Google Maps"
        src={`https://www.google.com/maps?q=${lat},${lng}&hl=fr&z=18&output=embed`}
        width="100%"
        height={height}
        loading="lazy"
        style={{ border: 0, display: "block" }}
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
