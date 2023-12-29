---
title: Nuxt 進階應用：HTML 壓縮技巧全解析
tags: 
  - Vue
  - Nuxt
  - HTML Compression

created: 2023-12-24T17:30:53.162Z
description: 在網頁開發的過程中，如何在讓網站的效能有更多的提升一直都是個非常深的學問。在這篇文章中，我將分享如何在 Nuxt 中使用 html-minifier-terser 處理 HTML 壓縮，盡可能的提升網頁加載速度。如果你也正在使用 Nuxt 架設網站，相信這篇內容會讓你很有收穫，那就讓我們一起看下去吧！
---

## 前言

這篇會以我如何壓縮這個部落格的靜態 HTML 為例。如果是熟悉 Vue 的朋友想要自架部落格，我會首推選用 Nuxt Content，Nuxt Content 簡單易用好上手，輕輕鬆鬆就可以打造出具有個人風格的網站。

這篇內容牽涉到 Nuxt 比較進階的使用方式，像是 Nuxt Lifecycle Hooks 以及 Nitro Server Plugins，如果不熟悉的的還是可以先看完並照著嘗試做一遍，最後都會附上文件跟參考連結。


## 為什麼要壓縮 HTML

事實上 Nuxt 已經是一個非常高效的框架了，但仔細看過 Nuxt 生成的 HTML 檔案後還是發現了一些可以改進的地方。下圖 HTML 是未壓縮前的樣子。

> 為了有個明確的比較基準，我們以目前最長的文章：「深入淺出 axios（二）：XMLHttpRequest、CancelToken」為例。

![Nuxt Content 壓縮前的 HTML - by Alex Liu](/images/optimize-nuxt-html-original.png){width=761, height=484}

不難看出一些可以改善的方向，像是：

- 移除不必要的「空白」以及「換行」。
- 壓縮 `<style>` 標籤內的 CSS。
- 壓縮 `<script>` 標籤內的 JavaScript。

目前的 HTML 檔案大小為：**180.4 Kib**


## 過去的 Nuxt 如何壓縮 HTML

