---
title: 深入淺出 pinia（二）：createOptionsStore、createSetupStore
tags:
- Vue
- Pinia

created: 2023-05-13T00:00:00.001Z
image: https://og-image-mini-ghost.vercel.app/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA%20pinia.png?fontSize=72
description: Pinia 是目前 Vue 官方首推的狀態管理工具。這系列分享不會特別著重在如何使用 Pinia 而是深入剖析 Pinia 的原始碼，研究他的原始碼是如何撰寫的，從中吸收寶貴的經驗。在上一篇的內容我們先看了 Pinia instance 上有哪些東西，也初步了解了 defineStore 的功能。接下來會更深入核心了解 Options Store 跟 Setup Store 內部的實作。
---

## 前言

> 本篇的 pinia 版本為 2.0.36

在上一篇中我們看了 Pinia instance 的實作內容，也初步了解了 `defineStore` 的功能。接下來會更深入核心了解 Options Store 跟 Setup Store 內部的實作。

本篇會深入研究的內容有如下：

1. Options Store 的實作細節。
2. Setup Store 的實作細節。

## Options Store

如果有用過 Vuex 或是還沒有接觸過 Composition API 的話，Options Store 應該會是比較好上手的一個選擇，這也是官方建議可以優先嘗試看看的方式。

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

### 初始化 Options Store state

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

根據這段原始碼我們發現，這裡是為了要解決 Server Side Render（SSR）的問題。以 Nuxt 為例，在 Server 端時會先進行初始化，並且將 HTML 產出傳到前端。在這過程中可能會經歷一連串的資料請求，並且將取得的資料並存在 Store 裡面。

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
  // ⬇️ Options API 的 getters
  // getter 會接收 state 當作參數，或是透過 `this` 來取得 state
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
      if (isVue2 && !store._r) return
      return getters![name].call(store, store)
    })
  )
  return computedGetters
}, {} as Record<string, ComputedRef>)
```

我們可以透過 `Function.prototype.call` 來改變 `this` 的指向。

```ts
//       ⬇️ 指定 this 的指向為 `state`
fun.call(thisArg, arg1, arg2, ...)
//                ⬆️ 第一個參數 `state`
```

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

最後講整理好的屬性合併，這裡會因為後蓋前，所以如果有相同的屬性， `state` 會被 `actions` 跟 `getters` 覆蓋。

## Setup Store

`createSetupStore` 實作含型別、HMR、著解等有 500 多行，也因為大部分會用到的 api 都集中在這裡面，所以我會先列出這裡面有實做到的 api，並且在後面逐一解釋。

| api                | 功能說明 |
|--------------------|---------|
| `store.$onAction`  | 設定一個 callback function，在 action 被執行前調用。 |
| `store.$subscribe` | 設定一個 callback function，當 `state` 更新時調用。它會回傳一個用來移除該 callback function 的 function |
| `store.$patch`     | 更新 `state，可以值接賦值部分新的狀態或是使用` callback 取得當前 state 並修改。 |
| `store.$state`     | 當前 store 的 `state`，如果對他直接設定 state，內部會使用 `store.$patch` 更新 |
| `store.$reset`     | 重置整個 store 的 `state`，只是適用於 Options Store。 |
| `store.$dispose`   | 清除整個 store 的「副作用」，並且將 store 從 Pinia Instance 上將該 store 刪除。 |

不過在一一介紹 api 之前，我們還是需要初始化 state。

### 初始化 Setup Store state

在 `createOptionsStore` 的一開始我們因為要解決 SSR 的需求，所以會先檢查 `initialState` 是否存在，如果存在就沿用，不存在則需要初始化。

這裡要做的事情大致相同，不過因為 Option Store 的 `state`  先前已經透過 state function 來初始化，所以如果是 Options Store 這裡不需要再做一次，僅判斷針對 Setup Store 是否需要初始化  `pinia.state.value[$id] = {}`。

```ts
// 忽略了 HMR 的部分
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  // ...

  // 如果 EffectScope 的 active 為 false，代表 Pinia 已經被銷毀
  if (!pinia._e.active) {
    throw new Error('Pinia destroyed')
  }

  const initialState = pinia.state.value[$id]

  if (!isOptionsStore && !initialState) {
    /* istanbul ignore if */
    if (isVue2) {
      set(pinia.state.value, $id, {})
    } else {
      pinia.state.value[$id] = {}
    }
  }

}
```

如同在 SSR 部分提到的問題，如果直接使用 `setup` function 產生的 state 作為初始值，那就可能會有 hydration error 的問題：

```ts
const useStore = defineStore('SETUP_STORE', () => {
  const env = ref(process.server ? 'server' : 'client',);

  return {
    env
  }
})

