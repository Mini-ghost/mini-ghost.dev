---
title: 深入淺出 pinia（一）：createPinia、defineStore
tags:
- Vue
- Pinia

created: 2023-04-03T08:56:53.162Z
image: <https://og-image-mini-ghost.vercel.app/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA%20pinia.png>
description: 在開發比較大型的專案時我們不經常需要將一些「狀態」儲存到一個共用的地方，讓些狀態可以更容易的在各個元件之間被共用。Pinia 是目前官方首推的狀態管理工具，而關於 Pinia 的介紹與五星吹捧更是多不勝數，因此這系列分享會聚焦在幾個我覺得 Pinia 有趣、好玩的地方，研究他的原始碼是如何撰寫的，從中吸收寶貴的經驗。
---

## 前言

> 本篇的 pinia 版本為 2.0.33

這篇作為開頭，本篇會介紹的內容有這些：

- Pinia instance 的設計。
- Pinia 的 `defineStore` 做了些什麼事情。

Pinia 是一個可以支援 Vue 2 跟 Vue 3 的狀態管理工具，除此之外在原始碼中也有不少篇幅是在處理 HMR（Hot Module Replacement）的問題以及增強 DX（Developer Experience），這些部分在這次分享會盡力排除掉，聚焦在核心設計的部分。

## Pinia instance 的設計

