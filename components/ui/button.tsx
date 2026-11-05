import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const buttonVariants = cva("button", {
  variants: { variant: { primary: "button-primary", outline: "button-outline" } },
  defaultVariants: { variant: "primary" },
});

export function buttonStyles(variant?: "primary" | "outline") {
  return buttonVariants({ variant });
}

export function Button({
  variant, className, type = "button", ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button type={type} data-slot="button" className={buttonVariants({ variant, className })} {...props} />;
}