根據 Nuxt 2 [文件](https://v2.nuxt.com/docs/configuration-glossary/configuration-build/#htmlminify)中提到的設定，可以透過在 `nuxt.config.js` 中加入設定來壓縮 HTML，但在 Nuxt 3 的文件跟原始碼裡面並沒有找到相關的設定，看起來我們必須自己動手處理。

但我們可以參考 Nuxt 2 使用 `html-minifier-terser`（Nuxt 2 實際上是用 [html-minifier](https://github.com/kangax/html-minifier)） 這個工具幫助我們處理 HTML 壓縮。接下來就來看看如何將 `html-minifier-terser` 整合進 Nuxt 進行 HTML 壓縮。

## Nuxt 實作 HTML 壓縮

首先我們需要先安裝 `html-minifier-terser`：

```bash
pnpm install html-minifier-terser -D
```

選定了使用的壓縮工具，接下來就要想著如何進行壓縮了，這時候有兩個方向可以選擇。

**寫一個 node script 來處理。**

我們可以透過 `fs` 讀取 `dist` 資料夾下的 HTML 檔案，再透過 `html-minifier-terser` 處理後再回寫回去。這樣的方式在每次執行 `pnpm generate` 後都要再執行一次 node script 去讀寫檔案，整個流程變得很麻煩，並且他只適用於靜態檔案。

**透過 Nuxt 提供的 Lifecycle Hooks 來處理。**

我們或許可以嘗試找到在 Server Render 後生成靜態檔案前的 hook 將 HTML 壓縮變小，這樣說不定可以在 `pnpm generate` 的過程直接處理好 HTML 壓縮，不用再另外寫一個 node script 來處理，同時這個方法也適用於 Server Side Render。

在 Nuxt 的文件當中我們可以看到 `render:html` 以及 `render:response` 兩個 Nitro Engine 的 hook，這兩個 hook，他們的說明如下。

- `render:html` - 在建立 HTML 之前呼叫。
- `render:response` - 在每次回應被送出前觸發。

這兩個 hooks 都是 Nitro Engine 的 hook，所以我們可以在 `/server/plugins` 裡面新增一個 `html-minifier.ts` 來處理 HTML 壓縮。

```ts
// server/plugins/html-minifier.ts

export default defineNitroPlugin((nitroApp) => {
  // ...
});
```

我們使用 `render:html` 這個 hook，實作後的程式碼。

```ts
import { minify } from 'html-minifier-terser';

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:html', async html => {
    const [head, bodyPrepend, body, bodyAppend] = await Promise.all([
      handleMinify(html.head),
      handleMinify(html.bodyPrepend),
      handleMinify(html.body),
      handleMinify(html.bodyAppend),
    ]);

    html.head = head;
    html.bodyPrepend = bodyPrepend;
    html.body = body;
    html.bodyAppend = bodyAppend;
  });
});

function handleMinify(contents: string[]) {
  return Promise.all(
    contents.map(async content => {
      const newContent = await minify(content, {
        removeComments: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
      });

      return newContent;
    })
  );
}
```

`render:html` 這個 hook 我們會拿到一包名為 `html` 的 render context，其中包含了 `head`、`bodyPrepend`、`body` 以及 `bodyAppend` 四個陣列，分別代表了 `<head>`、`<body>`、`<body>` 結束標籤前以及 `</body>` 結束標籤後的內容。

下面這個是 `html` 的型別定義：

```ts
interface NuxtRenderHTMLContext {
  htmlAttrs: string[]
  head: string[]
  bodyAttrs: string[]
  bodyPrepend: string[]
  body: string[]
  bodyAppend: string[]
}
```

我們將 `head`、`bodyPrepend`、`body` 以及 `bodyAppend` 這四個陣列的內容逐一進行壓縮並寫回 `html`，最後的到的靜態檔案長得像這樣。

![Nuxt Content 壓縮後的 HTML - by Alex Liu](/images/optimize-nuxt-html-first-result.png){width=761, height=484}

HTML 明顯變得更緊密了！少了很多換行，CSS 也被壓成了一行，連 UnoCSS 上的註解也全部都消失了，這時候的。

經過這次壓縮後的 HTML 檔案大小為：**167.69 Kib（壓縮率 ≈ 7.04%）**

但是還是有一些些問題，例如：

- `<!DOCTYPE html>` 跟 `<html>` 以及 `<head>` 之間換行還在。
- `<html  lang="zh-TW">` 跟 `<body >` 都多了一個空白。
- 最大的問題：**水合失敗 `Hydration completed but contains mismatches.`**

水合失敗是因為我們壓縮了 `<body>` 裡面的內容，要解決這個問題，我們只需要避免去壓縮 `html.body` 即可。

```diff
import { minify } from 'html-minifier-terser';

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:html', async html => {
-   const [head, bodyPrepend, body, bodyAppend] = await Promise.all([
+   const [head, bodyPrepend, bodyAppend] = await Promise.all([
      handleMinify(html.head),
      handleMinify(html.bodyPrepend),
-     handleMinify(html.body),
      handleMinify(html.bodyAppend),
    ]);

    html.head = head;
    html.bodyPrepend = bodyPrepend;
-   html.body = body;
    html.bodyAppend = bodyAppend;
  });
});
```

但要解決前其他兩個問題就沒那麼容易了。為什麼 `<!DOCTYPE html>` 跟 `<html>` 以及 `<head>` 之間有個換行？為什麼 `<html  lang="zh-TW">` 跟 `<body >` 都多了一個空白？

我們可以透過 Nuxt 的 `renderer.ts` 來找到答案，下列是在 `renderer.ts` 中使用的 `renderHTMLDocument` function。

```ts
function joinTags (tags: string[]) {
  return tags.join('')
}

function joinAttrs (chunks: string[]) {
  return chunks.join(' ')
}

function renderHTMLDocument (rendered: NuxtRenderContext) {
  return `<!DOCTYPE html>
<html ${joinAttrs(rendered.html.htmlAttrs)}>
<head>${joinTags(rendered.html.head)}</head>
<body ${joinAttrs(rendered.html.bodyAttrs)}>${joinTags(rendered.html.bodyPreprend)}${joinTags(rendered.html.body)}${joinTags(rendered.html.bodyAppend)}</body>
</html>`
}
```

舉例來說這是一筆 `html` 的資料（來源：Nuxt 3 Playground）

```ts
{
  html: {
    island: false,
    htmlAttrs: [''],
    head: [
      '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="preload" as="fetch" crossorigin="anonymous" href="/_payload.json">\n<link rel="modulepreload" as="script" crossorigin href="/_nuxt/entry.5uDhBsHa.js">\n<link rel="prefetch" as="script" crossorigin href="/_nuxt/error-404.FuMq0F0V.js">\n<link rel="prefetch" as="script" crossorigin href="/_nuxt/vue.f36acd1f.WDjT49Gm.js">\n<link rel="prefetch" as="script" crossorigin href="/_nuxt/error-500.SoaWxXGJ.js">\n<script type="module" src="/_nuxt/entry.5uDhBsHa.js" crossorigin></script>'
      ],
    bodyAttrs: [''],
    bodyPreprend: [],
    body: [
      '<div id="__nuxt"><div> Nuxt 3 Playground </div></div>'
    ],
    bodyAppend: [
      '<script type="application/json" id="__NUXT_DATA__" data-ssr="true" data-src="/_payload.json">[{"state":1,"once":3,"_errors":5,"serverRendered":7,"path":8,"prerenderedAt":9},["Reactive",2],{},["Reactive",4],["Set"],["Reactive",6],{},true,"/",1703483989454]</script>\n<script>window.__NUXT__={};window.__NUXT__.config={public:{},app:{baseURL:"/",buildAssetsDir:"/_nuxt/",cdnURL:""}}</script>'
    ]
  }
}
```

由此我們可以得出上面兩個問題的答案：

- `<!DOCTYPE html>` 跟 `<html>` 以及 `<head>` 之間換行還在，是因為字串模板本身就含有換行。
- `<html  lang="zh-TW">` 跟 `<body >` 都多了一個空白，是因為 `html.bodyAttrs` 陣列裡面有一個空字串，所以會多一個空白。

想要維持現狀並且同時解決這個問題可能就要要到 Nuxt 底層的原始碼去修改了。那除此之外我們還有沒有其他方法可以解決掉這兩個問題呢？

使用 `render:response` 這個 hooks 試試看吧！不囉唆先看結果：

```ts
import { minify } from 'html-minifier-terser';

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', async response => {
    if (typeof response.body === 'string') {
      response.body = response.body.replace('<body >', '<body>');

      const regex = /<body>([\s\S]*?)<\/body>/;
      const match = regex.exec(response.body);

      if (match) {
        const body = match[0];
        const html = await minify(response.body.replace(body, ''), {
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
        });

        response.body = html.replace(/(<\/head>)/, '$1' + body);
      }
    }
  });
});
```

要理解這裡在做什麼，首先要知道 `response` 裡面有哪些資料，下列是 `response` 的型別定義：

```ts
interface NuxtRenderResponse {
  body: string,
  statusCode: number,
  statusMessage?: string,
  headers: Record<string, string>
}
```

其中的 `body` 就是執行 `renderHTMLDocument(htmlContext)` 的結果。

```ts
// Construct HTML response
const response = {
  // 👇 這裡是最終的 html 字串
  body: renderHTMLDocument(htmlContext),
  statusCode: getResponseStatus(event),
  statusMessage: getResponseStatusText(event),
  headers: {
    'content-type': 'text/html;charset=utf-8',
    'x-powered-by': 'Nuxt'
  }
} satisfies RenderResponse
```
所以我們可以拿著這個 `body` 給 `html-minifier-terser` 壓縮。但直接壓縮 `body` 會遇到前面提到的水合失敗的錯誤，因為我們也把 `<body>` 裡面的內容也壓縮掉了。解決方可以先用正則，`/<body>([\s\S]*?)<\/body>/`，把 `<body>` 裡面的原始內容題取出來，將剩下的結果壓縮完後再把 `<body>` 的內容組合回去。

最終得到的結果就會像這樣：

![Nuxt Content 最終壓縮後的 HTML - by Alex Liu](/images/optimize-nuxt-html-result.png){width=761, height=484}

- 除了 `<body>` 以外得換行都被移除了。
- `<head>` 內的 CSS 跟 JavaScript 都被壓縮成一行了。
- `<html  lang="zh-TW">` 跟 `<body >` 多了一個空白的部分也被移除了。

最終壓縮結果執行上也沒有遇到什麼問題，而壓縮後的檔案大小為：**174.96 Kib（壓縮率 ≈ 3.02%）**

## 總結

在這篇文章中，我們使用 `html-minifier-terser` 這個工具幫助我們處理 HTML 壓縮，並且透過 Nuxt Lifecycle Hooks 來處理，最後得到了一個壓縮率約 3% 的成果。

受限於我們不能去修改到 `<body>` 裡面的內容，所以最終的壓縮率看起來並不是那麼的驚人，但也算是有一點點進步拉！而進步最大的部分就屬 `<head>` 內的 inline styles 了。

最後來觀察打包的時間差異。無壓縮版本的頁面生成靜態檔案花了約 3046ms 但是加入壓縮流程生成靜態檔案增加到了 3250ms，多了 204ms 的時間。以靜態網頁來說這一點成本或許還算值得，畢竟這個時間只在生成靜態檔案的時候，之後所有載入頁面的讀者都可以享受到這個效能提升。

但我自己手上 Server Side Render 的專案目前沒有選擇導入這個功能，對於 Server Side Render 的頁面每次請求都會多花比這 204ms 更多或少一點的時間去壓縮 HTML，節省的傳輸時間可能還不夠抵消這個成本，所以還是要視情況看專案來決定壓縮與否或是選擇使用不同的壓縮設定。

在撰寫這篇文章搜集資料的同時也發現了一個由 Rust 編寫的壓縮工具 [`minify-html`](https://github.com/wilsonzlin/minify-html)，按照他的 performance 圖表來看很有機會取得更少的壓縮時間，如果有機會的話我會再試試看這個工具。

### 參考資料

- [Lifecycle Hooks · Nuxt API](https://nuxt.com/docs/api/advanced/hooks#nitro-app-hooks-runtime-server-side)
- [Plugins · Nitro](https://nitro.unjs.io/guide/plugins)
- [html-minifier-terser](https://github.com/terser/html-minifier-terser)