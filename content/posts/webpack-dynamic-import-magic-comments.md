---
title: Webpack 動態載入的 Magic Comments
tags: 
  - Webpack

created: 2020-09-11T22:52:45.395Z
image: https://og-image-mini-ghost.vercel.app/Webpack%20%E5%8B%95%E6%85%8B%E8%BC%89%E5%85%A5%20import()%20%E7%9A%84%20Magic%20Comments.png?fontSize=62
image_caption: Webpack 動態載入的 Magic Comments
excerpt: 動態載入（Dynamic import）可以有效的減少 Webpack 打包後的 bundle size。適當地使用動態載入，將不立即需要的 code 切分至獨立的模塊（chunk）可以在初次載入時帶來更好的使用者體驗。此外 webpack 也為動態載入提供了一些 Magic Comments，讓開發人員能更有彈性的調整各項細節。本篇將一一介紹這些 Comment 的用法並搭配簡易範例來呈現、說明。
---

## 前言

為什麼想寫這一篇？

在這個靜態的個人網站的首頁，我規劃了一個區域，裡面放上了我自己比較熟悉的前端技能的 SVG 清單。而我希望未來一但要新增技能時，我只需去修改 `content/skills.ts` 的內容以及新增 `assets/image/skills` 裡面的 SVG Components 就好，但在整個過程中我遇到了一些令我苦惱的問題。

因為我不想要一個一個手動載入，所以我依照 `skills.ts` 提供的技能資料，用 for 迴圈將其對應的 SVG Components 動態載入，如下：

```html
<template>
  <!-- 略 -->
    <ul class="skill-list list-none m-0 p-0">
      <li
        v-for="{ svg, name } in skills"
        :key="name"
        :aria-label="name"
        class="skill-list__item skill-tooltip relative inline-block"
      >
        <component
          :is="svg"
          class="skill-list__image md:opacity-75 hover:opacity-100"
        />
      </li>
    </ul>
  <!-- 略 -->
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { skills } from '~/content/site'

@Component<TheSkill>({
  beforeCreate () {
    for(let i = 0; i < skills.length; i++) {
      const skill = skills[i].svg
      this.$options.components![skill] = () => import(
        /* webpackChunkName: "svg-skills" */
        `~/assets/images/skills/${skill}.svg?inline`
      )
    }
  }
})
export default class TheSkill extends Vue {
  private skills = Object.freeze(skills)
}
</script>
```

利用動態載入的機制並搭配 **動態路徑**，讓資料決定需要載入的 SVG Components，但卻也衍生了兩個小問題：

1. **檔案命名問題**

    天真的我，原本以為打包後會是一隻 `svg-skills.hash.js`，但實際打包後的檔名卻是這樣：

    ```text
    svg-skills0.hash.js
    svg-skills1.hash.js
    ```

    這樣當然還是可以正常載入，但難搞如我希望至少可以長像這樣：

    ```text
    svg-skills-nuxtjs.hash.js
    svg-skills-gridsome.hash.js
    ```

    一開始我解決了這個問題，但後來發現了過多動態載入導致的問題。

2. **動態載入問題**
  
    解決了檔案命名的問題後一陣子發現，首頁在 Google 的 PageSpeed Insights 上最大內容繪製（LCP，Largest Contentful Paint）指標分數並不理想，經過各種嘗試後發現主要原因出在這些動態載入的 SVG Components 上。

    由於這些 SVG Components 都是一載入當下立即就需要使用的，而過多的動態載入阻塞了畫面渲染的工作進而導致最大內容繪製的時間過長。想改善這個問題，就要設法將這些 SVG Components 在打包成一隻 js 模塊後動態載入，或是最好能不產生額外的網路請求，像是靜態載入。

但改用靜態載入的話不就意味這我終究得一個一個 import！？靜態網頁最終要載入那些 SVG Components 這在打包時就已經確定，難道不能在這時候將這些要用到的打包在一起嗎？

解決辦法就在 Webpack 動態載入的 Magic Comments 裡面。

## Magic Comments（inline comments，內聯注釋）

_我其實比較偏好 inline comments 這個詞，所以接下來會盡量統一使用他_

在上面出現的 `/* webpackChunkName: "svg-skills" */` 就是 inline comments 之一，以下是在 webpack 官網上關於 inline comments 的範例，並接者來說明每一個 inline comments 的功能與使用時機。

```js
// Single target
// 靜態路徑
import(
  /* webpackChunkName: "my-chunk-name" */
  /* webpackMode: "lazy" */
  /* webpackExports: ["default", "named"] */
  'module'
);

// Multiple possible targets
// 動態路徑
import(
  /* webpackInclude: /\.json$/ */
  /* webpackExclude: /\.noimport\.json$/ */
  /* webpackChunkName: "my-chunk-name" */
  /* webpackMode: "lazy" */
  /* webpackPrefetch: true */
  /* webpackPreload: true */
  `./locale/${language}`
);
```

