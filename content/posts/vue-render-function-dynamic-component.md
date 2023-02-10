---
title: 簡單的 Vue Render Functions 與動態組件的綜合應用
tags: 
  - Vue
  - Vue Components
created: 2020-05-12T19:46:19.329Z
image: /images/vue-render-function-exp.png
image_caption: Vue Render Functions
description: 在開發 Vue 專案的時候，單檔組件（SFC）提供了開發者非常好的便利性。但有時候在某些特殊情況時 Render Functions 提供了更好的靈活性，可以讓組件寫得更優雅。那我們該怎麼應用呢？
---

在本文當中主要會提到以下幾件事情：

1. Vue Render Functions 基本使用方式。
2. Vue 內建組件 `<component />` 中 `is` 的一些細節。
3. **簡單的 Vue Render Functions 與動態組件的綜合應用。**

---

## 前言

最一開始接觸到 Render Functions 是在 React 的範例裡，在 React 幾乎會將所有的 HTML 與 JavaScript 寫在同一塊，也就是常聽見的 JSX / TSX。

不過在 Vue 裡面 SFC 提供了更棒的編輯環境，讓我們可以在單一個檔案裏面，將 HTML、CSS 與 JavaScript 區塊切分得一清二楚，為開發流程帶來了很大的便利。但前端工程師有這麼好當就好了，總有個例外會讓我們開始懷疑人生。這個狀況出現在下面這個例子：

假設，以現在這個 Blog 的文章標題組件來說。在 Blog 首頁的 HTML 標籤是 `<h2>`，但切換到文章頁面後則變成 `<h1>`，這時我又想只用一個組件搞定！聰明如我想到了下面的解法：

```html
<template>
  <h1 
    v-if="tag === 'h1'" 
    class="article-title"
  >
    {{ title }}
  </h1>
  <h2 
    v-else-if="tag === 'h2'" 
    class="article-title"
  >
    {{ title }}
  </h2>
  <h3 
    v-else-if="tag === 'h3'" 
    class="article-title"
  >
    {{ title }}
  </h3>
  <h4 
    v-else-if="tag === 'h4'" 
    class="article-title"
  >
    {{ title }}
  </h4>
  <h5 
    v-else-if="tag === 'h5'" 
    class="article-title"
  >
    {{ title }}
  </h5>
  <h6 
    v-else-if="tag === 'h6'" 
    class="article-title"
  >
    {{ title }}
  </h6>
</template>
```

~~條件判斷，完美解決~~

只有一兩個選項還好，如果今天組件要設計給使用者自由自輸入任意他想要的 HTML 標籤呢！？阿不就要寫到吐血！！！這時就可以使用一開始提到的 Render Functions 來化解囉！

---

## Render Functions（渲染函數）

Render Functions 比起在 template 中編輯 HTML，擁有更高的自由度。如果以上的需求在 Render Functions 當中會長什麼樣子呢？

```ts
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component<ArticleHeader>({
  render (createElement) {
    return createElement(
      this.tag,
      {
        staticClass: 'article-title'
      },
      [
        this.title
      ]
    )
  }
})
export default class ArticleHeader extends Vue {
  @Prop({ type: String, default: 'h1' }) readonly tag!: string
  @Prop({ type: String, default: '' }) readonly title!: string
}
```

搞定！看起來是不是非常簡潔呢？而且這時就算希望 HTML 標籤是 div 還是 span 都可以自由定義了，是不是超級便利呢？接下來讓我們稍微深入看看這神奇的 **Render Functions** 吧！

在 Vue 的 options.d.ts 中對於 `render` 的型別定義大概是這樣的：

```ts
export interface ComponentOptions {
  // 上略
  render?(createElement: CreateElement, context: RenderContext<Props>): VNode;
  // 下略
}
```

也就是說，`render` 會接收兩個參數 `CreateElement` 跟 `RenderContext`，後者主要用於 functional component，所以先把焦點放在 **`CreateElement`**

### createElement

`createElement` 是 Render Functions 裡最最最重要的參數，在 vue.d.ts 中是這樣定義的（簡化過）：

