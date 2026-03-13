const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Indiquer à Next.js où se trouve le tsconfig pour le build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  webpack: (config, { isServer }) => {
    // Configuration pour les alias de chemin
    config.resolve.alias['@'] = path.join(__dirname, 'src');

    // Configuration pour ignorer le dossier 'functions' lors du watch
    if (!config.watchOptions) {
      config.watchOptions = {};
    }
    config.watchOptions.ignored = ['**/functions/**'];

    return config;
  },

  // Exclure explicitement des fichiers/dossiers du build final
  outputFileTracingExcludes: {
    '*': ['./functions/**/*']
  },
};

module.exports = nextConfig;