### webpackChunkName

`webpackChunkName` 可以為動態載入的模塊（chunk）指定名稱，例如：

```js
import(
  /* webpackChunkName: "svg-skills" */
  '~/assets/images/skills/gridsome.svg?inline'
)
```

這樣打包後的檔案名稱會是 `svg-skills.hash.js`，是否有 hash 依照 webpack 設定會有不同。

除此之外，`webpackChunkName` 在搭配動態路徑時提供了兩個 placeholders：`[index]` 及 `[request]`，分別表示載入順序的編號，以及一個被解析出來的檔案名稱。以前言部分提到的第一個狀況來說，就可以使用 `[request]` 讓每個動態載入的模塊有更明確的命名

```ts
import { Vue, Component } from 'vue-property-decorator'
import { skills } from '~/content/site'

@Component<TheSkill>({
  beforeCreate () {
    for(let i = 0; i < skills.length; i++) {
      const skill = skills[i].svg
      this.$options.components![skill] = () => import(
        /* webpackChunkName: "svg-skills-[request]" */
        `~/assets/images/skills/${skill}.svg?inline`
      )
    }
  }
})
export default class TheSkill extends Vue {
  private skills = Object.freeze(skills)
}
```

打包過後就會產生下列這樣的檔案名稱

```text
svg-skills-nuxtjs-svg.hash.js
svg-skills-gridsome-svg.hash.js
```

這樣就解決了第一個 **檔案命名問題**。這裡可以這樣做是因為上面 `~/assets/images/skills/${skill}.svg?inline` 是一個動態路徑，可如果是靜態路徑的話則會輸出 `svg-skills-[request].hash.js` 這樣的模塊。

```js
// 最後會打包成 svg-skills-[request].hash.js
import(
  /*webpackChunkName: "svg-skills-[request]"*/
  '~/assets/images/skills/gridsome.svg?inline'
)
```

另外如果是多個靜態路徑但如果用了相同的 `webpackChunkName` 則會全部打包成同一個模塊，有一點點類似下一個要提到的 `webpackMode: "lazy-once"` 的效果。

`webpackChunkName` 應該是相對廣為人知的 inline comments，在 Vue CLI 中預設的 router 檔案裡面就可以見到他的身影。

### webpackMode

`webpackMode` 用於設定模塊被以什麼形式打包，目前有四種選項：

- `lazy`（預設）

    每一個不同的 `import()` 都會打包出一個動態載入的模塊。而 `webpackChunkName` 的兩個 placeholders 也只有在動態路徑並且 `webpackMode` 設定為 `lazy` 模式時有意義。

- `lazy-once`

    所有 `import()` 搭配動態路徑在打包後只會產生一個動態載入的模塊。

    ```ts
    import { Vue, Component } from 'vue-property-decorator'
    import { skills } from '~/content/site'

    @Component<TheSkill>({
      beforeCreate () {
        for(let i = 0; i < skills.length; i++) {
          const skill = skills[i].svg
          this.$options.components![skill] = () => import(
            /* webpackChunkName: "svg-skills" */
            /* webpackMode: "lazy-once" */
            `~/assets/images/skills/${skill}.svg?inline`
          )
        }
      }
    })
    export default class TheSkill extends Vue {
      private skills = Object.freeze(skills)
    }
    ```

    像這樣打包過後產生的模塊如下：

    ```text
    svg-skills.hash.js
    ```

    體醒一下，`lazy-once` 模式只有在像這樣的動態路徑 ``import(`~/assets/images/skills/${skill}.svg?inline`)`` 才會有實際意義。如果用在純靜態路徑則會在打包期間收到警告。

- `eager`

    ```ts
    import { Vue, Component } from 'vue-property-decorator'
    import { skills } from '~/content/site'

    @Component<TheSkill>({
      beforeCreate () {
        for(let i = 0; i < skills.length; i++) {
          const skill = skills[i].svg
          this.$options.components![skill] = () => import(
            /* webpackMode: "eager" */
            `~/assets/images/skills/${skill}.svg?inline`
          )
        }
      }
    })
    export default class TheSkill extends Vue {
      private skills = Object.freeze(skills)
    }
    ```

  這個模式不會產生任何的模塊，而是直接打包到上層模塊裡面，也因此呼叫動態載入 `import()` 的時候不會產生額外的網路請求，而是以 `Promise.resolve()` 的方式回傳。類似靜態載入，但不同的是該模塊的內容要直到呼叫了 `import()` 之後才會執行。

  這就可以解決前言提到的 **動態載入問題**，因為網路請求變少了，原本要等七八個請求回來，先在完全不用發出請求，能更快完成初始化，瀏覽器也能更快完成最大內容繪製。

