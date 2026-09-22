import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { Input } from "../ui/primitives";

type PasswordFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
};

/** Password input with a reveal toggle — fewer typos, fewer failed sign-ins. */
export default function PasswordField({
  id,
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
  minLength,
  required = true,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
        <Lock className="h-4 w-4 text-fg-subtle" />
      </div>
      <Input
        id={id}
        name={id}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        className="h-11 pr-11 pl-10"
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-fg-subtle hover:text-fg"
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
