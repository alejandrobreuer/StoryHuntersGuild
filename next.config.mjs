/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Pages here render dynamically (force-dynamic) for live capacity/session
    // data, but the App Router's client-side Router Cache still reused a
    // stale RSC payload for up to 30s after a <Link> navigation — a hard
    // reload always looked correct because that cache is client-only. This
    // disables that cache for dynamic routes so every navigation re-fetches.
    staleTimes: { dynamic: 0 },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
