import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t bg-background dark:border-zinc-800">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <p className="text-xs text-muted-foreground font-semibold">
            &copy; {new Date().getFullYear()} Eudora Platform. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground">
            Operational visibility and academic insight for modern educational centers.
          </p>
        </div>
      </div>
    </footer>
  )
}
