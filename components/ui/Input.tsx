import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:       string;
  helperText?:  string;
  errorText?:   string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, errorText, wrapperClassName, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full font-body text-sm text-ink placeholder:text-leather-light/70",
            "bg-parchment/60 border border-border px-3.5 py-2.5 outline-none",
            "focus:border-brass focus:ring-1 focus:ring-brass/40 transition-colors",
            errorText && "border-crimson focus:border-crimson focus:ring-crimson/30",
            className
          )}
          {...props}
        />
        {errorText ? (
          <p className="text-2xs text-crimson font-body">{errorText}</p>
        ) : helperText ? (
          <p className="text-2xs text-leather-light font-body">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
