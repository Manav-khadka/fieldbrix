import React, { forwardRef } from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success"
    | "glass";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    const baseClass = "fb-btn";
    const variantClass = `fb-btn-${variant}`;
    const sizeClass = `fb-btn-${size}`;
    const widthClass = fullWidth ? "fb-btn-full" : "";
    const loadingClass = isLoading ? "fb-btn-loading" : "";

    const combinedClassName = [
      baseClass,
      variantClass,
      sizeClass,
      widthClass,
      loadingClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClassName}
        {...props}
      >
        {isLoading && (
          <span className="fb-spinner-inline" aria-hidden="true" />
        )}
        {!isLoading && leftIcon && (
          <span className="fb-btn-icon-left">{leftIcon}</span>
        )}
        <span className="fb-btn-text">{children}</span>
        {!isLoading && rightIcon && (
          <span className="fb-btn-icon-right">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
