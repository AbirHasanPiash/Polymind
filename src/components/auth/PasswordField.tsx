import { useState } from "react";
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";

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
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <LockClosedIcon className="h-5 w-5 text-slate-400 dark:text-gray-500" />
      </div>
      <input
        id={id}
        name={id}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-10 text-base text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none sm:text-sm dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-600"
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}
