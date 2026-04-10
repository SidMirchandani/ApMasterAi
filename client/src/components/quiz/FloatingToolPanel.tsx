import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResizeCorner = "nw" | "ne" | "sw" | "se";

interface FloatingToolPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  /** Extra class on outer panel (e.g. shadow) */
  className?: string;
}

const CORNER_GRIP_CLASS =
  "absolute z-[55] h-6 w-6 touch-none select-none bg-slate-500 dark:bg-slate-600";

/** Opaque clip-path triangles + corner highlight (gradient clips with shape; avoids box-shadow clipped by clip-path). */
const CORNER_GRIP_VISUAL: Record<
  ResizeCorner,
  { clipPath: string; backgroundImage: string }
> = {
  nw: {
    clipPath: "polygon(0 0, 100% 0, 0 100%)",
    backgroundImage:
      "linear-gradient(to bottom right, rgb(255 255 255 / 0.2), transparent 52%)",
  },
  ne: {
    clipPath: "polygon(100% 0, 100% 100%, 0 0)",
    backgroundImage:
      "linear-gradient(to bottom left, rgb(255 255 255 / 0.2), transparent 52%)",
  },
  sw: {
    clipPath: "polygon(0 0, 0 100%, 100% 100%)",
    backgroundImage:
      "linear-gradient(to top right, rgb(255 255 255 / 0.2), transparent 52%)",
  },
  se: {
    clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
    backgroundImage:
      "linear-gradient(to top left, rgb(255 255 255 / 0.2), transparent 52%)",
  },
};

export function FloatingToolPanel({
  open,
  onOpenChange,
  title,
  children,
  defaultWidth = 560,
  defaultHeight = 480,
  minWidth = 320,
  minHeight = 220,
  className,
}: FloatingToolPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 48, y: 72 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const prevOpen = useRef(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{
    corner: ResizeCorner;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const sizeRef = useRef(size);
  const positionRef = useRef(position);
  sizeRef.current = size;
  positionRef.current = position;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && !prevOpen.current && typeof window !== "undefined") {
      const w = Math.min(defaultWidth, window.innerWidth - 32);
      const h = Math.min(defaultHeight, window.innerHeight - 48);
      setSize({ w: Math.max(minWidth, w), h: Math.max(minHeight, h) });
      setPosition({
        x: Math.max(16, (window.innerWidth - w) / 2),
        y: Math.max(16, (window.innerHeight - h) / 2),
      });
    }
    prevOpen.current = open;
  }, [open, defaultWidth, defaultHeight, minWidth, minHeight]);

  const clampPosition = useCallback(
    (x: number, y: number, w: number, h: number) => {
      if (typeof window === "undefined") return { x, y };
      const maxX = Math.max(16, window.innerWidth - w - 8);
      const maxY = Math.max(16, window.innerHeight - h - 8);
      return {
        x: Math.min(Math.max(8, x), maxX),
        y: Math.min(Math.max(8, y), maxY),
      };
    },
    [],
  );

  const clampSize = useCallback(
    (w: number, h: number) => {
      if (typeof window === "undefined") {
        return {
          w: Math.max(minWidth, w),
          h: Math.max(minHeight, h),
        };
      }
      return {
        w: Math.max(minWidth, Math.min(w, window.innerWidth - 16)),
        h: Math.max(minHeight, Math.min(h, window.innerHeight - 16)),
      };
    },
    [minWidth, minHeight],
  );

  useEffect(() => {
    if (!open) return;

    const onMove = (e: PointerEvent) => {
      if (dragRef.current) {
        const nx = e.clientX - dragRef.current.dx;
        const ny = e.clientY - dragRef.current.dy;
        const { w, h } = sizeRef.current;
        setPosition(clampPosition(nx, ny, w, h));
      }
      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.startPointerX;
        const dy = e.clientY - r.startPointerY;
        let w = r.startW;
        let h = r.startH;

        switch (r.corner) {
          case "se":
            w = r.startW + dx;
            h = r.startH + dy;
            break;
          case "sw":
            w = r.startW - dx;
            h = r.startH + dy;
            break;
          case "ne":
            w = r.startW + dx;
            h = r.startH - dy;
            break;
          case "nw":
            w = r.startW - dx;
            h = r.startH - dy;
            break;
        }

        const clamped = clampSize(w, h);
        w = clamped.w;
        h = clamped.h;

        const right = r.startX + r.startW;
        const bottom = r.startY + r.startH;
        let x = r.startX;
        let y = r.startY;
        if (r.corner === "sw" || r.corner === "nw") {
          x = right - w;
        }
        if (r.corner === "ne" || r.corner === "nw") {
          y = bottom - h;
        }

        const pos = clampPosition(x, y, w, h);
        setPosition(pos);
        setSize({ w, h });
      }
    };

    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [open, clampPosition, clampSize]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const pos = positionRef.current;
    dragRef.current = {
      dx: e.clientX - pos.x,
      dy: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onResizePointerDown = (e: React.PointerEvent, corner: ResizeCorner) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = positionRef.current;
    const sz = sizeRef.current;
    resizeRef.current = {
      corner,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startX: pos.x,
      startY: pos.y,
      startW: sz.w,
      startH: sz.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  if (!open || !mounted) return null;

  const panel = (
    <div
      className={cn(
        "fixed flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
        "z-[100]",
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100vh - 16px)",
      }}
    >
      <div
        className="relative z-50 flex shrink-0 cursor-move select-none items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80"
        onPointerDown={onHeaderPointerDown}
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative z-[70] h-8 w-8 shrink-0 cursor-pointer"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</div>
      {/* Corner resize grips — above header (z-50); close stays above NE grip (z-70) */}
      <div
        role="presentation"
        className={cn(CORNER_GRIP_CLASS, "left-0 top-0 cursor-nwse-resize rounded-tl-lg")}
        style={{
          clipPath: CORNER_GRIP_VISUAL.nw.clipPath,
          backgroundImage: CORNER_GRIP_VISUAL.nw.backgroundImage,
        }}
        onPointerDown={(e) => onResizePointerDown(e, "nw")}
        aria-label="Resize from top-left corner"
      />
      <div
        role="presentation"
        className={cn(CORNER_GRIP_CLASS, "right-0 top-0 cursor-nesw-resize rounded-tr-lg")}
        style={{
          clipPath: CORNER_GRIP_VISUAL.ne.clipPath,
          backgroundImage: CORNER_GRIP_VISUAL.ne.backgroundImage,
        }}
        onPointerDown={(e) => onResizePointerDown(e, "ne")}
        aria-label="Resize from top-right corner"
      />
      <div
        role="presentation"
        className={cn(CORNER_GRIP_CLASS, "bottom-0 left-0 cursor-nesw-resize rounded-bl-lg")}
        style={{
          clipPath: CORNER_GRIP_VISUAL.sw.clipPath,
          backgroundImage: CORNER_GRIP_VISUAL.sw.backgroundImage,
        }}
        onPointerDown={(e) => onResizePointerDown(e, "sw")}
        aria-label="Resize from bottom-left corner"
      />
      <div
        role="presentation"
        className={cn(CORNER_GRIP_CLASS, "bottom-0 right-0 cursor-nwse-resize rounded-br-lg")}
        style={{
          clipPath: CORNER_GRIP_VISUAL.se.clipPath,
          backgroundImage: CORNER_GRIP_VISUAL.se.backgroundImage,
        }}
        onPointerDown={(e) => onResizePointerDown(e, "se")}
        aria-label="Resize from bottom-right corner"
      />
    </div>
  );

  return createPortal(panel, document.body);
}
