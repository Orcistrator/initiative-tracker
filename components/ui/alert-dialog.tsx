"use client";

import * as React from "react";

type AlertDialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(
  null
);

function useAlertDialog() {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) throw new Error("AlertDialog components must be used within AlertDialog");
  return ctx;
}

const AlertDialog = ({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const value = React.useMemo<AlertDialogContextValue>(
    () => ({ open: isOpen, onOpenChange: setIsOpen }),
    [isOpen, setIsOpen]
  );
  return (
    <AlertDialogContext.Provider value={value}>
      {children}
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useAlertDialog();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(true);
      }}
      {...props}
    />
  );
});
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogPortal = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const AlertDialogOverlay = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`fixed inset-0 z-50 bg-zinc-950/80 ${className ?? ""}`}
    {...props}
  />
);

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = useAlertDialog();
  if (!open) return null;
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay onClick={() => onOpenChange(false)} />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-lg ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className ?? ""}`}
    {...props}
  />
);

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className ?? ""}`}
    {...props}
  />
);

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold text-zinc-900 dark:text-zinc-100 ${className ?? ""}`}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-zinc-500 dark:text-zinc-400 ${className ?? ""}`}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useAlertDialog();
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus-visible:ring-zinc-500 ${className ?? ""}`}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    />
  );
});
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useAlertDialog();
  return (
    <button
      ref={ref}
      type="button"
      className={`mt-2 inline-flex h-9 items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 dark:focus-visible:ring-zinc-500 sm:mt-0 ${className ?? ""}`}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
