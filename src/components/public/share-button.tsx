import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Share2, Link2, MessageCircle, Mail, Facebook } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({
  title,
  text,
  className,
  variant = "outline",
  size = "lg",
  label = "Partager",
  url: urlProp,
}: {
  title: string;
  text?: string;
  className?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "lg" | "default" | "icon";
  label?: string;
  url?: string;
}) {
  const url = urlProp ?? (typeof window !== "undefined" ? window.location.href : "");
  const message = `${title}${text ? ` — ${text}` : ""}`;


  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: message, url });
        return true;
      } catch {
        return true;
      }
    }
    return false;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien du produit copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          title="Partager ce produit"
          onClick={async (e) => {
            if (await nativeShare()) e.preventDefault();
          }}
        >
          <Share2 className={size === "icon" ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          {size !== "icon" && label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copy}><Link2 className="mr-2 h-4 w-4" /> Copier le lien</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            <Facebook className="mr-2 h-4 w-4" /> Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message}\n${url}`)}`}>
            <Mail className="mr-2 h-4 w-4" /> E-mail
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
