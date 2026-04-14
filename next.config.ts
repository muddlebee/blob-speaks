import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/blob_face_pink.html",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
