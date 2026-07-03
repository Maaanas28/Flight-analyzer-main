const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Force all imports of 'three' to resolve to the same single root instance
      // to prevent duplicate Three.js warnings or prototype mismatches.
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'three$': path.resolve('./node_modules/three/build/three.module.js'),
      };

      // Support .mjs files if needed
      if (webpackConfig.resolve) {
        if (!webpackConfig.resolve.extensions.includes('.mjs')) {
          webpackConfig.resolve.extensions.push('.mjs');
        }
      }

      return webpackConfig;
    },
  },
};
