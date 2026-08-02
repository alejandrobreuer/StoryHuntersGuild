import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, wrapperClassName, id, ...props }, ref) => {
    const generatedId = React.useId();
    const areaId = id ?? generatedId;
    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label htmlFor={areaId} className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={cn(
            "w-full font-body text-sm text-ink placeholder:text-leather-light/70",
            "bg-parchment/60 border border-border px-3.5 py-2.5 outline-none resize-none",
            "focus:border-brass focus:ring-1 focus:ring-brass/40 transition-colors",
            className
          )}
          {...props}
        />
        {helperText && <p className="text-2xs text-leather-light font-body">{helperText}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
