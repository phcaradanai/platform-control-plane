// .cjs because this package has "type": "module" - a .js eslintrc would
// be parsed as ESM and fail.
module.exports = require('@backstage/cli/config/eslint-factory')(__dirname);
