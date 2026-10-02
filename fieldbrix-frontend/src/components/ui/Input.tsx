import React, { forwardRef } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      className = "",
      containerClassName = "",
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className={`fb-form-field ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="fb-form-label">
            {label}
            {required && <span className="fb-form-required">*</span>}
          </label>
        )}
        <div className={`fb-input-wrapper ${error ? "fb-input-error-state" : ""} ${disabled ? "fb-input-disabled-state" : ""}`}>
          {leftIcon && <div className="fb-input-icon-left">{leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={`fb-input ${leftIcon ? "fb-input-has-left" : ""} ${rightIcon ? "fb-input-has-right" : ""} ${className}`}
            {...props}
          />
          {rightIcon && <div className="fb-input-icon-right">{rightIcon}</div>}
        </div>
        {error ? (
          <p className="fb-form-error" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="fb-form-helper">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