const store = useStore()
store.env // hydration error
```

所以這裡會先檢查 `initialState` 是否存在，並且是否需要進行補水（hydrate）。

```ts
function shouldHydrate(obj: any) {
  return isVue2
    ? !skipHydrateMap.has(obj)
    : !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol)
}

function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const setupStore = pinia._e.run(() => {
    scope = effectScope()
    return scope.run(() => setup())
  })!

  for (const key in setupStore) {
    const prop = setupStore[key]

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      if (!isOptionsStore) {
        if (initialState && shouldHydrate(prop)) {
          if (isRef(prop)) {
            prop.value = initialState[key]
          } else {
            // reactive 不能直接複寫，所以這邊要透過 `mergeReactiveObjects` 使用遞迴的方式來複寫。
            mergeReactiveObjects(prop, initialState[key])
          }
        }

        if (isVue2) {
          set(pinia.state.value[$id], key, prop)
        } else {
          pinia.state.value[$id][key] = prop
        }
      }
    } else if (typeof prop === 'function') {
      // action
      // ...
    }
  }
}
```

前一篇有提到 Effect Scope，每一個 Store 的 setup 都會在 Pinia instance 上的 Effect Scope 中建立自己的 Effect Scope，形成一個樹狀的 Effect Scope。這樣的用意是一但當 Pinia instance 被銷毀時，可以透過這個樹狀的 Effect Scope 關係來清除所有的副作用。

接著 `setupStore` 是我們回傳的一個物件，這裡會將這個物件的每個屬性進行檢查，如果是 `Ref` 或是 `Reactive` 物件，就會進行初始化，如果是 `Computed` 則表示這是 getter 不需要額外處理。

### 包裝 Actions

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  let scope

  // ...

  const setupStore = pinia._e.run(() => {
    scope = effectScope()
    return scope.run(() => setup())
  })!

  for (const key in setupStore) {
    const prop = setupStore[key]

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      // ...
    } else if (typeof prop === 'function') {
      const actionValue = wrapAction(key, prop)

      if (isVue2) {
        set(setupStore, key, actionValue)
      } else {
        setupStore[key] = actionValue
      }
    }
  }
}
```

在剛剛 `setupStore` 的物件中，我們挑出了 state 以及 getter。而剩下的如果型別為 `function` 的話，就會被當作 action 來處理。

在這裡很單純地透過 `wrapAction` 來包裝 action，並將包裝過後的 action 重新賦值回 `setupStore` 上。

但，為何 action 需要包裝。

### API: store.$onAction

開始分析實作前我們可以先看看這個 API 的使用方式。

```ts
// 回傳一個 function 用來移除 callback function
const removeSubscribe = store.$onAction(
  ({
    name,    // action 名稱（物件上的屬性名稱）
    store,   // Store instance
    args,    // 調用 action 時傳入的參數
    after,   // 新增在 action 成功後調用的 callback function
    onError, // 新增在 action 失敗後調用的 callback function
  }) => {
    // action 被調用時會觸發

    after((result) => {
      // action 成功後可以在這裡做一些事情
    })

    onError((error) => {
      // action 失敗後可以在這裡做一些事情
    })
  }
)
```

