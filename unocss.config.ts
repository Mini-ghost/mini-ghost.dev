import transformerDirectives from '@unocss/transformer-directives';
import { defineConfig } from 'unocss';

export default defineConfig({
  transformers: [transformerDirectives()],
  blocklist: [
    /**
     * 修復 PostCSS 錯誤：[vite:css][postcss] Lexical error on line 1: Unrecognized text.
     *
     * 問題原因：
     * UnoCSS 在掃描代碼時，錯誤地將 `m[pascalCase(component)]` 識別為 CSS 類名，
     * 並嘗試生成無效的 CSS 規則：`.m\[pascalCase\(component\)\]{margin:pascalCase(component);}`
     * 這會導致 PostCSS 解析失敗。
     *
     * 解決方案：
     * 使用 blocklist 阻止 UnoCSS 處理這種模式的類名
     */
    /^m\[pascalCase\(.*\)\]$/,
  ],
});
