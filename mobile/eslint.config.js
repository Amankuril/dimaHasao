const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  {
    // Screens port the web's effects as they are (state set inside effects,
    // latest-callback refs). The React Compiler skips any component that
    // breaks its rules, so these run as plain React; flag, don't fail.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'import/no-named-as-default': 'off',
    },
  },
]);