為了實現 `store.$onAction` 我們必須將原本平凡無奇的 action function 包裝起來，並且在執行 action 前後調用 callback function。

所以我們需要：

1. `$onAction` 用來搜集 callback function，並且回傳一個 function 用來移除 callback function。
1. `actionSubscriptions` 用來存放所有的 callback function。
1. `wrapAction`，用來包裝 action function，並回傳一個包裝後的 function。

並且在執行 action 前調用 `actionSubscriptions` 中的所有 callback function。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const actionSubscriptions = markRaw([])

  const store = reactive({
    // ...
    $onAction(callback) {
      actionSubscriptions.push(callback)
      return () => {
        const index = actionSubscriptions.indexOf(callback)
        if (index > -1) {
          actionSubscriptions.splice(index, 1)
        }
      }
    },
  })

  // ⬇️ 包裝 action function
  function wrapAction(name, action) {
    return function () {
      const args = Array.from(arguments)

      actionSubscriptions.slice().forEach((callback) => {
        callback({
          name,
          store,
          args,
        })
      })
    }
  }
}
```

但這裡還少了一些東西，就是 action 執行後的 callback function，以及發生錯誤時調用的 callback function。這裡需要新增兩個陣列，與兩個新增 callback function 的方法，分別是：

1. `afterCallbackList` 存放 action 執行後的 callback function。
2. `onErrorCallbackList` 存放 action 執行失敗後的 callback function。
3. `after` 新增一個 callback function 到 `afterCallbackList`。
4. `onError` 新增一個 callback function 到 `onErrorCallbackList`。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const actionSubscriptions = markRaw([])

  // ...

  function wrapAction(name, action) {
    return function () {
      const args = Array.from(arguments)

      const afterCallbackList = []
      const onErrorCallbackList = []
      
      function after(callback) {
        afterCallbackList.push(callback)
      }
      function onError(callback) {
        onErrorCallbackList.push(callback)
      }

      actionSubscriptions.slice().forEach((callback) => {
        callback({
          name,
          store,
          args,
          after,
          onError,
        })
      })
    }
  }
}
```

所以我們只要在執行果後，依照成功於否調用 `afterCallbackList` 或是 `onErrorCallbackList` 中的 callback function 就可以了。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  // ...

  function wrapAction(name, action) {
    return function (this: any) {
      // ...

      let maybePromiseResult
      try {
        maybePromiseResult = action.apply(this && this.$id === $id ? this : store, args)
      } catch (error) {
        triggerSubscriptions(onErrorCallbackList, error)
        throw error
      }

      if (maybePromiseResult instanceof Promise) {
        return maybePromiseResult
          .then((value) => {
            afterCallbackList.slice().forEach((callback) => {
              callback(value)
            })
            
            return value
          })
          .catch((error) => {
            onErrorCallbackList.slice().forEach((callback) => {
              callback(error)
            })

            return Promise.reject(error)
          })
      }

      afterCallbackList.slice().forEach((callback) => {
        callback(maybePromiseResult)
      })

      return maybePromiseResult
    }
  }
}
```

### API: store.$subscribe

一樣先看看這個 API 的使用方式。

```ts
const removeSubscribe = store.$subscribe((mutation, state) => {
  // import type { MutationType } from 'pinia'
  // 'direct' | 'patch object' | 'patch function'
  mutation.type 

  // 和 store.$id 一樣
  mutation.storeId

  // 只有在 mutation.type === 'patch object' 的時候才可以使用
  mutation.payload

  // store 的 state
  state
}, {
  // 是否要在銷毀 store 時自動移除 callback function
  detached: true,

  // 這邊就是 `watch` 的 options
  flush: 'post',
  immediate: false,
  deep: true, // <--- 預設為 true
})
```

依循著 `store.$onAction` 的實作邏輯，我們可以很快地初步實作出 `store.$subscribe`。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const subscriptions: SubscriptionCallback<S>[] = markRaw([])

  const store = reactive({
    // ...
    $subscribe(callback) {
      subscriptions.push(callback)

      return () => {
        const index = subscriptions.indexOf(callback)
        if (index > -1) {
          subscriptions.splice(index, 1)
        }
      }
    },
  })
}
```

