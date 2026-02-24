import { Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="bg-slate-50 dark:bg-[#1a1d26] border-slate-200 dark:border-gray-700/50 hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-full shadow-sm transition-colors duration-300 focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-gray-600"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 text-amber-500" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 text-blue-400" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="bg-slate-50 dark:bg-[#13151c] border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-200 min-w-[8rem] rounded-xl shadow-lg shadow-black/5 dark:shadow-black/40 mt-1"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="focus:bg-slate-200 dark:focus:bg-[#1a1d26] focus:text-slate-900 dark:focus:text-white cursor-pointer rounded-lg m-1 transition-colors"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="focus:bg-slate-200 dark:focus:bg-[#1a1d26] focus:text-slate-900 dark:focus:text-white cursor-pointer rounded-lg m-1 transition-colors"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="focus:bg-slate-200 dark:focus:bg-[#1a1d26] focus:text-slate-900 dark:focus:text-white cursor-pointer rounded-lg m-1 transition-colors"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}