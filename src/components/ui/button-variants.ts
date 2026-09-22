import { cva } from "class-variance-authority";

/**
 * Button styles, driven entirely by the design tokens.
 *
 * Kept in its own module so `button.tsx` exports only a component, which is
 * what lets Fast Refresh update the button without remounting the tree.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-sm hover:bg-accent-strong",
        gradient: "bg-brand-gradient text-white shadow-md shadow-accent/20 hover:opacity-90",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3",
        outline: "border border-line bg-surface text-fg hover:bg-surface-2",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        danger: "bg-danger text-white hover:opacity-90",
        "danger-soft": "bg-danger/10 text-danger hover:bg-danger/15",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-lg",
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-xs": "h-7 w-7 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);