- `weak`

    根據官方文件的說法，他會嘗試請求該模塊，如果該模塊已經在其他部分取得過，那這裡就會以 `Promise.resolve()` 回應，但如果沒有被取得過，則會拋出一段錯誤訊息。該模式可以應用在 universal rendering（Server-Side Rendering）上。

    坦白說，目前沒有在任何專案中有用到這個模式，所以也只就整能字面解釋，如果有大大們對 `/* webpackMode: "weak" */` 有研究的，也歡迎分享一下使用的經驗囉！

### webpackPrefetch

`webpackPrefetch` 接受一 Boolean 或 Number，他可以讓 webpack 輸出資源提示（Resource Hint）。例如：

```ts
import { Vue, Component } from 'nuxt-property-decorator'

@Component<LoginPage>({})
export default class LoginPage extends Vue {
  // 略
  onLogin() {
    import(
      /* webpackChunkName: "recaptcha-v3" */
      /* webpackPrefetch: true */
      'recaptcha-v3'
    )
      .then(module => {
        // 略
      })
  }
}
```

這是一個登入頁面的 Vue Component，登入時需要透過 reCAPTCHA v3 驗證，並且希望能等到使用者按下登入時才去動態載入 `recaptcha-v3` 使用。加上 `/* webpackPrefetch: true */` 後，在頁面載入時會在 head 裡面加上資源提示。

像這樣：

```html
<!-- 略 -->
<link rel="prefetch" as="script" href="/_nuxt/vendorsr.recaptcha-v3.js">
```

有了資源提示，瀏覽器就會在有空的時候去預取這些檔案，等真正需要時就能更快載入資源來使用。

`webpackPrefetch` 除了 Boolean 之外，後面如果填入 Number 則表示優先順序。

例如：

```js
// 只是範例，先別管合不合理
async mounted() {
  const { default: moment } = await import(
    /* webpackPrefetch: 1 */
    /* webpackChunkName: "moment" */
    'moment'
  )
  const { default: _ } = await import(
    /* webpackPrefetch: 3 */
    /* webpackChunkName: "lodash" */
    'lodash'
  )
  const { default: $ } = await import(
    /* webpackPrefetch: 2 */
    /* webpackChunkName: "jquery" */
    'jquery'
  )
}
```

打包執行後會像這樣：

```html
<link rel="prefetch" as="script" href="/js/lodash.js">
<link rel="prefetch" as="script" href="/js/jquery.js">
<link rel="prefetch" as="script" href="/js/moment.js">
```

輸出的結果會依照給定的數字由大到小排序，但如果這裡的 webpackPrefetch 都為 true （或都為相同數字的話）的話，那順序就會是 jquery、lodash、moment。實際上 `true` 可以當作是順序 0，如果有出現 999 跟 -999 的話，輸出則會是 999、true、-999，這其實就像是 css 的 `z-index` 那樣。

另外，填入 false 或是字串的話執行時就不會產生資源提示。

在 Vue CLI 中預設會將頁面中所有動態載入的 Components、模塊...等全都加上資源提示。如果專案比較龐大，官方也建議從 `vue.config.js` 中將該預取功能關閉，並用 `webpackPrefetch` 這個 inline comments 手動選選擇那些部分需要加上資源提示。

### webpackPreload

`webpackPreload` 使用方式大致跟 `webpackPrefetch` 無異。一樣會產生資源提示，而這裡產的提示為 `<link rel="preload" ...>`。

不過關於 `<link rel="preload" ...>` 跟 `<link rel="prefetch" ...>` 是有一些差異的：

- preload 資源下載的時間點與上層並行，但 prefetch 會等上層下載完畢後才會開始。
- preload 的優優先權為中等（Medium/High），會立刻下載，但 prefetch 要等瀏覽器有空閒才會預取。
- preload 的資源應該盡快使用，而 prefetch 的資源則表示未來有可能會用到。

preload 相對比較耗資源，所以要謹慎使用。

比較一下兩者在 Chrome Devtools 的 Network 面板裡面的差異吧！（順序跟上面範例無關）

![使用 webpackPrefetch 時 Chrome Devtools 的 Network 面板](/images/webpack-dynamic-import-magic-comments-prefetch.jpg)

**使用 webpackPrefetch 時 Chrome Devtools 的 Network 面板**

![使用 webpackPreload 時 Chrome Devtools 的 Network 面板](/images/webpack-dynamic-import-magic-comments-preload.jpg)

**使用 webpackPreload 時 Chrome Devtools 的 Network 面板**

### webpackInclude

`webpackInclude` 可以接一個正規表達式，用來過濾掉動態路徑中不符合該正規表達試的檔案。

舉個方便說明的範例