使用 Pinia 的第一步，我們必須透過 `createPinia()` 建立一個 Pinia instance。

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// ⬇️ Pinia 的 instance
const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')
```

我們來看看 `createPinia()` 實作的程式碼：

```ts
export function createPinia(): Pinia {
  const scope = effectScope(true)
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  let _p: Pinia['_p'] = []
  let toBeInstalled: PiniaPlugin[] = []

  const pinia: Pinia = markRaw({
    install(app: App) {
      setActivePinia(pinia)

      if (!isVue2) {
        pinia._a = app
        app.provide(piniaSymbol, pinia)
        app.config.globalProperties.$pinia = pinia
        
         // 是否掛到 Devtools 上
        if (USE_DEVTOOLS) {
          registerPiniaDevtools(app, pinia)
        }

        toBeInstalled.forEach((plugin) => _p.push(plugin))
        toBeInstalled = []
      }
    },

    use(plugin) {
      if (!this._a && !isVue2) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },

    _p,
    _a: null,
    _e: scope,
    _s: new Map<string, StoreGeneric>(),
    state,
  })

  return pinia
}
```

### 建立 Effect Scope

首先馬上看到了一個有點陌生的 API：`effectScope()`，這是 Vue 3.2 之後新增的 API。

在 Vue 元件的 setup function 中，副作用（effect）會被收集到執行當下的元件 instance 上。一但元件被銷毀，所有被收集到的 effect 也會自動被銷毀。而當這些副作用不是在元件內被建立，就會需要自己收集並銷毀。

自己收集並銷毀有點麻煩，而且真實情況可能又更複雜的許多，而 Effect Scope 是將元件搜集並銷毀副作用的機制抽象成更泛用的 API，讓我們可以自己建立一個 Effect Scope，並在需要的時候手動銷毀。

父層元件被銷毀子層元件也會連同被銷毀，Effect Scope，也會有類似的樹狀結構設計，當父層的 Effect Scope 被銷毀時，子層的 Effect Scope 也會被銷毀。但我們也可以透過 `effectScope(true)` 來建立一個獨立的 Effect Scope，這個 Effect Scope 不會被建立當下的父層收集，所以不會跟著父層被銷毀。

更詳細的介紹可以參考這篇 RFC：[RFC - Reactivity Effect Scope](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md)。

我們可以看到在 `createPinia()` 中建立了一個獨立的 Effect Scope，在這個 scope 裡面建立了一個 `state` 的 Ref，並且將這個 Ref 設定給了 `pinia.state`。最後將 Pinia instance 的 `_e` 指向這個 Effect Scope。

### 建立 Pinia instance

在 Pinia instance 上的 `install` function 是 Vue Plugin 的 API，當執行 `app.use(pinia)` 時會呼叫它。在 Pinia 的 install 中做了以下事情：

1. `setActivePinia(pinia)` 設定當前的 pinia instance。
2. `app.provide()` 提供 Pinia instance 給子元件使用（如果不是 Vue 2 ）。
3. 將 Pinia instance 加入 `app.config.globalProperties` 裡面（如果不是 Vue 2 ）。

### 內部屬性

其他有一些地陷開頭的內部屬性，功能分別是：

- `_p`：儲存已安裝的 Pinia Plugin。
- `_a`：`install` 接收的 `app`，也就是 `createApp()` 回傳的 Vue instance。
- `_e`：存放 Effect Scope。
- `_s`：註冊在這個 Pinia instance 之下的 Store instance。

這些內部屬性在 Pinia 的其他地方會用到，在接下來的內容會一步步說明用途。

## 定義並建立 Store

在使用 Pinia store 前我們要先定義 Store。在 Pinia 中有 2 種（或說 3 種）定義方式：

- 傳入一個唯一的 ID 與 options

  ```ts
  defineStore('OPTIONS_STORE_UNIQUE_NAME', {
    // ...options 
  })
  ```

- 直接傳入一個 options 並且包含唯一的 id（這個沒有出現在文件裡面）

  ```ts
  defineStore({
    id: 'OPTIONS_STORE_UNIQUE_NAME_OTHER'
    // ...options
  })
  ```

  - 傳入一個唯一的 ID 與 setup function

  ```ts
  defineStore('SETUP_STORE_UNIQUE_NAME', () => {
    // ref() => state
    // computed() => getters
    // function() => actions

    return {
      // state
      // getters
      // actions
    }
  })
  ```

因為 `defineStore` 支援函式多載(Overloads)，所以一開始會依照傳入的參數判斷使用者使用的是哪一種 API，並分別整理出 `id`、`options` 與 `setup`。

```js
// Overloads 在這裏有點妨礙閱讀，所以我把 type 都先拿掉
export function defineStore(idOrOptions, setup, setupOptions) {
  let id
  let options

  const isSetupStore = typeof setup === 'function'
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup
  } else {
    options = idOrOptions
    id = idOrOptions.id
  }

  function useStore(pinia) {
    // 暫略
  }

  useStore.$id = id

  return useStore
}
```

我們可以看到 `defineStore` 最後會回傳一個 `useStore` 的 function，在開發時我們會調用他來創建一個 Store。但 `useStore` 畢竟就只是個很單純的 function，常理而言每次執行回傳的狀態都是獨立的，這樣要怎麼做到跨元件共享狀態呢？

### 單例模式 Singleton

以下內容擷取自 [Patterns.dev - Singleton Pattern](https://www.patterns.dev/posts/singleton-pattern) 這篇文章。

> Singletons are classes which can be instantiated once, and can be accessed globally. This single instance can be shared throughout our application, which makes Singletons great for managing global state in an application.

透過「單例模式」就可以達到這個目的。單例模式的定義是：「保證一個類別僅有一個實例，並提供一個存取它的全域存取點」，利用單例模式讓每次 `useStore` 回傳的都會是同一個 instance，樣就可以達到跨元件共用狀態的功能。

在這裡我們需要找一個「全域存取點」存放建立過的 Store instance，還記得前面建立的 Pinia instance 裡面有一個 `_s` 嗎？這個「全域存取點」就是 `pinia._s`。

```js
function useStore(pinia) {
  const currentInstance = getCurrentInstance()
  pinia = pinia || (currentInstance && inject(piniaSymbol, null))

  if (pinia) setActivePinia(pinia)

  pinia = activePinia

  if (!pinia._s.has(id)) {
    if (isSetupStore) {
      createSetupStore(id, setup, options, pinia)
    } else {
      createOptionsStore(id, options as any, pinia)
    }
  }

  const store: StoreGeneric = pinia._s.get(id)!

  return store
}
```

每當 `useStore` 被執行時，會先使用 `defineStore` 傳入的 `id` 在 `pinia._s` 中尋找是否有建立過的 Store instance，如果有就直接回傳，如果沒有就建立一個新的 store，並且存放在 `_s` 中，這樣就可以達到跨元件共享狀態的效果了。

這裡還可以住一個小技巧，單利模式在實作上有細分成幾個實作方式，分別是積極單例（Eager Singleton）、惰性單例（Lazy Singleton）等等，這裡我們使用的是惰性單例，也就是說只有在真正需要時才會建立 Store instance，這樣可以節省一些資源。

### 傳入 Pinia instance？

我們大多數在使用 `useStore` 時並不會將 Pinia instance 傳入。如果使用時沒有傳入 Pinia instance  這時候 `useStore` 會嘗試透過 `inject` 拿到 Pinia instance，這也意味著 `useStore` 只能在 setup 裡面使用？

不，因為就算無法透過 `inject` 取得 Pinia instance，我們還有 `activePinia`，這個是在 Pinia install 時透過 `setActivePinia(pinia)` 寫入的，有了 `activePinia` 就可以讓我們不受到 `inject` 的使用限制，在任意地方呼叫 `useStore` 了（當然必須在 Pinia instance 被 Vue install 之後拉！）。

## 跨請求狀態污染（Cross-Request State Pollution）

把 Pinia 的實例存在全域會不會有「跨請求狀態污染」的問題呢？

在處理 Server Side Render（SSR） 時如果我們使用單例模式，任意將變數存在全域，可能會有「跨請求狀態污染」，但在這裡並不會！因為儘管 Pinia instance 被存在全域，但是每個請求都會從 `createSSRApp` 重新建立，也會重新建立 Pinia instance 並且透過 `setActivePinia` 覆蓋掉前一個請求建立的 Pinia instance，所以在這裡不用擔心跨請求狀態污染的問題。

## 結語

在這一篇我們了解了 `createPinia` 以及 `defineStore` 的設計，也知道了 `useStore` 是如何建立 store 並且讓它可以跨元件共享狀態的。除此之外也提到了 Effect Scoped 以及使用單例模式的概念，以及在處理 SSR 時如何避免跨請求狀態污染的問題。

接下來我們會進入到 `createSetupStore` 與 `createOptionsStore`。

### 參考資料

- [Pinia | The intuitive store for Vue.js](https://pinia.vuejs.org)
- [Patterns.dev - Singleton Pattern](https://www.patterns.dev/posts/singleton-pattern)