觸發 `subscriptions` 中的 callback function 有兩種方式，其中一種就是直接修改 `state`，例如：

```ts
const store = useStore()

// 直接修改 state
store.count++
```

<!-- 另一個方式是透過 `store.$patch` 來修改 `state`，但後面再講。 -->

要補捉直接修改 `state` 的最簡單方法就是 `watch`。所以我們可以對 `$subscribe` 稍微加工，。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  let scope!: EffectScope

  const subscriptions: SubscriptionCallback<S>[] = markRaw([])

  const store = reactive({
    // ...
    $subscribe(callback, options) {
      subscriptions.push(callback)

      const stopWatch = scope.run(() => {
        watch(
          () => pinia.state.value[$id],
          (state) => {
            callback({ storeId: $id, type: 'direct' }, state)
          },
          //                ⬇️ 預設 deep 為 true
          Object.assign({}, $subscribeOptions, options)
        )
      })

      return () => {
        const index = subscriptions.indexOf(callback)
        if (index > -1) {
          subscriptions.splice(index, 1)
          stopWatch()
        }
      }
    },
  })
}
```

這樣就可以補捉到直接修改 state 的行為了。

另外一種觸發 `subscriptions` callback function 的做方式則是透過 `store.$patch` 修改 `state`。

儘管這裡我們還沒有看到 `store.$patch` 的實作，但為了完整了解 `store.$subscribe` 的實作，我們先插入一點點 `store.$patch` 的實現。

要實現透過 `store.$patch` 來觸發 `store.$subscribe` 的 callback function，其實很簡單，實作方法就跟前面提到的 `store.$onAction` 一樣，只要在 `store.$patch` 被呼使用時將 `subscriptions` 中的 callback function 逐一執行就可以了。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {

  // override
  function $patch(stateMutation: (state: UnwrapRef<S>) => void): void
  function $patch(partialState: _DeepPartial<UnwrapRef<S>>): void
  function $patch(partialStateOrMutator: (state: UnwrapRef<S>) => void | _DeepPartial<UnwrapRef<S>>): void {
    let subscriptionMutation: SubscriptionCallbackMutation<S>

    if (typeof partialStateOrMutator === 'function') {
      // 這裡修改 state，先略

      subscriptionMutation = {
        type: 'patch function',
        storeId: $id,
      }
    } else {
      // 這裡修改 state，先略

      subscriptionMutation = {
        type: 'patch object',
        storeId: $id,

        // 只有在 mutation.type === 'patch object' 的時候才可以使用
        payload: partialStateOrMutator,
      }
    }

    // ... 

    // 執行所有 callback function
    subscriptions.slice().forEach((callback) => {
      callback(subscriptionMutation, pinia.state.value[$id])
    })
  }
}
```

到這裡 `store.$subscribe` 的實作就大致完成了。

但我們會遇到一個問題，當我們透過 `store.$patch` 修改 `state` 時，`subscriptions` 會被觸發兩次。

```ts
store.$subscribe((mutation, state) => {
  // 這裡會執行兩次
  // mutation.type === 'patch object'
  // mutation.type === 'direct'
  console.log('mutation', mutation)
  console.log('state', state)
})

store.$patch({
  name: 'Pinia',
  count: 1,
})
```