```ts
export interface CreateElement {
  (tag?: string | Component | AsyncComponent | (() => Component), children?: VNodeChildren): VNode;
  (tag?: string | Component | AsyncComponent | (() => Component), data?: VNodeData, children?: VNodeChildren): VNode;
}
```

`createElement` 接收 3 個參數，並回傳 `VNode`。其中 3 個參數，分別是：

**1. `tag`**

- Type：**`String | Object | Function`**
- 用法： 一個 HTHL 標籤、Component 名、Component 物件或是 resolve 前者任一種的 Async Function

**2. `data`**

- Type：**`Object`**
- 用法：像是範利用到的 `staticClass: 'article-title'` 就是填寫靜態 Class，或是 `class`綁定動態 Class，族繁不及備載，有興趣可以到 [官方文件上](https://cn.vuejs.org/v2/guide/render-function.html#深入数据对象) 查閱，或是在 vnode.d.ts 中找到 `VNodeData` 的 interface 查看囉！

**3. `children`**

- Type：**`String | Array`**
- 用法：如果該元素只包含一個文字節點，可以指輸入一個單純的字串。如果包含了多個不同的節點，則可以以陣列包字串或 VNode 表示，例如：

  ```ts
  createElement (
    'h1',
    [
      '我是一串字串',
      createElement ('p', '你看看我是內文')
      createElement (
        'router-link',
        {
          attrs: { to: '//mini-ghost.dev/blog' }
        },
        '我是路由連結文字'
      )
    ]
  )
  ```

註：如果只給兩個參數，那第二個參數則會變成 `children`

那 `VNode` 是什麼呢？可以簡單理解成是對應到真實 DOM Tree 每一個節點的詳細敘述表，當今天需要修改 DOM 時，其實是對敘述表上的內容作修改，Vue 會依照每次的修改內容找出最有效率的方式更新 DOM。

上述內容大概只是 createElement 的冰山一角，實際還有超多細節，就留給各位捧油慢慢發探索啦！

### context

如果是 Functional Component，Render Functions 會有第二個參數，因為 Functional Component 是沒有實例的，所以比需透過 `context` 來取得資料。

在[文件](https://cn.vuejs.org/v2/guide/render-function.html#函数式组件)中寫到 `context` 內的屬性 （_已將中國慣用語轉換成臺灣慣用詞_）

- `props`：提供所有 prop 的物件。
- `children`：VNode 子節點的陣列。
- `slots`：一個函數，回傳了所有 slot 的物件。
- `scopedSlots`：(2.6.0+) 一個傳入作用域 slot 的物件，包含了以函數方式呈現的普通 slot。
- `data`：串遞給自己的整包 data 物件，作為 createElement 的第二個參數傳入組件。
- `parent`：對於上層組件的參考。
- `listeners`：(2.3.0+) 一個包含了所有上層組件對自己監聽事件的物件。這是 data.on 的別名。
- `injections`：(2.3.0+) 如果使用了 inject 選項，則該物件包含了當前被注入的 property。

在 options.d.ts 裡面 `context` 是這樣被定義的，大概看看就好！

```ts
export interface RenderContext<Props=DefaultProps> {
  props: Props;
  children: VNode[];
  slots(): any;
  data: VNodeData;
  parent: Vue;
  listeners: { [key: string]: Function | Function[] };
  scopedSlots: { [key: string]: NormalizedScopedSlot };
  injections: any
}
```

如果是用 Render Functions 寫 Functional Component 的話可以參考參考！這裡因為標題部分非常單純，也不需要管理、響應任何 data 及生命週期，所以可以用 Functional Component 來提高一丁點性能。綜合以上內容，文章標題組件可以寫成這樣<sup><a href="#補充">[補充]</a></sup>（以下 createElement 簡寫為 h）：

```ts
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component<ArticleHeader>({
  functional: true,
  render (h) {
    const { tag, title, titleLink } = this
    return h (
      tag,
      {
        staticClass: 'article-title'
      },
      // 有給連結的話
      // 就用路由組件包起來
      titleLink
        ? [
            h('g-link', { attrs: { to: titleLink } }, title )
          ]
        : title
    )
  }
})
export default class ArticleHeader extends Vue {
  @Prop({ type: String, default: 'h1' }) readonly tag!: string
  @Prop({ type: String, default: '' }) readonly title!: string

  // 文章連結
  @Prop({ type: String, default: undefined }) readonly titleLink!: string
}
```

---

## 內建組件 component

上面基本上已經完成八九成了，但總覺得不滿意，就為了一個小小的標題開一個檔案，而且他還不會在其他地方被用到 ... ~~雖然這種狀況比比皆是~~。

這時我把歪腦筋動到了動態組件（Dynamic Components）上。動態組件，就是切換 `<component />` 組件中 `is` 的值來達到切換組件的效果。所以能不能將剛剛寫的組件當作 is 的值傳進去呢？先看看官方文件對於 `<component />` 的描述吧！

`<component />`

- props
  - is - `string | ComponentDefinition | ComponentConstructor`
  - inline-template - `boolean`

component 除了可以填入字串，也可以填入 ComponentDefinition？這裡我沒有很明白他的意思，但在 [文件的這裡](https://cn.vuejs.org/v2/guide/components.html#动态组件) 寫到 **已注册组件的名字，或
一个组件的选项对象** _（中國的 "对象" 就是 Object，也就是物件）_。所以理論上 Vue Options API 的物件是可以帶進去的？如果可以就太完美了！

結果，果然可以（撒花

接下來只要將上面的 Render Functions 放在物件當中，就可以不用新開一隻檔案，而是在組件裡面包一個組件，結果就會長得像這樣：

```html
<template>
  <header class="article-header">
    <!-- 其他的部分 -->
    <component
      :is="ArticleTitle"
      class="article-title"
    />
    <!-- 其他的部分 -->
  </header>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component<ArticleHeader>({})
export default class ArticleHeader extends Vue {
  @Prop({ type: String, default: 'h1' }) readonly tag!: string
  @Prop({ type: String, default: '' }) readonly title!: string
  @Prop({ type: String, default: undefined }) readonly titleLink!: string

  get ArticleTitle(): FunctionalComponentOptions {
    return {
      name: 'ArticleTitle',
      functional: true,
      render: (h, context) => {
        const { tag, title, titleLink } = this
        return h(
          tag,
          context.data,
          titleLink
            ? [
                h('g-link',{ attrs: { to: titleLink }}, post.title)
              ]
            : post.title
        )
      }
    }
  }
}
</script>
```

這裡有兩個部分可以稍微提一下：

1. 照理來說 `FunctionalComponentOptions` 裡面 `render` 的 `this` 是 `undefined`，但因為這裡用的 Arrow Function 所以 this 會指向上層組件 ArticleHeader，這樣就可以直接取用他的 props 了。
2. 這裡的 `context` 這個參數只有在 `FunctionalComponentOptions` 會出現，也就是 `functional: true` 的時候，裡面有的資料上面有提到，像是 context 的 data 就可以直接當第二個參數傳入 createElement 裡面。

到這裡基本上就已經完成 99.99% 了！

---

## 同場加映 JSX / TSX

說真的，Render Functions 自由度高雖高，但再怎麼樣閱讀起來就是沒有 HTML 直覺，這時 React 社群的 JSX 給了我們一道曙光，再加上 Vue 的 `render` 裡面是支援 JSX 的！那我還不寫爆他？

### 設定

在寫爆之前，還是有一些前置作業。這邊以 TypeScript 為例：

1. 在 `.vue` 檔案裏面，設定 `script lang="tsx"`，然後 Gridsome 用戶還得做以下設定。
2. `tsconfig.json` 中要加入以下設定，這些在 Vue-CLI 跟 Nuxt.js 都設定好了，開箱即用，但在 Gridsome 0.7.14 沒有標配。

  ```json
  {
    "compilerOptions": {
      "jsx": "preserve",
      "lib": [
        "esnext",
        "dom",
        "dom.iterable",
        "scripthost"
      ],
      "types": [
        "@types/node"
      ]
    }
  }
  ```

3. 新增 `shims-tsx.d.ts`。

  ```ts
  import Vue, { VNode } from 'vue';

  declare global {
    namespace JSX {
      // tslint:disable no-empty-interface
      interface Element extends VNode {}
      // tslint:disable no-empty-interface
      interface ElementClass extends Vue {}
      interface IntrinsicElements {
        [elem: string]: any
      }
    }
  }
  ```

4. npm 安裝 gridsome-plugin-typed `npm i gridsome-plugin-typed -D` [gridsome-plugin-typed](https://gridsome.org/plugins/gridsome-plugin-typed)。

## 範例改寫

完成以上步驟解渴以來寫爆拉！上面的 `render` 可以改成這樣

```tsx
get ArticleTitle (): FunctionalComponentOptions {
  return {
    functional: true,
    name: 'ArticleTitle',
    render: (h, context) => (
      <this.tag staticClass={context.data.staticClass}>
        {
          this.titleLink
            ? (
              <g-link to={ this.titleLink }>
                { this.title }
              </g-link>
            )
            : this.title
        }
      </this.tag>
    )
  }
}
```

這樣是不是好讀很多很多呢？不過還是要提醒幾件事

1. JSX 畢竟不是 Vue 的 template，那些 `v-bind`、`v-on`、`v-if`、`v-for` 都是不適用的。而且不論是 Render Functions 還是 JSX，`v-if` 就是得自己寫判斷，`v-for` 就是得自己寫迴圈。JSX 裡 `v-on:click="handleClick"` 要寫成 `onClick={ handleClick }`。
2. 在 Reat 中 class 變成了 `className` ，但在 Vue 裡面還是寫 `class` 或是 `staticClass`

以上很多東西都只有粗略提到，像是 `createElement` 的第二個參數就有超多可以深入挖掘的部分，這就留待以後慢慢摸索囉！

---

## 結語

Render Functions 看起來好潮！那就全部都用他來寫就好啦 ~ NO！在大多數時候 template 讓我們可以很容易地使用一些 directives，如：`v-bind`、`v-on`、`v-if` ...，但這些在 `render` 裡面全部都得自己手刻，而我仍然找不到可以寫出 `v-once` 的方法，我猜可能可以用 `staticRenderFns` 這個方法吧！？但我試了試就是變不出來，如果有擅長這一塊地捧油也希望可以分享一下囉！

除了偶爾滿足一下自己，Render Functions 我想主要還是應用在 UI Library 的設計吧！像是 **Vuetify** 幾乎 99.99% 都是用 `render` 寫的！吃飽太閒可以去挖出來研究研究。

另外像我目前已知的 **vue-slide-up-down** 跟 **vee-validate** 基本上也都是用 Render Functions 寫的，並解就像開頭提到，他們都可以自行輸入想要的 HTML 標籤。前者 JavaScript 原始碼大概約 130 行上下，非常值得找來爬一爬（我自己是從這個工具開始學 Vue Render Function 的啦！）

最後。感謝各位捧油們的耐心閱讀，如果有勘誤的地方也希望多多給小的回饋指教了（鞠躬

### 參考連結

- [渲染函数 & JSX — Vue.js](https://cn.vuejs.org/v2/guide/render-function.html)
- [动态组件 — Vue.js](https://cn.vuejs.org/v2/guide/components.html#动态组件)
- [介紹 JSX – React](https://zh-hant.reactjs.org/docs/introducing-jsx.html)

---

## 補充

### 2020-05-24 更新

前面有提到在 `@Component` 中撰寫 Functional Component，但後來發現 `vue-property-decorator` 所提供的裝飾器 Component 並不支援，他的型別定義如下：

```ts
declare function Component<V extends Vue>(options: ComponentOptions<V> & ThisType<V>): <VC extends VueClass<V>>(target: VC) => VC;
```

這裡並沒有提供 Functional Component 的選項，基本就已經過不了型別檢查這一關了。因此，這裡可能不能使用 vue-property-decorator，必須回到 Options API 的操作，如下：

```ts
import Vue from 'vue'

export default Vue.extend({
  name: 'ArticleHeader',
  functional: true,
  render (h) {
    const { tag, title, titleLink } = this
    return h (
      tag,
      {
        staticClass: 'article-title'
      },
      // 有給連結的話
      // 就用路由組件包起來
      titleLink
        ? [
            h('g-link', { attrs: { to: titleLink } }, title )
          ]
        : title
    )
  }
})
```
