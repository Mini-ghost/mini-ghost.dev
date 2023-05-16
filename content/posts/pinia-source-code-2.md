---
title: 深入淺出 pinia（二）：createOptionsStore
tags:
- Vue
- Pinia

created: 2023-05-13T00:00:00.001Z
image: https://og-image-mini-ghost.vercel.app/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA%20pinia.png?fontSize=72
description: Pinia 是目前 Vue 官方首推的狀態管理工具。這系列分享不會特別著重在如何使用 Pinia 而是深入剖析 Pinia 的原始碼，研究他的原始碼是如何撰寫的，從中吸收寶貴的經驗。在上一篇的內容我們先看了 Pinia instance 上有哪些東西，也初步了解了 defineStore 的功能。接下來會更深入了解 Options Store 的內部的實作。
---

## 前言

> 本篇的 pinia 版本為 2.0.36

如果有用過 Vuex 或是還沒有接觸過 Composition API 的話，Options Store 應該會是比較好上手的一個選擇，這也是官方建議可以優先嘗試看看的方式。

本篇將聚焦在 Options Store 的實作細節。

## Options Store

我們在第一篇知到，如果選擇了 Options Store 在 `useStore` 內會選執行 `createOptionsStore`，我們來看看這裡面做了什麼。

```js
function createOptionsStore(id, options, pinia) {
  const { state, actions, getters } = options

  const initialState = pinia.state.value[id]

  let store

  function setup() {
    if (!initialState) {
      if (isVue2) {
        set(pinia.state.value, id, state ? state() : {})
      } else {
        pinia.state.value[id] = state ? state() : {}
      }
    }

    const localState = toRefs(pinia.state.value[id])

    return Object.assign(
      localState,
      actions,
      Object.keys(getters || {}).reduce((computedGetters, name) => {
        computedGetters[name] = markRaw(
          computed(() => {
            setActivePinia(pinia)

            const store = pinia._s.get(id)

            if (isVue2 && !store._r) return

            return getters![name].call(store, store)
          })
        )
        return computedGetters
      }, {} as Record<string, ComputedRef>)
    )
  }

  store = createSetupStore(id, setup, options, pinia, true)

  return store as any
}
```

從上面程式碼我們很快可以看出來，其實 `createOptionsStore` 裡面做的事情非常單純，就是把 `options` 中的 `state`、`getters` 跟 `actions` 取出整理成 `setup` function，並透過 `createSetupStore` 來建立 Store。

我們一步一步往下看。

### 初始化 state

這是是定義 `state` 的方法，我們需要定義一個 state function，並且會回傳一個物件。

```ts
export const useStore = defineStore('STORE_ID', {
  // ⬇️ 我們定義的 state function
  state: () => {
    return {
      count: 0,
      name: 'Eduardo',
      isAdmin: true,
      items: [],
      hasChanged: true,
    }
  },

  // ...
})
```

回到實作部分，首先檢查 Pinia instance 上是否有 對應 store 的初始狀態。

```ts
const initialState = pinia.state.value[id]
```

為什麼要這樣做呢？我們可以透過 `@pinia/nuxt` 來探究原因（不熟悉 Nuxt 的也沒關係，下面這個是 Nuxt plugins 的寫法）。

```ts
import { createPinia, setActivePinia } from 'pinia'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = createPinia()
  nuxtApp.vueApp.use(pinia)
  setActivePinia(pinia)

  if (process.server) {
    nuxtApp.payload.pinia = pinia.state.value
  } else if (nuxtApp.payload && nuxtApp.payload.pinia) {
    pinia.state.value = nuxtApp.payload.pinia
  }

  // Inject $pinia
  return {
    provide: {
      pinia,
    },
  }
})
```

根據這段原始碼我們發現，這裡是為了要解決 Server Side Render（SSR）的問題。以 Nuxt 為例，在 Server 端時會先進行初始化，並且將 HTML 產出傳到前端，在這過程中可能會經歷一連串的資料請求，並且將取得的資料並存在 Store 裡面。

為了讓 Client 端可以取得到這些資料，Nuxt 會在 Server 端時會將 Pinia instance 上的 `state` 同步在 `nuxtApp.payload.pinia` 上，而在 Client 端初始化時會將 `nuxtApp.payload.pinia` 的資料同步到 Pinia instance 上。

所以如果 `initialState` 沒有資料我們定義的 state function 才會對 Pinia instance 上的 `state` 進行初始化，否則則沿用。

```ts
if (!initialState) {
  if (isVue2) {
    set(pinia.state.value, id, state ? state() : {})
  } else {
    pinia.state.value[id] = state ? state() : {}
  }
}
```

接著把 `pinia.state.value[id]` 的 `Reactive` 物件透過 `toRefs` 轉換裝著所有 `Ref` 資料的一般物件。

```ts
//                   這裡得資料是一個 Reactive ⬇️ 
const localState = toRefs(pinia.state.value[id])
//    ⬆️ 這裡會變成一般物件，裡面的資料都是 Ref
```

### 整理 getters

```ts
export const useCounterStore = defineStore('STORE_ID', {
  state: () => ({
    count: 0,
  }),
  
  // getter 會接收 state 當作參數，或是透過 `this` 來取得 state
  // ⬇️ Options API 的 getters
  getters: {
    doubleCount: (state) => state.count * 2,

    // 也可以透過 `this` 來取得 state
    tripleCount() {
      return this.count * 3
    },
  },
})
```

根據這個範例，我們可以知道 getters 是一個物件，裡面的每個 key 都是一個 function，這個 function 會接收 `state` 當作參數，或是透過 `this` 來取得 `state`。

