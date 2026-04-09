import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const resizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
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
        const dw = e.clientX - resizeRef.current.x;
        const dh = e.clientY - resizeRef.current.y;
        const next = clampSize(resizeRef.current.w + dw, resizeRef.current.h + dh);
        setSize(next);
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

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sz = sizeRef.current;
    resizeRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: sz.w,
      h: sz.h,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
        className="flex shrink-0 cursor-move select-none items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80"
        onPointerDown={onHeaderPointerDown}
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 cursor-pointer"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <div
        className="absolute bottom-0 right-0 z-10 h-6 w-6 cursor-nwse-resize touch-none rounded-br-lg"
        onPointerDown={onResizePointerDown}
        aria-hidden
        title="Resize"
        style={{
          background: "linear-gradient(135deg, transparent 55%, rgb(148 163 184 / 0.75) 55%)",
        }}
      />
    </div>
  );

  return createPortal(panel, document.body);
}