原本寫在 `$subscribe` 中的 `watch` 也因為 `state` 的變化多執行了一次。所以我們需要一個開關，當 `state` 是透過 `store.$patch` 修改時在 `watch` 中不要執行 `subscribes` 中的 callback function。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  let isListening: boolean
  let isSyncListening: boolean

  function $patch(partialStateOrMutator: (state: _DeepPartial<UnwrapRef<S>> | (UnwrapRef<S>) => void)): void {
    isListening = isSyncListening = false

    let subscriptionMutation: SubscriptionCallbackMutation<S>

    if (typeof partialStateOrMutator === 'function') {
      // 這裡修改 state，先略
      // 前面把 watch 的開關關掉所以這裡的修改不會觸發 watch

      subscriptionMutation = {
        type: 'patch function',
        storeId: $id,
      }
    } else {
      // 這裡修改 state，先略
      // 前面把 watch 的開關關掉所以這裡的修改不會觸發 watch

      subscriptionMutation = {
        type: 'patch object',
        storeId: $id,

        // 只有在 mutation.type === 'patch object' 的時候才可以使用
        payload: partialStateOrMutator,
      }
    }

    // ... 

    nextTick().then(() => {
        // 打開 pre 跟 post 的 watch 開關
       isListening = true
    })

    // 打開 sync watch 開關
    isSyncListening = true

    subscriptions.slice().forEach((callback) => {
      callback(subscriptionMutation, pinia.state.value[$id])
    })
  }
}
```

並且 `$subscribe` 中的 `watch` 也要加上這個開關。

```ts
const store = reactive({
  $subscribe(callback, options) {
    // 略

    const stopWatch = scope.run(() => {
      watch(
        () => pinia.state.value[$id],
        (state) => {
          if (options.flush === 'sync' ? isSyncListening : isListening) {
            // 執行 callback
          }
        },
        Object.assign({}, $subscribeOptions, options)
      )
    })

    return () => {
      // ...
    }
  },
})
```

我們知道 `watch` 的第三個參數 `options` 可以設定 `watch` 的 callback function 何時被執行，預設為 `pre`。

在預設狀態下 `watch` 的 callback function 會被推進 queue 裡面，非同步的執行，這樣就算我們一連更新多次響應資料，`watch` 的 callback function 也只會被執行一次。也因此 `isListening` 需要在 `nextTick` 後才打開，這樣就可以確保在 `watch` 的 callback function 判斷要忽略這次的執行後才恢復開關。

而 `isSyncListening` 則是用來控制 `flush` 為 `sync` 的 `watch`，這種 `watch` 的 callback function 會在資料一改變就馬上執行，所以我們可以直接在 `store.$patch` 的最後直接恢復開關。

但問題又來了！<br>
但問題又來了！<br>
但問題又來了！<br>

現在的程式碼遇在下列情況會有問題：

```ts
store.$patch({ count: 2 })
await Promise.resolve()
store.$patch({ count: 20 })
```

如果我們把每一次 callback function 接收到的 type 印出來看，會發現這樣的結果

```md
patch object
patch object
direct <--------- !!?
```

為什麼會這樣，我們把事發經過一步一步攤開來看。（可搭配重現範例：[Pinia #1129 重現](https://stackblitz.com/edit/vitejs-vite-vuof7u?file=src%2FApp.vue){ target="_blank" }）

1. 執行 `store.$patch({ count: 2 })` 在這時 `isListening` 被關閉。
2. 等待微任務結束，並且執行 watch 的 callback function，不過這時候 `isListening` 是處於被關閉的狀態所以沒有做任何事情。
3. 執行 `store.$patch({ count: 20 })` 在這時 `isListening` 維持被關閉。
4. 進到第一次執行 `store.$patch` 的 `nextTick().then()` 裡面將 `isListening` 打開。
5. 執行 `watch` 的 callback function，這時候 `isListening` 已經被打開，所以會執行 callback function。（抓到你了！！！）

原來是因為第一次執行 `store.$patch` 的 `nextTick().then()` 裡面先將 `isListening` 打開了，這時候對應的第二次的 watch 的 callback function 來說 `isListening` 已經被打開，所以會執行 `subscriptions` 的 callback function。

解決方法就是確保第二次（最後一次）的 `nextTick().then()` 才把 `isListening` 打開，我們需要一個方法來確認是否為最後一次執行的 `store.$patch`。

```ts
let activeListener: Symbol | undefined
function $patch(partialStateOrMutator: (state: UnwrapRef<S>) => void | _DeepPartial<UnwrapRef<S>>): void {
  isListening = isSyncListening = false

  // ... 

  const myListenerId = (activeListener = Symbol())
  nextTick().then(() => {
    if (activeListener === myListenerId) {
      isListening = true
    }
  })
}
```

這樣就只會在最後一次執行玩後的 `nextTick().then()` 將 `isListening` 打開。

到這裡 `store.$subscribe` 的實作就完成了。

### API: store.$patch

`store.$patch` 的使用方式如下：

```ts
// 直接傳入一個物件
store.$patch({
  name: 'Pinia',
  count: 1,
})

