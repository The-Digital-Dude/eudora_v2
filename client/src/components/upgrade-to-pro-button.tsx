"use client";

import { ArrowRight,Blocks, LayoutDashboard, Rocket } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent,HoverCardTrigger } from "@/components/ui/hover-card";

const SHADCN_BLOCKS_URL = "https://shadcnstore.com/blocks";

export function UpgradeToProButton() {
  return (
    <div className="fixed right-4 bottom-8 z-50 flex flex-col items-end gap-2 md:right-6 lg:right-8">
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Button
            size="lg"
            className="cursor-pointer bg-gradient-to-br from-slate-900 to-slate-400 px-6 py-3 font-bold text-white shadow-lg"
            style={{ minWidth: 180 }}
            onClick={() =>
              typeof window !== "undefined" && window.open(SHADCN_BLOCKS_URL, "_blank")
            }
          >
            Upgrade to Pro
            <Rocket size={30} className="ml-1" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="bg-background border-border animate-in fade-in slide-in-from-bottom-4 relative mr-4 mb-3 w-90 rounded-xl border p-3 shadow-2xl md:mr-6 lg:mr-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <a
              href={SHADCN_BLOCKS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <Image src="/hero-images-container.png" alt="shadcn" width={300} height={200} />
            </a>
            <h3 className="flex items-center gap-2 py-2 text-lg font-bold">
              <Rocket size={18} className="text-primary" />
              Unlock Premium Blocks
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs shadow">
                Live
              </Badge>
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Get access to exclusive premium blocks and dashboards for your next project. Elevate
              your UI instantly!
            </p>
            <div className="mt-2 flex w-full flex-row justify-center gap-2">
              <div className="relative w-1/2">
                <a href={SHADCN_BLOCKS_URL} target="_blank" rel="noopener noreferrer">
                  <Button
                    className="flex w-full cursor-pointer items-center justify-center"
                    variant="default"
                  >
                    <Blocks size={16} />
                    Pro Blocks
                    <ArrowRight size={16} />
                  </Button>
                </a>
              </div>
              <div className="relative w-1/2">
                <Button
                  className="flex w-full items-center justify-center"
                  variant="default"
                  disabled
                >
                  <LayoutDashboard size={16} />
                  Pro Dashboards
                </Button>
                <span className="absolute -top-5 -right-1">
                  <Badge
                    variant="outline"
                    className="rounded-full border-yellow-400 bg-yellow-400 px-2 py-0.5 text-xs text-yellow-900 shadow"
                  >
                    Coming soon
                  </Badge>
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
