---
title: 深入淺出 pinia（一）：createPinia、defineStore
tags:
- Vue
- Pinia

created: 2023-05-13T00:00:00.000Z
image: https://og-image-mini-ghost.vercel.app/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA%20pinia.png?fontSize=72
description: 在開發比較大型的專案時我們經常需要將一些「狀態」儲存到一個共用的地方，讓些狀態可以更容易的在各個元件之間使用。Pinia 是目前 Vue 官方首推的狀態管理工具，而關於 Pinia 的使用介紹與五星吹捧更是多不勝數。因此這系列文章不會特別著重在如何使用 Pinia 而是深入剖析 Pinia 的原始碼，研究它的設計，從中吸收寶貴的經驗。
---

## 前言

> 本篇的 pinia 版本為 2.0.36

作為這個系列的開頭，本篇會研究的內容有：

- Pinia instance 的設計。
- Pinia 的 `defineStore` 做了些什麼事情。

Pinia 是一個可以支援 Vue 2 跟 Vue 3 的狀態管理工具。除了核心功能，在原始碼中也有很多篇幅是在處理 HMR（Hot Module Replacement）的問題以及增強 DX（Developer Experience），這些部分在這次研究會排除掉，聚焦在主要功能設計的部分。

## Pinia instance 的設計

使用 Pinia 的第一步，我們必須透過 `createPinia()` 建立一個 Pinia instance，並且安裝到 vue 的 application 上面。

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

### 將 Pinia 安裝到 vue application 上

所以我們必須讓 Pinia instance 是一個可以被 vue 安裝的物件：

```ts
function createPinia(): Pinia {
  // 安裝的 plugins
  let _p = []
  let toBeInstalled = []

  const pinia: Pinia = {
    // ⬇️ vue 安裝時會呼叫的 install 方法
    install(app: App) {
      setActivePinia(pinia)

      if (!isVue2) {
        pinia._a = app
        app.provide(piniaSymbol, pinia)
        app.config.globalProperties.$pinia = pinia

        toBeInstalled.forEach((plugin) => _p.push(plugin))
        toBeInstalled = []
      }
    },

    _p,
    _a: null,
  }
}
```

在 Pinia 的 install 中做了以下事情：

- `setActivePinia(pinia)` 設定當前的 Pinia instance

  Pinia 的設計是可以同時存在多個 Pinia instance，但是在同一個時間點只能有一個 Pinia instance 是 active 的，而這個 active 的 Pinia instance 會被設定到 `activePinia` 這個變數上，讓其他地方可以取得當前的 Pinia instance。

- `app.provide()` 提供 Pinia instance 給子元件使用（如果不是 Vue 2）

  提供一個可以所有子元件都可以取得的 Pinia instance，讓子元件可以透過 `inject()` 取得 Pinia instance。

- 將 Pinia instance 加入 `app.config.globalProperties` 裡面（如果不是 Vue 2）

  在 Vue 2 中，我們可以透過 `Vue.prototype` 來提供一個全域的變數給所有元件使用，但在 Vue 3 中，這個方法已經被移除了，取而代之的是透過 `app.config.globalProperties` ，這邊用來提供 Pinia instance 給子元件使用。


### 建立全域的狀態管理中心 root state

在 Pinia 上我們會需要一個同步所有 store 狀態的 root state，所以我們也把他放在 Pinia instance 上：

```ts
export function createPinia(): Pinia {
  const state = ref({})

  const pinia: Pinia = {
    install 

    _p,
    _a: null,

    state,
  }

  return pinia
}
```

### 安裝 Pinia 的 Plugins

在研究 Plugins 安裝功能前先看看怎麼使用吧：

```ts
import { createPinia } from 'pinia'

function plugin()  {
  return { secret: 'the cake is a lie' }
}

const pinia = createPinia()
pinia.use(plugin)
```

Plugins 安裝在這一段並沒有多做太多的處理，僅僅先將他們存起來，等到 Pinia instance 被安裝到 Vue application 上時再執行。

```ts
export function createPinia(): Pinia {
  const state = ref({})

  const pinia: Pinia = {
    install 

    use(plugin) {
      if (!this._a && !isVue2) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    }

    _p,
    _a: null,

    state,
  }

  return pinia
}
```

而詳細的安裝流程會在之後的內容說明。

到這裡 Pinia instance 的內容大致研究完畢，但實際看原始碼，好像少了什麼東西！！

### Effect Scope

當我們實際攤開 `createPinia` 的原始碼，馬上就會看到一個陌生的 API：`effectScope`。

```ts
export function createPinia(): Pinia {
  const scope = effectScope(true)
  const state = scope.run(() => ref({}))!

  const pinia: Pinia = {
    install,
    use,

    _p,
    _a: null,
    _e: scope,

    state,
  }

  return pinia
}
```

