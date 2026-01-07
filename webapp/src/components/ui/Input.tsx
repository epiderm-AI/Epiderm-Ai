import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const inputStyles = `
      w-full px-4 py-3 text-base
      bg-white border rounded-xl
      transition-all duration-250
      placeholder:text-slate-400
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50
      touch-manipulation
      min-h-[44px]
      ${leftIcon ? "pl-11" : ""}
      ${rightIcon ? "pr-11" : ""}
      ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
      }
      ${className}
    `;

    return (
      <div className={`${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputStyles}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-red-600 animate-fadeIn">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = "",
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const textareaStyles = `
      w-full px-4 py-3 text-base
      bg-white border rounded-xl
      transition-all duration-250
      placeholder:text-slate-400
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50
      touch-manipulation resize-y
      ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
      }
      ${className}
    `;

    return (
      <div className={`${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={textareaStyles}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-red-600 animate-fadeIn">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
