module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest'
  },
  testRegex: '(test|spec)\\.ts$',
  collectCoverageFrom: [
    'src/**/*.ts'
  ]
}
