module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'curly': [
      'error'
    ],
    'eqeqeq': [
      'error',
      'always'
    ],
    'guard-for-in': [
      'error'
    ],
    'no-multi-spaces': [
      'error'
    ],
    'strict': [
      'error',
      'global'
    ],
    'key-spacing': [
      'error'
    ],
    'keyword-spacing': [
      'error'
    ],
    'space-before-function-paren': [
      'error',
      'always'
    ],
    'space-in-parens': [
      'error',
      'never'
    ],
    'space-infix-ops': [
      'error'
    ],
    'no-console': 'error',
    'no-spaced-func': [
      'error'
    ],
    'no-whitespace-before-property': [
      'error'
    ],
    'space-before-blocks': [
      'error'
    ],
    'no-template-curly-in-string': [
      'error'
    ],
    'block-scoped-var': [
      'error'
    ],
    'complexity': [
      'warn',
      10
    ],
    'dot-location': [
      'error',
      'property'
    ],
    'no-else-return': 'error',
    'no-floating-decimal': 'error',
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-str': 'error',
    'no-new-wrappers': 'error',
    'no-new': 'error',
    'no-return-assign': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-useless-return': 'error',
    'radix': [
      'error',
      'always'
    ],
    'yoda': 'error',
    'callback-return': 'error',
    'global-require': 'error',
    'comma-spacing': [
      'error',
      { 'before': false, 'after': true }
    ],
    'comma-style': [
      'error',
      'last'
    ],
    'computed-property-spacing': [
      'error',
      'never'
    ],
    'eol-last': [
      'error',
      'always'
    ],
    'func-call-spacing': [
      'error',
      'never'
    ],
    'func-name-matching': [
      'error',
      'always'
    ],
    'func-style': [
      'error',
      'expression'
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'lines-around-directive': [
      'error'
    ],
    'newline-before-return': 'error',
    'newline-per-chained-call': 'error',
    'no-lonely-if': 'error',
    'no-trailing-spaces': 'error',
    'object-curly-spacing': [
      'error',
      'always'
    ],
    'operator-assignment': [
      'error',
      'never'
    ],
    'no-confusing-arrow': 'error',
    'no-useless-computed-key': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': [
      'error',
      'never'
    ],
    'no-warning-comments': 'error',
    'prefer-promise-reject-errors': 'error'
  }
};
