const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    const backend = new URL(process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin;
    return [
      // Socket.IO requires its trailing slash even when Next normalizes the incoming URL.
      { source: "/api/socket.io", destination: `${backend}/api/socket.io/` },
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/health/:path*", destination: `${backend}/health/:path*` },
    ];
  },
};

export default nextConfig;
