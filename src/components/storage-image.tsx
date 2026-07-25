import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/storage";

export function useResolvedImage(src?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUrl(null);
    resolveImageUrl(src).then((next) => { if (active) setUrl(next); });
    return () => { active = false; };
  }, [src]);
  return url;
}

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallback?: React.ReactNode;
};

/** Image that transparently signs Supabase Storage URLs (private buckets). */
export function StorageImage({ src, fallback = null, alt = "", ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = useResolvedImage(src);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <>{fallback}</>;
  if (!resolved) return <div aria-hidden className="h-full w-full animate-pulse bg-muted" />;
  return <img src={resolved} alt={alt} onError={() => setFailed(true)} {...rest} />;
}