// 傳入一個 callback function
store.$patch((state) => {
  state.items.push({ name: 'shoes', quantity: 1 })
  state.hasChanged = true
})
```

我們上面已經看到 `store.$patch` 的部分實作，這邊繼續完成它。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  function $patch(partialStateOrMutator: (state: _DeepPartial<UnwrapRef<S>> | (UnwrapRef<S>) => void)): void {

    if (typeof partialStateOrMutator === 'function') {
      partialStateOrMutator(pinia.state.value[$id])

      // 省略之前的程式碼
    } else {
      mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator)

      // 省略之前的程式碼
    }
  }
}
```

撇除掉訂閱的程式碼，這裡我們只要處理不同參數修改 `state` 的方式就可以了。

### API: store.$state

`store.$state` 的使用方式如下，順邊想想下邊面的操作的結果 `store.$state` 會變成什麼：

```ts
/**
 * 假設當前 `$state` 是這樣的
 * 
 * ```ts
 * {
 *   count: 0,
 *   name: 'Vuex',
 * }
 * ```
 */
const store = useStore()

store.$state.count = 1
store.$state = {
  name: 'Pinia',
}

// store.$state 變成？
```

`store.$state.count = 1` 的結果可想而知 `count` 的值會變成 `1`，但 `store.$state = { name: 'Pinia' }` 的結果會是什麼呢？

實作部份如下：

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[$id],
    set: (state) => {
      $patch(($state) => {
        Object.assign($state, state)
      })
    },
  })
}
```

當我們執行 `store.$state.count = 1` 時，實際上是直接對 `pinia.state.value[$id]` 進行修改，就會像是 `pinia.state.value[$id].count = 1` 一樣，所以不會觸發 `set`。而當我們對 `store.$state` 直接賦值時，則會觸發 `set`。

所以上面執行的程式碼，實際效果如下：

```ts
// store.$state.count = 1
pinia.state.value[$id].count = 1

// store.$state = {
//   name: 'Pinia',
// }
store.$patch((state) => {
  Object.assign(state, {
    name: 'Pinia',
  })
})
```

### API: store.$reset

在 Options Store 建立的 Store instance 上我們可以使用 `store.$reset` 來重置整個 store 的 state。

`store.$reset` 的使用方式如下：

```ts
const store = useStore()

store.$reset()
```

實作部份如下

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const $reset = isOptionsStore
    //                ⬇️ Options Store 的 Options
    ? function $reset(this: _StoreWithState<Id, S, G, A>) {
        const { state } = options 
        const newState = state ? state() : {}
        this.$patch(($state) => {
          Object.assign($state, newState)
        })
      }
    : __DEV__
    ? () => {
        throw new Error(
          `🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`
        )
      }
    : noop
}
```

為什麼只有 Options Store 可以使用 `store.$reset` 呢？

因為 Options Store 的 state 是透過 `state` function 來初始化的，所以我們可以透過 `state` function 來取得初始的 state，但 Setup Store 的 state 是透過 `setup` function 來初始化的，而我們無法有效地使用 `setup` function 來取得初始的 state。

### API: store.$dispose

`store.$dispose` 的使用方式如下：

