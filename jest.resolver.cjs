var fs = require('node:fs');
var path = require('node:path');

/**
 * The repository uses NodeNext source imports so the published ESM package
 * keeps explicit `.js` specifiers. Backstage's Jest transform executes those
 * sources as CommonJS, so resolve a relative `.js` request to its TypeScript
 * source when one exists. All other requests keep Jest's default behavior.
 */
module.exports = function resolver(request, options) {
  if (request.startsWith('.') && request.endsWith('.js')) {
    var sourcePath = path.resolve(options.basedir, request.slice(0, -3));
    var extensions = options.extensions || [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mts',
      '.cts',
      '.mjs',
      '.cjs',
    ];

    for (var index = 0; index < extensions.length; index += 1) {
      var candidate = sourcePath + extensions[index];
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return options.defaultResolver(request, options);
};