```ts
import { Vue, Component } from 'vue-property-decorator'
import { skills } from '~/content/site'

@Component<TheSkill>({
  beforeCreate () {
    for(let i = 0; i < skills.length; i++) {
      const skill = skills[i].svg
      const fileName = `skill-${skill}.svg?inline`
      this.$options.components![skill] = () => import(
        /* webpackChunkName: "skill-svg" */
        /* webpackMode: "lazy-once" */
        `~/assets/images/svg/${fileName}`
      )
    }
  }
})
export default class TheSkill extends Vue {
  private skills = Object.freeze(skills)
}
```

現在導入的動態路徑為 `~/assets/images/svg/${fileName}`，這表示在所有 `~/assets/images/svg/` 之下的檔案都會被打包起來，裡面可能還含有其他的 SVG，例如 facebook.svg、twitter.svg ... 之類的。不過好在一開始我有將 skill 相關的 SVG 開頭都以「skill-」區隔開來，這時我就可以加上 `/* webpackInclude: /^skill-/  */` 這樣打包出來的模塊就不會含有不是以「skill-」為開頭的當案了！

前面會包含所有檔案的原因是因為 webpack 沒辦法預知那些是使用者真正需要的，因此他只會依照他能分析的最大限度去打包。以這個範例來說，他最多可以辨識到 `~/assets/images/svg/` 這個路徑下的檔案，如果沒有提供 `webpackInclude` 或 `webpackExclude` 幫助篩選，那他就會把這些全部包起來。

但其實這個範例路徑只要變成 `~/assets/images/svg/skill-${skill}.svg?inline`， webpack 就能知道他需要打包的是 skill- 開頭，且副檔名為 svg 的檔案了。（所以說這只是方便說明的範例）

### webpackExclude

`webpackExclude` 一樣接收一個正規表達式，但這裡的的行為是：如果符合正規表達式，就排除這個檔案。例如可以排除掉所有不是 svg 的檔案，或是所有不是 JSON 格式的檔案。`webpackExclude` 跟 `webpackInclude` 兩者在專案中可依照自己的需求搭配使用。

### webpackExports

這個部分是 webpack 5 推出的新功能，在目前 webpack 4 的環境中沒有辦法實際驗證。所以以下內容是看完 webpack 的 releases 後的理解，尚未實測。

`webpackExports` 是 webpack [v5.0.0-beta.18](https://github.com/webpack/webpack/releases/tag/v5.0.0-beta.18) 後的新功能，按照 releases 裡面的說明它可以更精準的切分程式碼。例如我只需要整份動態載入的檔案的某個 export，例如叫做 `theme` 但！一般情形下會整包阿哩阿雜的都被打包起來，這時就可以利用 `/* webpackExports: "default" */` 或 `/* webpackExports: ["default", "theme"] */` 等方式將不需要的部分切分開來。

### 補充

1. `/* webpackIgnore: true */` 表示禁用該動態載入，我目前暫時想不到有什麼需求會使用到他。
2. 動態載入無法使用於完全動態的路徑，像是：`import(path)`，因為這表示檔案可能來自整包專案的任何路徑，很可怕。
3. 上面的範例都是這樣寫：

  ```js
  import(
    /* webpackChunkName: "svg-skills" */
    /* webpackMode: "lazy-once" */
    `~/assets/images/skills/${skill}.svg?inline`
  )
  ```

  但其實也可以這樣寫：

  ```js
  import(
    /*
      webpackChunkName: "svg-skills",
      webpackMode: "lazy-once"
    */
    `~/assets/images/skills/${skill}.svg?inline`
  )
  ```

  效果一樣，就看自己或團隊比較偏好哪一種風格了。

## 結語

在前言中提到的 PageSpeed Insights 的最大內容繪製效能議題，最後在 Skill 區塊動態載入的 svg components 部分加上 `/* webpackMode: "eager" */` 後獲得了非常明顯的改善。最大內容繪製時間從 1.9s 下降到約 1.2s，總分從 92 上升到 97 左右，並且未來如果需要調整技能清單時，只要修改清單內容，新增或刪除 svg 圖檔，就不需要修改到這一份 components 內容了。

在過去在專案中，除了 `webpackChunkName` 外其他 Comments 還真的沒有用過。但像是 `webpackPrefetch` 這個 Comments 就非常有用。像是 Nuxt.js 預設並不會對動態載入的模塊加上 prefetch 的資源提示，適當的在動態導入的模塊加上 `webpackPrefetch`，多少能為使用者體驗帶來一些改進。

### 參考資料

- [Module Methods | webpack](https://webpack.js.org/api/module-methods/)
- [Code Splitting | webpack](https://webpack.js.org/guides/code-splitting/#prefetchingpreloading-modules)
- [webpack v5.0.0-beta.18](https://github.com/webpack/webpack/releases/tag/v5.0.0-beta.18)