```ts
const store = useStore()

store.$dispose()
```

在這裡我們會將 `EffectScope` 停止，並且清除所有的 `subscriptions` 跟 `actionSubscriptions`，最後將 store 從 Pinia instance 上刪除。

實作部份如下：

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  function $dispose() {
    scope.stop()
    subscriptions = []
    actionSubscriptions = []
    pinia._s.delete($id)
  }
}
```

在這裡 Pinia 僅僅將 Store instance 從 Pinia instance 上刪除，並沒有將 store 的 `state` 刪除，所以如果我們在 `store.$dispose` 後再次使用 `useStore` 來取得 store，那麼這個新的 store 會延用舊的 `state`。

原因在 `state` 的初始化流程中，如果看到這裡已經印象模糊的話，可以回到上面的段落複習一下！

### 其他沒提到的部分

**安裝 Plugin**

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const optionsForPlugin = Object.assign({ actions: {} }, options)

  for (const key in setupStore) {
    const prop = setupStore[key]

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      // ...
      // action
    } else if (typeof prop === 'function') {
      
      ⬇️ 加上包裝過的 action
      optionsForPlugin.actions[key] = prop
    }
  }

  pinia._p.forEach((extender) => {
    Object.assign(
      store,
      scope.run(() =>
        extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin,
        })
      )!
    )
  })
}
```

**hydrate**

這是一個 Options Store 用來補水的 API。以下為使用範例：

```ts
const useStore = defineStore('main', {
  state: () => ({
    n: useLocalStorage('key', 0)
  }),
  hydrate(storeState, initialState) {
    storeState.n = useLocalStorage('key', 0)
  }
})
```

實作如下：

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  if (
    initialState &&
    isOptionsStore &&
    options.hydrate
  ) {
    options.hydrate(store.$state, initialState)
  }
}
```

**共用 Store（單例模式）**

在前一篇有提到 Pinia 會把建立過的 Store instance 存在 `pinia._s` 這個「全域存取點」上，所以在 setup store 建立好 store 後只要這樣做就可以重複利用 Store instance 了：

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const store = reactive({
    $id,
    $onAction,
    $patch,
    $reset,
    $subscribe,
    $dispose,
  })

  pinia._s.set($id, store)
}
```

## 結語

綜合以上的內容，我們可以整理出 Option Store 的實作內容：

- **初始化 state**，這裡在初始化時需要考量 SSR 的問題，所以僅在 `pinia.state.value[id]` 不存在時才會初始化 state。
- **整理 getters**，這裡會使用 `Function.prototype.call` 讓 getter 的 `this` 指向 Store instance。
- 合併 state、actions 跟 getters，並且使用 `createSetupStore()` 來實際建立 Store instance。

Setup Store 的實作內容：

- **初始化 state**，這裡在初始化時一樣需要考量 SSR 的問題，但不太一樣的是這裡會針對每一個屬性檢查是補水。
- **包裝 actions**，這裡會將 action function 封裝，並且在執行 action 前後調用 callback function。
- 實作：`store.$onAction`、`store.$subscribe`、`store.$patch`、`store.$state`、`store.$reset`、`store.$dispose`。

深入了解 Pinia 的實作後，我們可以發現 Pinia 的實作其實很簡單，但也照顧到了非常多面向以及一些特殊案例，例如：Server Side Render、非同步等問題！最後希望這篇文章可以讓大家對 Pinia 的實作有更深入的了解。

因為篇幅考量，這裡將處理 HMR 的細節省全部略了，另外還有一些 API 沒有提及或更詳細探討，如果對這些部分有興趣歡迎與我討埨或是到 GitHub 上看更完整的原始碼！

### 參考資料

- [Pinia | The intuitive store for Vue.js](https://pinia.vuejs.org){ target="_blank" }
- [$subscribe handler invoked twice for single $patch operation #1129](https://github.com/vuejs/pinia/issues/1129){ target="_blank" }
