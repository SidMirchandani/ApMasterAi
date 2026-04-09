import { FloatingToolPanel } from "./FloatingToolPanel";

interface ReferenceInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  title?: string;
}

export function ReferenceInformationDialog({
  open,
  onOpenChange,
  pdfUrl,
  title = "AP Biology — reference information",
}: ReferenceInformationDialogProps) {
  return (
    <FloatingToolPanel
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      defaultWidth={492}
      defaultHeight={432}
      minWidth={240}
      minHeight={168}
    >
      <iframe
        src={`${pdfUrl}#view=FitH`}
        className="h-full w-full border-0 bg-slate-100"
        title={title}
      />
    </FloatingToolPanel>
  );
}
