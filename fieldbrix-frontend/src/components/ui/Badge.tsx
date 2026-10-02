import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "purple";
  size?: "xs" | "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "sm",
  dot = false,
  pulse = false,
  children,
  className = "",
  ...props
}) => {
  const baseClass = "fb-badge";
  const variantClass = `fb-badge-${variant}`;
  const sizeClass = `fb-badge-${size}`;

  return (
    <span
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`fb-badge-dot ${pulse ? "fb-badge-dot-pulse" : ""}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
