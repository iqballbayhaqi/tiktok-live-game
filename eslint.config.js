module.exports = [
    {
        ignores: [
            'node_modules/**',
            '*.min.js',
            'dist/**',
            'build/**',
            'coverage/**',
            '.env',
            'config/users.json'
        ]
    },
    {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                EventSource: 'readonly',
                JSON: 'readonly',
                OverlayConfig: 'readonly',
                PuzzlePhoto: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: false,
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }]
        }
    }
];

