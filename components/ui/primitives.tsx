import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Button as ShadcnButton } from "./button";
import { Card as ShadcnCard } from "./card";

export function Button({ className, type = "button", ...props }: ComponentProps<typeof ShadcnButton>) {
  return <ShadcnButton type={type} className={cn("button", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<typeof ShadcnCard>) {
  return <ShadcnCard className={cn("card", className)} {...props} />;
}
