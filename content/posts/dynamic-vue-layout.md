---
title: 使用 Vue.js 實作動態布局（Dynamic Layout）
tags: 
  - Vue
  - Gridsome
  - Dynamic Layout

created: 2020-06-10T22:31:55.435Z
image: /images/dynamic-vue-layout.png
image_caption: 使用 Vue.js 實作 Dynamic Layout（動態布局 / 動態版面配置）
description: 在使用 Vue 在製作比較複雜的專案時，可能會因應不同的頁面需求需要有多種不同的 Layout 設定，在 Nuxt.js 可以輕鬆的利用屬性來設定，但在 Vue CLI 下或是 Gridsome 中要如何實作呢？這裡將分享幾種實作方式。
---

在本文當種會提到這些內容：

- 使用 Vue 2.6.0+ 版本的 `Vue.observable(object)` 實作 Dynamic Layout
- 使用 **無渲染組件（Renderless Components）** 實作 Dynamic Layout（目前使用）
- 使用 Vue-router 的 `afterEach` hook 實作 Dynamic Layout

這幾三種都會需要用到 **動態組件（Dynamic Components）**

```html
<component :is="ComponentName"/>
```

---

## 前言

在工作上的專案開發大多時間使用 Nuxt.js 作為前端框架，雖然沒有 SSR 的需求，但因為自動化的 Router 生成跟強大的 Layout 設定，讓團隊非常依賴他。不過如果今天一但有需要多布局設定的需求，就離不開 Nuxt 了嗎？

基於這個理由我花了一點時間研究、搜尋實作 Dynamic Layout 的方法，並把他導入這個使用 Gridsome 的部落格中。這篇紀錄將會以 Gridsome 環境為主，Vue CLI 的可能要在稍加轉換。

最一開始我的我是這樣處理（但我現在不太會考慮這個做法）

```html
<template>
  <div class="app">
    <nav 
      v-if="showNav" 
      class="__nav"
    >
      <!-- nav -->
    </nav>
    <router-view/>
    <footer 
      v-if="showFooter" 
      class="__footer"
    >
       <!-- footer -->
    </footer>
  </div>
</template>
```

這樣就可以透過兩個參數來決定 nav 跟 footer 要不要顯示，我一開始從 Vue CLI 轉換到 Nuxt 時真的這樣幹過，然後當專案越做越大...我就起笑了！

顯然，面對比較大的專案，這可能是自殺式的寫法。

另外一種方法是新增一個 layout 資料夾裡面管理這個種不同布局設定，例如 Nuxt 或 Gridsome 初始化後都會有一個 layout 資料夾。在 Gridsome 會這樣處裡

**建立 Layout**

```html
<!-- Layout -->
<template>
  <div>
    <header />
    <slot /> <!-- Page content will be inserted here  -->
    <footer />
  </div>
</template>
```

**導入 Layout**

```html
<!-- Page -->
<template>
  <Layout>
    Add page content here
  </Layout>
</template>

<script>
import Layout from '~/layouts/Default.vue'

export default {
  components: {
    Layout
  }
}
</script>
```

這樣乍看很方便，不過這樣有一個潛在的問題：不論 Layout 是否相同，只要換頁，所有 Components 包含 Layout Components 都會被銷毀重建。

所以要想個辦法減少這種不必要的性能開銷。

---

## 使用 `Vue.observable(object)` 實作 Dynamic Layout

在上一篇關於 Dark Mode 的分享中有提到如何使用 `Vue.observable(object)`，簡單來說就是：將資料轉換成具有響應能力的資料。

所以我們要怎麼將它拿來實作 Dynamic Layout 呢？

### 1. 建立資料管理物件 layout.ts

```ts
// '~/plugin/theme.ts'
import Vue from 'vue'

export interface LayoutObserver {
  value: string
}

export const layout: LayoutObserver = Vue.observable({
  layout: 'Default',
  
  get value() {
    window.__VUE_LAYOUT_OBSERVER__ = this
    return this.layout
  },

  set value(value) {
    this.layout = value
  }
})
```

建立一 layout 資料管理物件，主要只給外部使用者（自己）使用 value 屬性，外部可以透過 `set value(value)` 去修改 `layout` 的值，讀取的部分則用 `get value()` 來取得當前的 `layout` 值。

這裡有一個小小的技巧，當用 get 讀取 `layout.value` 這個值得時候，他一併會將整個 `this` 賦值到 `window.__VUE_LAYOUT_OBSERVER__` 上，之後就可以在組件內直接用 `window.__VUE_LAYOUT_OBSERVER__.value` 去讀取、修改 layout 的值，而不需要每一頁都把 layout 物件 import 到檔案裏面。

