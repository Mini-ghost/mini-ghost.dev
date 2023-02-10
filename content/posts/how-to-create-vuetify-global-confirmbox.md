---
title: 如何在 Vuetify 加入共用的 ConfirmBox
tags: 
  - JavaScript
  - Vue
  - Vuetify
created: 2021-09-19T18:33:26.128Z
image: https://og-image-mini-ghost.vercel.app/如何%E5%9C%A8%20Vuetify%20%E5%8A%A0%E5%85%A5%E5%85%B1%E7%94%A8%E7%9A%84%20ConfirmBox?fontSize=82
image_caption: 如何在 Vuetify 加入共用的 ConfirmBox
description: 在 Element-ui 中提供了 $alert、$notify、$message 這些方法，讓我們可以依照需求開啟對話框確認使用者的操作，或是叫出 Toast（或 Snackbar）針對使用者的操作結果進行回饋。但在 Vuefiy，雖然有 VDialog、VSnackber 這些 Component 卻沒有提供這類全域方法使用。這篇紀錄了我在真實專案中用到的解決方法，那就讓我們一起看下去吧！
---

## 前言

關於這個主題，稍微 Google 一下就會找到蠻多外國大大分享實作全域 Dialog、Snackber 的方法，不過大多都會搭配 Vuex 使用。在這裡我不會用到 Vuex，而是採用 Vue 2.6.0 新增的 `Vue.observable()` 搭配 VDialog Component 實作。

關於 `Vue.observable()` 這個 API 的重點如下，取自官方文件：

> The returned object can be used directly inside **render functions** and **computed properties**, and will trigger appropriate updates when mutated. It can also be used as a minimal, cross-component state store for simple scenarios

在小專案中，可以用它來替代 Vuex 的功能，當作是一個小的狀態的儲存中心。

這次的主題會有三個部分

1. ConfirmBox 響應狀態物件：管理 ConfirmBox 的狀態，像是標題、內容或是一些細部得設定。
1. Global ConfirmBox Component：全域 Component 根據狀態的變化來顯示內容，以下簡稱：GConfirmbox。
1. Global method：設計一個 function 並且注入到 Vue 的 prototype 上，讓所有 Vue Component 都可以調用這個方法。

## ConfirmBox 響應狀態物件

首先來設計狀態管理的物件，ConfirmBox 資料必須要有：

- `title`：ConfirmBox 的標題，讓使用者知道要跟他確認的內容是什麼。
- `content`：如果 title 不夠敘述，需要更詳細的描述可以寫在 content 裏面（選填）。
- `props`：因為是搭配 VDialog Component 實作，如果需要對 VDialog 做細部調整，可以從這裡設定（我自己只有拿來改寬度）

那我們就利用 `Vue.observable()` 建立一個可響應的狀態管理物件吧！

```ts
// props.ts
// 這裡定義了 VDialog 可接受的 Props 跟預設的狀態

/**
 * Vuetify VDialog Props interface
 *
 * @see https://vuetifyjs.com/en/api/v-dialog/#props
 */
export interface VDialogProps {
  // 略
}

/**
 * g-confirmbox 預設的 v-dialog props
 */
export const defaultProps: Partial<VDialogProps> = {
  maxWidth: '420px'
}
```

```ts
// state.ts

export interface ConfirmboxOptions {
  title: string
  content?: string
  props?: Partial<VDialogProps>
}

export interface ConfirmboxState {
  active: boolean
  resolve: () => void
  reject: () => void
}

const noop = () => {}

export const defaultState: ConfirmboxState & ConfirmboxOptions = {
  active: false,
  title: '',
  resolve: noop,
  reject: noop,
  props: defaultProps
} as const

export const state = Vue.observable(Object.assign({}, defaultState))
```

這裡分出 `ConfirmboxOptions` 與 `ConfirmboxState` 兩個 interface，一個是給使用者填入的，一個是內部使用。接下來我們來實作 GConfirmbox Component 並依照上面設計的 state 變化顯示不同的畫面。

## GConfirmbox Component

```html
<template>
  <v-dialog
    v-model="state.active"
    v-bind="state.props"
    @input="(value) => value || onCancle()"
  >
    <v-card>
      <v-card-title>
        {{ state.title }}
      </v-card-title>
      <template v-if="state.content">
        <v-card-text>
          {{ state.content }}
        </v-card-text>
      </template>
      
      <v-card-actions>
        <v-spacer />
        <v-btn @click="onCancle">
          取消
        </v-btn>
        <v-btn
          color="primary"
          @click="onConfirm"
        >
          確認
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import { state } from './../state'

export default Vue.extend({
  name: 'GConfirmbox',
  computed: {
    state: {
      get () {
        return state
      }
    }
  },
  methods: {
    onCancle () {
      this.state.reject?.()
    },
    onConfirm () {
      this.state.resolve?.()
    }
  }
})
</script>
```

