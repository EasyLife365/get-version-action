module.exports = {
  env: {
    node: true,
    es2020: true
  },
  extends: [
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    'space-before-function-paren': ['error', { named: 'never', anonymous: 'always', asyncArrow: 'always' }]
  },
  overrides: [
    {
      files: ['test/**/*.ts'],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    }
  ]
}