### 2. 修改 App.vue

如果是在 Gridsome 裡面，可以在 `sec/` 下新增 App.vue 蓋過預設值

```html
<template>
  <div id="app">
    <components
      :is="layout.value"
      class="__layout"
    >
      <router-view />
    </components>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { layout } from '~/plugin/layout'

@Component<App>({})
export default class App extends Vue {
  get layout () {
    return layout
  }
}
</script>
```

### 3. 在 Page 中指定 layout

有了上面的設定，就可以在各個 Page 組件中使用了，這裡我選用了 Vue-Router 生命週期 `beforeRouteEnter (to, from, next)`

```typescript
@Component<Index>({
  beforeRouteEnter (to, from, next) {
    window.__VUE_LAYOUT_OBSERVER__.value = 'Default'
    next()
  }
  //...
})
export default class Index extends Vue {}
```

只要在 `beforeRouteEnter` 告訴 `window.__VUE_LAYOUT_OBSERVER__.value` 這個頁面要用什麼 Layout Component 名稱，因為這個變數現在是響應式資料，所以一更動，Vue 就會通知前面用到的 `<components :is="layout.value">` 改變用到的組件，達到 Dynamic Layout 的效果。

會選用 `beforeRouteEnter (to, from, next)` 這個 hook 主要是因為這主要是因為這可以算是在 Vue 生命週期中，最最早被呼叫的，比 `beforeCreate` 更早，但缺點就是不能使用 `this`，這也是一開始會使用 `window.__VUE_LAYOUT_OBSERVER__` 當作存取點的另一個原因。

### 4. 補充

**1. 在其他生命週期中使用**

如果不在乎要在實例建立之前更改 Layout 這件事，可以在 `main.ts` 中將 `layout` 這個資料管理物件掛在 `Vue.prototype` 上：

```typescript
// main.ts
import { layout } from '~/plugin/layout'

const client = (Vue, { appOptions, isClient }) => {
  appOptions.$layout = theme

  Vue.use(() => {
    Object.defineProperty(Vue.prototype, '$layout', {
      get() {
        return theme
      }
    })
  })
}
```

這樣，上面的部分就可以改成這樣，或是在更之後的 hook 使用 `this.$layout.value` 修改：

```javascript
beforeRouteEnter (to, from, next) {
  next(vm => {
    // 可透過 vm 取得 component 實例
    vm.$layout.value = 'Default'
  })
}
```

這樣在 Components 裡面任意可以取得 `this` 或組件實例的地方都可以任意修改 Layout 了！

會這樣講一方面強調很方便，但不小心使用，其實也蠻可怕的！

**2. 等等！一定要用 Vue.observable() 嗎？**

`Vue.observable()` 的目的是為了讓物件具有視圖響應的能力，並在初始化的同時，將自己賦值給 `window.__VUE_LAYOUT_OBSERVER__` ，但如果 App.vue 裡面這樣處理，在現行 Vue 2.x 下， `layout` 這包資料管理物件是不需要再特別處裡的。

```typescript
import { Vue, Component } from 'vue-property-decorator'
import { layout } from '~/plugin/layout'

@Component<App>({})
export default class App extends Vue {
  layout = layout
}
```

因為他也會將原本的物件轉換成具有圖響應的能力的資料。

### 5. 優缺點

- 優點
  - 實作簡單。
  - 無多餘的組件開銷。
- 缺點
  - 需要使用 `window.__VUE_LAYOUT_OBSERVER__`，個人不偏好這樣把變數暴露在 `window` 裡面並在實作中取用（可以每個 page component 都引入 layout 管理物件解決，或是用補充提到的方式）。
  - 這種方式無法設定預設值，只要有一個 page component 沒有設定，他就只能被上一個有設定的頁面擺布，也就是每一頁都必須盡量在同一個生命週期中設定 Layout，有點麻煩。
  - 不能動態載入 Layout（或是說比較麻煩）。

---

## 使用 無渲染組件（Renderless Components）實作 Dynamic Layout

這是在 Markus Oberlehner 大神的部落格上看到的方法，原文我放在參考連結裡面。

也是目前採用的方法，而這個方法的核心是 **無渲染組件（Renderless Components）**，我這裡不會對 Renderless Components 多做說明，相關資訊一樣放在參考連結裡面。

### 1. 建立無渲染 Layout Components