因為透過 `Vue.observable()` 回傳的物件具有資料響應的能力，因此接下來只要提供一個全域的方法，讓我們在需要的時呼叫他設定全域 ConfirmBox 的內容，並開啟就完成了。

> 在 Vue 2 的 `Vue.observable()` 傳入的物件會被變更成響應的物件，跟回傳的會是同樣的物件。但在 Vue 3 只有回傳的會是響應物件，所以建議一律使用回傳的物件。

## 設計全域的方法

我們先來設計一個 function，這個 function 接受一個參數，用來設定要顯示的 ConfirmBox 內容，並回傳一個 Promise 物件，來處理後續使用者按下確認或是取消：

```ts
// index.ts

import { state, defaultState } from './state'

/**
 * @param {Object | String} options    confirm title 或是設定
 * @param {String} options.title       confirm title
 * @param {String} options.content     confirm 的內容敘述
 * @param {Object} options.props       傳給底層 v-dialog 的 props
 */
function $confirm (options: string | ConfirmboxOptions) {
  return new Promise<void>((resolve, reject) => {
    if (typeof options === 'string') {
      options = {
        title: options,
      }
    }

    state.title = options.title
    state.content = options.content
    state.props = { ...options.props, ...defaultState.props }

    // 觸發同意
    state.resolve = () => {
      state.active = false
      resolve()
    }

    // 觸發取消
    state.reject = () => {
      state.active = false
      reject()
    }

    // 等待資料修改玩才打開 Dialog
    Vue.nextTick(() => {
      state.active = true
    })
  })
}
```

這裡受到使用 Element-ui 的影響，設計成可以接受一個字串或是物件，如果當使用者按下了「確認」就會執行  `resolve()` 取消則執行 `reject()`

接著把寫好的方法與 Component 包成一個 Vue 的 Plugin，當 Vue 使用了這個 Plugin 他會註冊一個全域 Component，並將 $confirm 這個 function 注入到 Vue 的 prototype 裡面，讓在 Vue Component 裏面可以用 `this.$confirm()` 的方始開啟 ConfirmBox

```ts
// index.ts

const globalConfirmbox: PluginObject<undefined> = {
  install (_Vue_) {
    _Vue_.component('GConfirmbox', GConfirmbox)
    _Vue_.use(() => {
      Object.defineProperty(Vue.prototype, '$confirm', {
        get: () => $confirm,
      })
    })
  }
}

export default globalConfirmbox
```

最後既然是寫 TypeScript，補上型別是一定要的

```ts
declare module 'vue/types/vue' {
  interface Vue {
    $confirm: typeof $confirm
  }
}
```

## 使用

在 main.ts 中 use 這個 Plugin

```ts
import Vue from 'vue'
import globalConfirmbox from './plugins/global-confirmbox'

Vue.use(globalConfirmbox)

// 下略
```

並且在 `App.vue` 中掛上 GConfirmbox Component

```html
<template>
  <v-app>
    <!-- 略 -->
    <g-confirmbox />
  </v-app>
</template>
```

這樣就完成了！接下來我們就可以在我們需要的時候打開這個全域的 ConfirmBox 囉！

```ts
// 任何地方

import Vue from 'vue'

export default Vue.extend({
  // 略
  methods: {
    onConfirm () {
      this.$confirm({
        title: '打開 ConfirmBox',
        content: '透過按鈕打開確認用的對話框'
      })
        .then(() => {
          // 做一些事情
        })
        .catch(() => {
          // 做一些事情
        })
    }
  }
})
```

## 結語

這篇的內容非常的簡單，但因為看到大多數文章都會需要搭配到 Vuex 實在覺得有點殺雞用牛刀，因此想提供一些其他選擇；基於上述的內容也可以用在建立一個全域的 Snackbar 或是在自己的 Toast Component 上面，希望這些內容對你們有幫助。

### 範例

- [Mini-ghost/vuetify-global-confirmbox](https://github.com/Mini-ghost/vuetify-global-confirmbox)

### 參考資料

- [How to create a global snackbar using Nuxt, Vuetify and Vuex.](https://dev.to/stephannv/how-to-create-a-global-snackbar-using-nuxt-vuetify-and-vuex-1bda)
- [API — Vue.js](https://vuejs.org/v2/api/index.html#Vue-observable)
