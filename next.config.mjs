/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose the git commit SHA to the client so the page can detect when a
  // newer carcam deploy is live and reload itself without requiring a hard
  // refresh. Vercel sets VERCEL_GIT_COMMIT_SHA at build time; NEXT_PUBLIC_*
  // env vars are inlined into the client bundle.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  },
};

export default nextConfig;