首先建立一個名為 Layout.vue 的 Renderless Components

```typescript
import { VNode } from 'vue'
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component<Layout>({
  created () {
    this.$parent.$emit('update:layout', this.name)
  },
  render () {
    return (this.$slots.default as VNode[])[0]
  }
})
export default class Layout extends Vue {
  @Prop({ type: String, default: 'Default' }) readonly name!: string
}
```

這個 Layout Components 本身不會 render 出任何 HTML 結構，他接受一個 `name` 的 Props，當 Components 建立後會呼叫 `this.$parent` 上的 `$emit`。更新 `layout` 這個資料。

雖然使用 `this.$parent.$emit` 算是一種反模式，但因為這個組件必須緊緊跟隨在 View Component `<router-view />` 後，所以這個情況下是還可以的。

### 2. 修改 App.vue

接下來修改 App.vue 的部分：

```html
<template>
  <div id="app">
    <components
      :is="layout"
      class="__layout"
    >
      <router-view :layout.sync="layout" />
    </components>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component<App>({})
export default class App extends Vue {
  layout: string = 'Default'
}
</script>
```

我們在 View Component 加上一個同步的 layour 屬性 `<router-view :layout.sync="layout" />` 這樣他就可以透過 `update:layout` 事件更新 layout 這項資料。

### 3. 在 Page 中指定 layout

```html
<template>
  <Layout name="LayoutName">
    <div class="blog">
      <!-- blog content -->
    </div>
  </Layout>
</template>
```

也因為這個 Layout Components 本身不會 render 出任何 HTML 結構，所以這裡不會影響最後的視圖結構，這樣就可以在每一個 Page Components 裡面使用，而如果沒有給 `name` 這個 Props 的話則會用預設值 `Default`。

### 4. 優缺點

- 優點
  - 實作更簡單。
  - 視圖結構直觀明確。
- 缺點
  - 需要多一個組件消耗。
  - 在 Layout Components 下只能有一個節點。這應該算是 Vue 2.x 下 Renderless Components 的技術限制。

---

## 使用 Vue-router 的 `afterEach` hook 實作 Dynamic Layout

這個方式是從 Nuxt.js 開發時生成的 `.nuxt/client.js` 中挖到的片段改寫而成。他可以在 Vue Opiotns 中用 layout 屬性去動態更改 Layout 設定，使用起來很像 Nuxt.js 的 layout 設計方式。

### 1. 建立資料管理物件 layout.ts

我們需要一個管理 layout 的物件，分別引入 main.ts 與 App.vue 裡面。

```typescript
// ~/plugin/layout
export const layout = {
  value: 'Default'
}
```

### 2. 修改 App.vue

我們將這個資料管理物件引入到 修改 App.vue

```html
<template>
  <div id="app">
    <components
      :is="layout.value"
      class="__layout"
    >
      <router-view />
    </components>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { layout } from '~/plugin/layout'

@Component<App>({})
export default class App extends Vue {
  get layout () {
    return layout
  }
}
</script>
```

其實跟第一種方法的 App.vue 一模一樣

### 3. 在 Page 中指定 layout

接下來我們先到 Page Components 設定 layout，例如部落格的 Layout 名稱叫做 Blog，那就會長這樣子

```typescript
import { Vue, Component } from 'vue-property-decorator'

@Component<Blog>({
  layout: 'blog',
  // OR
  layout () {
    return 'blog'
  }
})
export default class Blog extends Vue {}
```

### 4. 在 main.ts 中處裡 `router.afterEach`

上面 3 個步驟準備好就要進入到重點哩，我們先來看看 `router.afterEach` 屬性定義：

```typescript
afterEach(hook: (to: Route, from: Route) => any): Function
```

`router.afterEach` 會執行在路由切換之後，Page Components 建立之前執行。跟其他的 Vue Router Navigation Guards 一樣接收一個 function 當參數，不一樣的是，這個 function 只接受兩個參數：

- `to: Route`：即將要進入的目標路由物件（Route Object）
- `from: Route`：當前要離開的路由物件

所以在 main.ts 這樣處裡：

```typescript
import { layout } from '~/plugin/layout'

const client = (Vue, { router }) => {
  router.afterEach((to, from) => {
    // @ts-ignore
    let layoutProperty = to.matched[0].components.default.options.layout

    if (typeof layoutProperty === 'function') {
      layoutProperty = layoutProperty()
    }

    layout.value = layoutProperty || 'Default'
  })
}
```