```ts
Object.keys(getters || {}).reduce((computedGetters, name) => {
  computedGetters[name] = markRaw(
    computed(() => {
      setActivePinia(pinia)
      const store = pinia._s.get(id)

      // store._r 的註解：
      // Vue 2 only. Is the store ready. Used for store cross usage. 
      // Getters automatically compute when they are added to the store, 
      // before the store is actually ready, this allows to avoid calling 
      // the computed function yet.
      if (isVue2 && !store._r) return

      return getters![name].call(store, store)
    })
  )
  return computedGetters
}, {} as Record<string, ComputedRef>)
```

我們可以透過 `Function.prototype.call` 來改變 `this` 的指向，所以在每一個 getter function 內可以用 `this` 或是第一個參數，來取得 state。

```ts
//       ⬇️ 指定 this 的指向為 `state`
fun.call(thisArg, arg1, arg2, ...)
//                ⬆️ 第一個參數 `state`
```

為什麼要呼叫 `setActivePinia(pinia)`？在第一篇時我們有提到：**跨請求狀態污染（Cross-Request State Pollution）**。這裡一樣是為了避免污染的問題，另外也允許在 getter 裡面呼叫其他 store 的 狀態。

為了說明這一點我們來看一段 Pinia 的測試程式碼：

```ts
describe('Getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const useB = defineStore({
    id: 'B',
    state: () => ({ b: 'b' }),
  })

  const useA = defineStore({
    id: 'A',
    state: () => ({ a: 'a' }),
    getters: {
      fromB(): string {
        const bStore = useB()
        return this.a + ' ' + bStore.b
      },
    },
  })

  it('supports changing between applications', () => {
    const pinia1 = createPinia()
    const pinia2 = createPinia()
    setActivePinia(pinia1)
    const aStore = useA()

    // simulate a different application
    setActivePinia(pinia2)
    const bStore = useB()
    bStore.b = 'c'

    aStore.a = 'b'
    expect(aStore.fromB).toBe('b b')
  })
})
```

這段測試模擬了 `aStore` 跟 `bStore` 分別屬於不同請求（不同請求有不同的 Pinia instance 跟 vue application），如果今天是在「跨請求狀態污染」發生的情況下 `aStore.fromB` 的值可能就不會是 `b b`。

拆解一下這裡的執行步驟，並且以沒有 `setActivePinia(pinia)` 的情境跑一次流程：

1. 建立 Pinia instance 1，並且設定為當前的 Pinia instance。
2. 建立 `useA` store，並且設定為當前的 Pinia instance。
3. 建立 Pinia instance 2，並且設定為當前的 Pinia instance。
4. 建立 `useB` store，並且設定為當前的 Pinia instance。
5. 設定 `bStore.b` 的值為 `c`（初始值為 `b`）。
6. 設定 `aStore.a` 的值為 `b`（初始值為 `a`）。
7. 讀取 `aStore.fromB` 的值觸發 getter function，並且回傳 `aStore.a + ' ' + bStore.b`。
    1. 執行 `const bStore = useB()` 這個時候的 `activePinia` 是 Pinia instance 2
    2. Pinia instance 2 上的 `bStore.b` 為 `c`，所以回傳 `b c`。

如果沒有 `setActivePinia(pinia)` 的話，`aStore.fromB` 的值就會是 `a c` 與期望不符合，因為 `activePinia` 遭受到跨請求狀態污染。如果我們把 `setActivePinia(pinia)` 加回去的話，`aStore.fromB` 的值就會是 `b b`。

接續上述第 6 步驟的執行流程：

- 讀取 `aStore.fromB` 的值觸發 getter function，並且回傳 `aStore.a + ' ' + bStore.b`。
    1. 這個時候的 `activePinia` 是 Pinia instance 1，執行 `const bStore = useB()`。
    2. Pinia instance 1 沒有 `bStore`，所以建立一個  `bStore`。
    3. Pinia instance 1 上的 `bStore.b` 沒有被修改過，為預設值 `b`，所以回傳 `b b`。


### 合併 state、actions 跟 getters

```ts
function createOptionsStore(id, options, pinia) {
  function setup() {
    return Object.assign(
      localState,
      actions,
      getter
    )
  }

  store = createSetupStore(id, setup, options, pinia, true)
}
```

最後將整理好的屬性合併，這裡會因為後蓋前，所以如果有相同的屬性， `state` 會被 `actions` 跟 `getters` 覆蓋。


## 結語

綜合以上的內容，我們可以整理出 Option Store 的實作內容：

- **初始化 state**，這裡在初始化時需要考量 SSR 的問題，所以僅在 `pinia.state.value[id]` 不存在時才會初始化 state。
- **整理 getters**，這裡會使用 `Function.prototype.call` 讓 getter 的 `this` 指向 Store instance，並且處理跨請求狀態污染（Cross-Request State Pollution）的問題。
- 合併 state、actions 跟 getters，並且使用 `createSetupStore` 來實際建立 Store instance。

看完 `createOptionsStore` 的實作後發現裡面處理的事情非常單純，但礙於篇幅的關係，如果要在這一篇也交代完 `createSetupStore` 的實作細節內容會太長。因此將 Setup Store 的內容獨立出來，下一篇將深入核心研究 Setup Store 的實作細節。

### 參考資料

- [Pinia | The intuitive store for Vue.js](https://pinia.vuejs.org){ target="_blank" }
- [Server-Side Rendering (SSR) | Vue.js #Cross-Request State Pollution](https://vuejs.org/guide/scaling-up/ssr.html#cross-request-state-pollution){ target="_blank" }
