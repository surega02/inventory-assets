import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  devIndicators: false,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "4350kb" } },
};

export default config;
