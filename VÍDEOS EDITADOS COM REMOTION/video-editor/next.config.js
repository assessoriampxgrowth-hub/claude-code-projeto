/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'fluent-ffmpeg',
      'ffmpeg-static',
      'ffprobe-static',
      '@remotion/bundler',
      '@remotion/renderer',
      '@remotion/compositor-win32-x64-msvc',
      '@anthropic-ai/sdk',
      'openai',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        'ffmpeg-static': 'commonjs ffmpeg-static',
        'ffprobe-static': 'commonjs ffprobe-static',
        '@remotion/bundler': 'commonjs @remotion/bundler',
        '@remotion/renderer': 'commonjs @remotion/renderer',
      });
    }
    return config;
  },
};
module.exports = nextConfig;
