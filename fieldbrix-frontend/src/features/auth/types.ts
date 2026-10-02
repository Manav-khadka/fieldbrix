import type { FormEvent } from "react";

export interface LoginProps {
  identifier: string;
  password: string;
  setIdentifier: (value: string) => void;
  setPassword: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  error: string;
  busy: boolean;
  onForgot: (identifier: string) => Promise<void>;
}
