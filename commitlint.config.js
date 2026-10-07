export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'footer-max-line-length': [0],
    'header-max-length': [0],
    'body-max-line-length': [1, 'always', 120],
  },
};