**什麼是 Effect Scope？**

Effect Scope 是 Vue 3.2 之後新增的 API。

在 Vue 元件的 setup function 中，副作用（effect）會被收集到執行當下的元件 instance 上。一但元件被銷毀，所有被自動收集到的 effect 也會被清除。而當這些副作用不是在元件內被建立，就會需要自己收集並清除。

要自己收集並清除有點麻煩，而且真實情況可能又更複雜的許多，而 Effect Scope 的出現將元件搜集並清除副作用的機制抽象成更泛用的 API，讓我們可以自己建立一個 Effect Scope，並在需要的時候手動清除。

另外，Effect Scope 也有類似元件的樹狀結構設計，當父層的 Effect Scope 被銷毀時，收集到的子層的 Effect Scope 也會一起被銷毀。但我們也可以透過 `effectScope(true)` 來建立一個獨立的 Effect Scope，這個 Effect Scope 不會被建立當下的父層收集，所以不會跟著父層被銷毀。

更詳細的介紹可以參考這篇 RFC：[RFC - Reactivity Effect Scope](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md){ target="_blank" }。

**為什麼這裡要使用 Effect Scope？**

在 Pinia 的設計裡面，Pinia instance 是整個 Store 的管理中心，而每個 Store instance 會可能有自己的副作用，所以我們需要一個 Effect Scope 來管理、收集這些副作用，當 Store instance 被銷毀時，這些副作用也會被清除，而 Pinia 銷毀時也可以把他所有管理的 Store 的副作用全數處理掉。

## 定義並建立 Store

前面我們已經知道了如何建立 Pinia instance，接下來我們就可以開始定義 Store 了。

在使用 Pinia store 前我們需要先定義 Store。在 Pinia 中有 2 種（或說 3 種）定義方式：

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

因為 `defineStore` 支援函式多載（Overloads），所以一開始會依照傳入的參數判斷使用者使用的是哪一種 API，並分別整理出 `id`、`options` 與 `setup`。

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

我們可以看到 `defineStore` 最後會回傳一個 `useStore` 的 function，在開發時我們會調用他來創建一個 Store。但 `useStore` 畢竟就只是個很單純的 function，一般而言每次執行回傳的狀態都是獨立的，如果需要重複使用 `useStore` 產生的狀態就需要特別處理。

### 單例模式 Singleton