`to.matched` 比較少使用，來看看他是什麼：[Vue Router API 參考](https://router.vuejs.org/zh/api/#%E8%B7%AF%E7%94%B1%E5%AF%B9%E8%B1%A1)

`to.matched` 為一個 `Array<RouteRecord>`，包含當前路由的所有套崁路徑片段的**路由紀錄（Route Records）**。而路由紀錄就是 `routes` 的設定陣列。

```javascript
const router = new VueRouter({
  routes: [
    // 下面的就是 Route Records
    // $router.matched[0]
    {
      path: '/foo',
      component: Foo,
      children: [
        // 這裡也是 Route Records
        { path: 'bar', component: Bar }
      ]
    }
  ]
})
```

所以上面可以透過 `to.matched[0].components.default.options.layout` 取得 Page Components 上的 layout 屬性值。我這裡仿 Nuxt.js 設計，讓 layout 屬性值可以是一個 `string` 或是 `() => string` 並且將值傳給資料管理物件。

在第二步驟時，已經將資料管理物件 `layout` 引入到 App.vue 當中，並綁定到 Dynamic Components 的 `:is` 上。這時每當切換路由，都會讀取新的 Page Components 上的 layout 值，需要時就會改變 App.vue 上的 Dynamic Components。

### 5. 優缺點

- 優點
  - 無多餘組件開銷。
  - 貼近 Nuxt.js 使用習慣（對我來說算優點）
- 缺點
  - 實作上應該是三種當中，相對複雜的。
  - 不能動態載入 Layout（或是說比較麻煩）

---

## 同場加映 Dynamic imports

以上所有方法，都要把會用到的所有的 Layout Components 先註冊起來：

```typescript
import DefaultLayout from '~/layouts/Default.vue'
import BlogLayout from '~/layouts/Blog.vue'
import ErrorLayout from '~/layouts/Error.vue'

Vue.component('Default', DefaultLayout)
Vue.component('Blog', BlogLayout)
Vue.component('Error', ErrorLayout)
```

但如果是一些比較少用到的 layout 都一起打包帶走的話，實在有一點點冗，這時就可以考慮動態引入！

以第二種方法來說，可以在 **無渲染 Layout Components** 的 `created()` 裡面這樣做：

```typescript
import { VNode } from 'vue'
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component<Layout>({
  created () {
    // @ts-ignore
    if(!Vue.options.components[this.name]) {
      Vue.component(this.name, () => import(
        /* webpackChunkName: "layout--template-[request]" */
        `~/layouts/${this.name}.vue`
      ))
    }
    this.$parent.$emit('update:layout', this.name)
  },
  render () {
    return (this.$slots.default as VNode[])[0]
  }
})
export default class Layout extends Vue {
  @Prop({ type: String, default: 'Default' }) readonly name!: string
}
```

這樣，在每次再無渲染 Layout Components 被建立時，都會去檢查 Vue 上面使否已經有相對應名稱的全域 Components，如果沒有，才再引入。

透過這種方式就可以將一些不常使用的 Layout Components 改成動態引入，可以稍稍稍稍的優化 bundle size

## 結語

第一個是這個部落格最最早期的作法，使用了個一下午後就轉換到第二個方法，大神的 code 果然香。後來又發現了第三種作法，有空的話會考慮轉換過去，目前還在評估能不能用其他方式執行 Layout Components 的動態載入。

上面的三種方法，都可以依照使用場景的不同在做調整，放在這裡也讓自己未來在其他地方需要時可以快速查詢。不知道為什麼，關於 Dynamic Layout Components，好像鮮少有中文（繁、簡）網站有提到的。

_還是只是關鍵字沒下好？_

最後的參考連結，中還有其他的實作方式，例如從 Vue Router 設定下手，不過 Gridsome 的Router 設定只能以資料夾結構生成，所以就沒有採用。

### 參考連結

- [Layouts with Vue.js - How to Create Dynamic Layout Components](https://markus.oberlehner.net/blog/dynamic-vue-layout-components/)
- [😲VueJS pages with Dynamic layouts! Problems and a solution!](https://dev.to/lampewebdev/vuejs-pages-with-dynamic-layouts-problems-and-a-solution-4460) - _留言區也有寶可以挖_
- [Renderless Components in Vue.js](https://adamwathan.me/renderless-components-in-vuejs/)
- [Anyway, here’s how to create a multiple layout system with Vue and Vue-router](https://itnext.io/anyway-heres-how-to-create-a-multiple-layout-system-with-vue-and-vue-router-b379baa91a05)
