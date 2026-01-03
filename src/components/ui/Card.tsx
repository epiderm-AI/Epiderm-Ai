import React from "react";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "glass" | "gradient";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  onClick,
  hoverable = false,
  style,
}: CardProps) {
  const baseStyles = `
    rounded-2xl transition-all duration-250
    ${onClick || hoverable ? "cursor-pointer" : ""}
  `;

  const variants = {
    default: `
      bg-white border border-slate-200
      ${hoverable || onClick ? "hover:shadow-lg hover:border-slate-300 hover:-translate-y-1" : "shadow-md"}
    `,
    glass: `
      bg-white/70 backdrop-blur-md border border-white/20
      shadow-lg
      ${hoverable || onClick ? "hover:bg-white/80 hover:shadow-xl hover:-translate-y-1" : ""}
    `,
    gradient: `
      bg-gradient-to-br from-white via-indigo-50/30 to-pink-50/30
      border border-white/50 shadow-lg
      ${hoverable || onClick ? "hover:shadow-xl hover:-translate-y-1" : ""}
    `,
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CardTitle({ children, className = "", size = "md" }: CardTitleProps) {
  const sizes = {
    sm: "text-lg font-semibold",
    md: "text-xl font-semibold",
    lg: "text-2xl font-bold",
  };

  return (
    <h3 className={`text-slate-900 ${sizes[size]} ${className}`}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = "" }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-slate-600 mt-1 ${className}`}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-slate-200 ${className}`}>
      {children}
    </div>
  );
}
