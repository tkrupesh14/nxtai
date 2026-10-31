import * as React from "react"

import { cn } from "@/lib/utils"

function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-orientation="horizontal"
      role="none"
      data-slot="separator"
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
