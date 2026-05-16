/** @type {import('next').NextConfig} */
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_TENANT_ID || "grounded";

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Legacy unprefixed routes redirect to the default tenant. Lets old
    // packGPT links + shared URLs survive the multi-tenant URL move.
    return [
      { source: "/library", destination: `/t/${DEFAULT_TENANT}/library`, permanent: false },
      { source: "/build", destination: `/t/${DEFAULT_TENANT}/build`, permanent: false },
      { source: "/learnings", destination: `/t/${DEFAULT_TENANT}/learnings`, permanent: false },
      { source: "/reports/:id", destination: `/t/${DEFAULT_TENANT}/reports/:id`, permanent: false },
    ];
  },
};

export default nextConfig;
