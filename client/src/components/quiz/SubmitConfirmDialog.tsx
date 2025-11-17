
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubmitConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SubmitConfirmDialog({ isOpen, onClose, onConfirm }: SubmitConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Submit</AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-2">
            <p>Are you ready to submit your practice exam?</p>
            <p className="text-sm text-gray-600 italic">
              Note: On the actual exam day, there will not be a Submit option. You must wait for time to expire, at which point your responses will be automatically submitted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-end gap-2">
          <AlertDialogCancel className="bg-gray-200 hover:bg-gray-300 text-gray-800">
            No
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
