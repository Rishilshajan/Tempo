"use client";
import { Tabs as Primitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;
export function TabsList({ className, ...props }: Primitive.List.Props) {
  return (
    <Primitive.List
      className={cn(
        "grid shrink-0 grid-cols-4 border-b border-border px-4",
        className,
      )}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: Primitive.Tab.Props) {
  return (
    <Primitive.Tab
      className={cn(
        "flex min-h-11 min-w-0 items-center justify-center gap-1 border-b-2 border-transparent px-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:border-primary data-active:font-medium data-active:text-primary",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: Primitive.Panel.Props) {
  return (
    <Primitive.Panel
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
