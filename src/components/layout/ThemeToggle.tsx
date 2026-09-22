import { Check, Monitor, Moon, Sun } from "lucide-react";

import { cn } from "../../lib/utils";
import { useTheme, type Theme } from "../theme-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change theme"
          className={cn(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg",
            className,
          )}
        >
          {/* Both icons are always mounted and cross-fade, so the swap cannot shift layout. */}
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-transform duration-200 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-transform duration-200 dark:rotate-0 dark:scale-100" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="surface-pop min-w-[10rem] rounded-xl p-1">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="cursor-pointer justify-between rounded-lg px-2.5 py-2 text-fg focus:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <option.icon className="h-4 w-4 text-fg-muted" />
              {option.label}
            </span>
            {theme === option.value && <Check className="h-3.5 w-3.5 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
