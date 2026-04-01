import { useAuthAwareImageSrc } from "@/hooks/useAuthAwareImageSrc";

type AuthProxiedImgProps = {
  src: string;
  alt: string;
  className?: string;
  /** When set (e.g. admin page ID token), used instead of client Firebase `getAuthHeaders()`. Empty = wait for token. */
  bearerToken?: string;
};

export function AuthProxiedImg({ src, alt, className, bearerToken }: AuthProxiedImgProps) {
  const { displaySrc, status } = useAuthAwareImageSrc(src, bearerToken);

  if (status === "loading") {
    return (
      <span className={`inline-block text-[10px] text-muted-foreground ${className ?? ""}`} aria-hidden>
        …
      </span>
    );
  }
  if (status === "error" || !displaySrc) {
    return (
      <span className={`inline-block text-[10px] text-muted-foreground ${className ?? ""}`} title="Image unavailable">
        —
      </span>
    );
  }

  return <img src={displaySrc} alt={alt} className={className} loading="lazy" />;
}
