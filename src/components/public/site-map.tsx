const LAT = -1.6602694;
const LNG = 29.2329362;

export const MAPS_LINK =
  "https://www.google.com/maps/place/CONETEC/@-1.6602694,29.2329362,17z/data=!3m1!4b1!4m6!3m5!1s0x19dd0700216e9405:0xe8ad95d11188fb1a!8m2!3d-1.6602694!4d29.2329362!16s%2Fg%2F11zds3hsjh";


export function SiteMap({ className = "", height = 340 }: { className?: string; height?: number }) {
  return (
    <div className={`overflow-hidden rounded-xl border ${className}`}>
      <iframe
        title="Localisation CONETEC sur Google Maps"
        src={`https://www.google.com/maps?q=${LAT},${LNG}&hl=fr&z=18&output=embed`}
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
