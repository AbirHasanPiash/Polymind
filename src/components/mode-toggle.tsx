import { Check, Moon, Sun } from "lucide-react";

import { cn } from "../lib/utils";
import { useTheme, type Theme } from "./theme-context";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Change theme"
          className="rounded-full border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-200 dark:border-gray-700/50 dark:bg-[#1a1d26] dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {/* Both icons are always mounted and cross-fade with transform, so the
              swap cannot cause a layout shift in the header. */}
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-amber-500 transition-transform duration-200 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 text-blue-400 transition-transform duration-200 dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="mt-1 min-w-[9rem] rounded-xl border-slate-200 bg-slate-50 text-slate-700 shadow-lg dark:border-gray-800 dark:bg-[#13151c] dark:text-gray-200"
      >
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "m-1 cursor-pointer justify-between rounded-lg",
              "focus:bg-slate-200 focus:text-slate-900 dark:focus:bg-[#1a1d26] dark:focus:text-white",
            )}
          >
            {option.label}
            {theme === option.value && <Check className="h-3.5 w-3.5 text-blue-500" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
