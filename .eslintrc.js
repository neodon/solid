module.exports = {
  root: true,
  env: {
    node: true,
    es6: true
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
    'prettier/standard',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended'
  ],
  rules: {
    'max-len': ['warn', { code: 120 }],
    'prettier/prettier': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    quotes: ['warn', 'single', { avoidEscape: true }],
    indent: ['warn', 2, { SwitchCase: 1 }],
    semi: 'off',
    'comma-dangle': ['warn', 'never']
  },
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 10,
  },
  overrides: [
    {
      files: ['*.ts'],
      plugins: ['@typescript-eslint'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json'
      },
    }
  ]
}
