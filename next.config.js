/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'media.tenor.com', // Domaine pour les GIFs de Tenor
            },
        ],
    },
    env: {
        TENOR_API_KEY: process.env.TENOR_API_KEY,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
