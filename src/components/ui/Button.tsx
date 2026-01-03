import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = "left",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2 font-semibold
    rounded-full transition-all duration-250 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
    touch-manipulation select-none
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-indigo-600 to-indigo-500 text-white
      hover:from-indigo-700 hover:to-indigo-600
      active:from-indigo-800 active:to-indigo-700
      shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
    `,
    secondary: `
      bg-gradient-to-r from-pink-600 to-pink-500 text-white
      hover:from-pink-700 hover:to-pink-600
      active:from-pink-800 active:to-pink-700
      shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40
    `,
    accent: `
      bg-gradient-to-r from-teal-600 to-teal-500 text-white
      hover:from-teal-700 hover:to-teal-600
      active:from-teal-800 active:to-teal-700
      shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40
    `,
    ghost: `
      bg-white/90 backdrop-blur-sm text-slate-700 border border-slate-200
      hover:bg-white hover:border-slate-300 hover:shadow-md
      active:bg-slate-50
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-500 text-white
      hover:from-red-700 hover:to-red-600
      active:from-red-800 active:to-red-700
      shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40
    `,
  };

  const sizes = {
    sm: "px-4 py-2 text-sm min-h-[36px]",
    md: "px-6 py-3 text-base min-h-[44px]",
    lg: "px-8 py-4 text-lg min-h-[52px]",
    xl: "px-10 py-5 text-xl min-h-[60px]",
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-inherit">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
        </div>
      )}

      <div className={`flex items-center gap-2 ${loading ? "opacity-0" : "opacity-100"}`}>
        {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
      </div>
    </button>
  );
}
