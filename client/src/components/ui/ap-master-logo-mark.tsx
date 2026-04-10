import Image from "next/image";

type ApMasterLogoMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function ApMasterLogoMark({
  size = 32,
  className,
  priority = false,
}: ApMasterLogoMarkProps) {
  return (
    <Image
      src="/apmaster-logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={["shrink-0 rounded-full object-cover", className].filter(Boolean).join(" ")}
    />
  );
}
