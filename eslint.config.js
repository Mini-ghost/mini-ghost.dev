import pluginVue from 'eslint-plugin-vue'
import parserVue from 'vue-eslint-parser'
import typeScriptParser from '@typescript-eslint/parser'

/**
 * @type {import('eslint').Linter.Config}
 */
export default [
  {
    plugins: {
      vue: pluginVue
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        extraFileExtensions: ['.vue'],
        parser: typeScriptParser,
        sourceType: 'module',
      }
    },
    rules: {
      ...pluginVue.configs['vue3-essential'].rules,
      ...pluginVue.configs['vue3-strongly-recommended'].rules,
      ...pluginVue.configs['vue3-recommended'].rules,

      'vue/multi-word-component-names': 'off',

      'vue/block-order': ['error', {
        order: ['script', 'template', 'style'],
      }],

      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/multiline-html-element-content-newline': ['error',{
        ignoreWhenEmpty: true,
        ignores: ['pre', 'textarea'],
        allowEmptyLines: false,
      }],

      'vue/attributes-order': [
        'error',
        {
          alphabetical: true,
        },
      ],

      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts',
          },
        },
      ],

      'vue/no-empty-component-block': 'error',
      'vue/prefer-separate-static-class': 'error',
      'vue/padding-line-between-blocks': 'error',
    }
  }
]