module.exports = {
    'env': {
        'browser'   : true,
        'es6'       : true,
        'es2021'    : true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion'   : 12,
        'sourceType'    : 'module'
    },
    'ignorePatterns':['**/dist/','**/prod/','*.min.js'],
    'rules': {
        'no-unused-vars':'off',
        'no-useless-escape':'off',
        'no-undef':'off',
        'semi': [
            'error',
            'always'
        ]
    }
};
