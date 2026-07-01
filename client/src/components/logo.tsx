import { GraduationCap } from "lucide-react";
import * as React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return <GraduationCap size={size} className={className} />;
}
