import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <p className="text-muted-foreground text-xs font-semibold">
            &copy; {new Date().getFullYear()} Eudora Platform. All rights reserved.
          </p>
          <p className="text-muted-foreground text-[10px]">
            Operational visibility and academic insight for modern educational centers.
          </p>
        </div>
      </div>
    </footer>
  );
}
