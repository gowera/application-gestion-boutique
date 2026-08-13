const LAT = -1.6603171;
const LNG = 29.2329823;

export const MAPS_LINK =
  "https://www.google.com/maps/place/conetec/@-1.6604983,29.2326544,20.49z/data=!4m6!3m5!1s0x19dd0717c014c7f9:0x74def3277a179dcc!8m2!3d-1.6603171!4d29.2329823!16s%2Fg%2F11h7fw953m";

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
