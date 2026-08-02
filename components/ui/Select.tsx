import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, wrapperClassName, id, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label htmlFor={selectId} className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full font-body text-sm text-ink",
            "bg-parchment/60 border border-border px-3.5 py-2.5 outline-none",
            "focus:border-brass focus:ring-1 focus:ring-brass/40 transition-colors",
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";
