/** @type {import('next').NextConfig} */
const nextConfig = {
  // Indiquer à Next.js où se trouve le tsconfig pour le build
  typescript: {
    // !! WARN !!
    // Autoriser les builds de production à réussir même en cas d'erreurs de type.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  webpack: (config, { isServer }) => {
    // Configuration pour les alias de chemin - Méthode SÛRE
    // On ajoute simplement le dossier 'src' aux endroits où Webpack cherche les modules.
    config.resolve.modules.push('src');

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