以下內容擷取自 [Patterns.dev - Singleton Pattern](https://www.patterns.dev/posts/singleton-pattern) 這篇文章。

> Singletons are classes which can be instantiated once, and can be accessed globally. This single instance can be shared throughout our application, which makes Singletons great for managing global state in an application.

單例模式的定義是：「保證一個類別僅有一個實例，並提供一個存取它的全域存取點」，利用單例模式我們可以讓每次 `useStore` 回傳的都會是同一個 Store instance，樣就可以達到跨元件共用狀態的功能。

所以我們需要一個地方來存放建立過的 Store instance，把它存放在 Pinia instance 上是一個不錯的選擇。

```ts
export function createPinia(): Pinia {
  const pinia: Pinia = {
    install,
    use,

    _p,
    _a: null,
    _e: scope,

    //  ⬇️ 這裡存放建立過的 Store instance
    _s: new Map<string, Store>(),

    state,
  }

  return pinia
}
```

這樣我們就有了一個「全域存取點」存放建立過的 Store instance，`pinia._s`。

```js
function useStore(pinia) {
  const currentInstance = getCurrentInstance()
  pinia = pinia || (currentInstance && inject(piniaSymbol, null))

  if (pinia) setActivePinia(pinia)

  pinia = activePinia

  //  ⬇️ 如果沒有建立過 Store instance 就建立一個
  if (!pinia._s.has(id)) {
    if (isSetupStore) {
      createSetupStore(id, setup, options, pinia)
    } else {
      createOptionsStore(id, options as any, pinia)
    }
  }

  // 透過 id 取得 Store instance
  const store = pinia._s.get(id)

  return store
}
```

每當 `useStore` 被執行時，會先使用 `defineStore` 傳入的 `id` 在 `pinia._s` 中尋找是否有建立過的 Store instance，如果有就直接回傳，如果沒有就建立一個新的 store，並且存放在 `_s` 中，這樣就可以達到跨元件共享狀態的效果了。

單例模式在實作上有細分成幾個實作方式，像是積極單例（Eager Singleton）、惰性單例（Lazy Singleton），這裡我們使用的是惰性單例，只有在真正需要時才會建立 Store instance，這樣可以節省一些資源。


## 跨請求狀態污染（Cross-Request State Pollution）

在上面的程式碼當中我們可以看到 `useStore` 接受傳入一個 Pinia instance 的參數，那為什麼 `useStore` 會接受傳入 Pinia instance 的參數呢？

```ts
//    可以傳入 pinia ⬇️ 
function useStore(pinia) {
  const currentInstance = getCurrentInstance()
  pinia = pinia || (currentInstance && inject(piniaSymbol, null))

  if (pinia) setActivePinia(pinia)

  pinia = activePinia
}
```

在處理 Server Side Render（SSR） 時如果我們任意將變數存在全域就可能會有「跨請求狀態污染」。但跨請求狀態污染是什麼？我們用下面例子來說明：

1. 請求 A 進到 Server，建立了一個 Pinia instance 並存到全域。
2. 請求 A 準備渲染畫面，過程中執行非同步請求。
3. 請求 B 進到 Server，建立了一個 Pinia instance 並存到全域。
4. 請求 B 準備渲染畫面，過程中執行非同步請求。
5. 請求 A 的非同步結束，開始渲染。渲染過程中將 Store instance 存到 Pinia instance 裡面並寫了一些資料，但這個 Pinia instance 是請求 B 建立的。
6. 請求 B 的非同步結束，開始渲染。因為 Store instance 已經存在（請求 A 渲染時建立的）所以直接使用。

所以，如果在 Component 的 setup 裡面使用的話我們可以使用 `inject` 拿到在當前 Vue instance 上的 Pinia instance。但如果不是在 Component 的 setup 裡面使用的話呢？

我們拿到的 Pinia instance 可能是其他請求建立的，這樣就會有跨請求狀態污染的問題。

```ts
router.beforeEach((to) => {
  // 這裡有可能拿到的 Pinia instance 是其他請求建立的
  const main = useStore()

  // ...
})
```

為了避免這個問題，我們可以在 `useStore` 中接受傳入 Pinia instance 的參數，如果有傳入就使用傳入的 Pinia instance，如果沒有就使用當前 Vue instance 上的 Pinia instance，或是全域的 `activePinia`。

```ts
function useStore(pinia) {
  const currentInstance = getCurrentInstance()

  //        ⬇️ 這裡會先嘗試使用傳入的 Pinia instance
  pinia = pinia || (currentInstance && inject(piniaSymbol, null))

  if (pinia) setActivePinia(pinia)

  pinia = activePinia
}
```

這樣樣在 Component 的 setup 以外的地方我們就有辦法確保使用的是當前請求建立的 Pinia instance 了。

```ts
// https://pinia.vuejs.org/ssr/#using-the-store-outside-of-setup
router.beforeEach((to) => {
  // ✅ This will work make sure the correct store is used for the
  // current running app
  const main = useMainStore(pinia)

  if (to.meta.requiresAuth && !main.isLoggedIn) return '/login'
})
```

上面的範例是使用 vue-router 的作為範例，在 vue-router v4.1.6 不傳入 Pinia instance 會有全域變數的問題，但在 v4.2.0 之後就不會有這個問題了。

在讀這一段文件時我也疑惑很久，感謝來自 vue-router 同時是 Pinia 作者的回答：

> On SSR, each request creates an app with its own router and pinia <br />
> by not passing the instnance there is a risk of cross request state pollution <br />
> but in the latest version of Vue Router, passing the pinia state is no longer needed <br />
> <br />
> 弱弱翻譯： <br />
> 在 Server Side Render（SSR）中，每個請求都會建立一個具有自己的 router 和 pinia instance 的 app。如果不在這裡傳遞 pinia instance，就會存在跨請求狀態污染的風險。但在最新版本的 Vue Router 中，不再需要傳遞 Pinia 狀態。

## 結語

在這一篇我們了解了 `createPinia` 以及 `defineStore` 的設計，也知道了 `useStore` 是如何建立 store 並且讓它可以跨元件共享狀態的。除此之外也提到了 Effect Scoped 以及使用單例模式的概念，以及 Pinia 在處理 SSR 時如何避免跨請求狀態污染的問題。

接下來我們會進入到 `createOptionsStore` 的實作探討。

### 參考資料

- [Pinia | The intuitive store for Vue.js](https://pinia.vuejs.org){ target="_blank" }
- [RFC - Reactivity Effect Scope](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md){ target="_blank" }
- [Patterns.dev - Singleton Pattern](https://www.patterns.dev/posts/singleton-pattern){ target="_blank" }
- [Server-Side Rendering (SSR) | Vue.js #Cross-Request State Pollution](https://vuejs.org/guide/scaling-up/ssr.html#cross-request-state-pollution){ target="_blank" }
