---
title: 深入淺出 pinia（三）：createSetupStore
tags:
- Vue
- Pinia

created: 2023-05-20T00:00:00.002Z
description: Pinia 是目前 Vue 官方首推的狀態管理工具。這系列文章不會特別著重在如何使用 Pinia 而是深入剖析 Pinia 的原始碼，研究它的設計，從中吸收寶貴的經驗。在上一篇的內容我們先看了 Options Store 的實作，發先最後會透過 Setup Store 完成整個 Store 的建立。因此接下來會更深入核心了解 Setup Store 內部的實作。
---

## 前言

> 本篇的 pinia 版本為 2.1.3 

這系列一共有三篇文章，分別是：

1. [深入淺出 pinia（一）：createPinia、defineStore](./pinia-source-code-1)
2. [深入淺出 pinia（二）：createOptionsStore](./pinia-source-code-2)
3. [深入淺出 pinia（三）：createSetupStore](./pinia-source-code-3)

如果熟悉 Composition API 的話，Setup Store 在使用上會有非常一致的體驗。而 `createSetupStore` 我個人認為算是 Pinia 中最核心的部分，幾乎所有的功能都是在這裡實作的。在本篇將會深入了解 Setup Store 的實作細節。


## Setup Store

`createSetupStore` 實作含型別、HMR、註解等有 500 多行，也因為大部分會用到的 api 都集中在這裡面，所以我會先列出這裡面有實做到的 api，並且在後面逐一解釋。

| api                | 功能說明 |
|--------------------|---------|
| `store.$onAction`  | 設定一個 callback function，在 action 被執行前調用。 |
| `store.$subscribe` | 設定一個 callback function，當 state 更新時調用。它會回傳一個用來移除該 callback function 的 function |
| `store.$patch`     | 更新 state，可以直接賦值部分新的狀態或是使用 callback 取得當前 state 並修改。 |
| `store.$state`     | 當前 store 的 state，如果對他直接設定 state，內部會使用 `store.$patch` 更新 |
| `store.$reset`     | 重置整個 store 的 state，只是適用於 Options Store。 |
| `store.$dispose`   | 清除整個 store 的「副作用」，並且將 store 從 Pinia Instance 上將該 store 刪除。 |

不過在一一介紹 api 之前，我們還是需要初始化 state。

### 初始化 state

這裡要做的事情大致與 `createOptionsStore` 相同，不過因為 Option Store 的 `state` 先前已經透過 state function 來初始化，所以如果是 Options Store 這裡不需要再做一次。

另外在 Setup Store 我們沒有一個專們取得 state 的 state function，所以我們無法因為 `initialState` 不存在而透過 `state()` 來取得 state。所以 `initialState` 不存在時，我們先將 `pinia.state.value[$id]` 設定成一個空物件。 

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const initialState = pinia.state.value[$id]

  if (!isOptionsStore && !initialState) {
    if (isVue2) {
      set(pinia.state.value, $id, {})
    } else {
      pinia.state.value[$id] = {}
    }
  }

}
```

接下來我們可以把 setup function 回傳的 state 一個一個的寫進 `pinia.state.value[$id]` 中，在整個 setup function 回傳的物件中，我們可以透過 `isRef`、`isComputed`、`isReactive` 來判斷是 state 還是 getter 或 action。

判斷是否為 state 的條件如下：

1. 是 `Ref` 且不是 `Computed`。
2. 是 `Reactive`。

依照條件我們可以寫出分類程式碼，如下：

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const setupStore = setup()

  for (const key in setupStore) {
    const prop = setupStore[key]

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      // state
    } else if (typeof prop === 'function') {
      // action
    }
  }
}
```

接著我們把 `setupStore` 寫進 `pinia.state.value[$id]` 裡面。但是我們已經知道這裡有一個問題：如果我們直接將 `setupStore` 寫進 `pinia.state.value[$id]`，那麼在 Server Side Render 時就有機會遇到 hydration error。

為了避免 hydration error 我們需要檢查 `initialState[key]` 是否存在，如果存在，就使沿用，反之則使用 `setupStore[key]` 的值。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const setupStore = setup()

  for (const key in setupStore) {
    const prop = setupStore[key]

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      // Options Store 的 state 會在 state function 中初始化，所以這裡不需要再初始化
      if (!isOptionsStore) {
        if (initialState) {
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

另外第一篇有提到 Effect Scope，每一個 Store 的 setup 都會在 Pinia instance 上的 Effect Scope 中建立自己的 Effect Scope，形成一個樹狀的 Effect Scope。這樣的用意是一但當 Pinia instance 被銷毀時，可以透過這個樹狀的 Effect Scope 關係來清除所有的副作用。

setup function 中除了可以使用 `computed` 之外還可以定義 `watch`，這些都會有副作用需要清除，所以我們需要一個專們的 Effect Scope 來收集這些副作用，我們將 `setupStore` 的部分改寫成這樣：

```ts

function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const setupStore = pinia._e.run(() => {
    scope = effectScope()
    return scope.run(() => setup())
  })

  //
}
```

這樣我們就可以收集到 `setupStore` 中所有的副作用了。

### 包裝 Actions

在剛剛 `setupStore` 的物件中，我們挑出了 state 以及 getter。而剩下的如果型別為 `function` 的話，就會被當作 actions 來處理。

基本上 action 是可以被直接使用不需進過特別處理的，但是在 Pinia 中我們需要對 action 做包裝，因為 Pinia 提供了一個 API 可以讓我們在 action 執行前後調用 callback function，這個 API 就是 `store.$onAction`。

所以們可以定義一個並使用 `wrapAction` 來包裝 actions 負責攔截每一個 action 的執行。

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
      // state
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


`wrapAction` 要怎麼攔截 actions 的值行呢？

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
  const actionSubscriptions = []

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
      setActivePinia(pinia) // 這個在上一篇的 getter 中有提到，這裡就不多說了

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
  const actionSubscriptions = []

  // ...

  function wrapAction(name, action) {
    return function () {
      setActivePinia(pinia)

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
  const subscriptions: SubscriptionCallback<S>[] = []

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

不過我們還需要時做 `{ detached: true }` 的功能，當 `detached` 為 `true` 時，他就「不會」在銷毀 store 時自動移除 callback function。

```vue
<script setup>
const store = useStore()

// 即使在 component 銷毀後，這訂個 subscription 也會保留
store.$subscribe(callback, { detached: true })
</script>
```

為了時做這個功能，我們需要在 `store.$subscribe` 中加入一些邏輯處理。並且使用當 Effect Scope 被銷毀時會觸發的 hook：`onScopeDispose`。`onScopeDispose` 可以想像像是 `onUnmounted`，但是他是在 Effect Scope 被銷毀時觸發，而每個元件都有自己的 Effect Scoped，所以元件在銷毀時也會銷毀自身的 Effect Scope 。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const subscriptions: SubscriptionCallback<S>[] = []

  const store = reactive({
    // ...
    $subscribe(callback, options) {
      subscriptions.push(callback)

      const removeSubscription () => {
        const index = subscriptions.indexOf(callback)
        if (index > -1) {
          subscriptions.splice(index, 1)
        }
      }

      // 依照上面範例 
      // 這裡的 Current Scope 為該 component 的 Effect Scope
      if (!options?.detached && getCurrentScope()) {

        // 當 Current Scope 銷毀時執行 removeSubscription
        onScopeDispose(removeSubscription)
      }

      return removeSubscription
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

要補捉直接修改 `state` 的最簡單方法就是 `watch`。所以我們可以對 `$subscribe` 稍微加工，。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  let scope!: EffectScope

  const subscriptions: SubscriptionCallback<S>[] = []

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

按照 `watch` 的 API，第三個參數 `options` 中的 `flush` 可以設定 `watch` 的 callback function 在何時被執行，預設行為為準備更新畫面前：`pre`。

`isListening` 是用來控制 `flush` 為 `pre` 的 watch，因此 `isListening` 需要在 `nextTick` 後才打開，這樣就才以確保在 `watch` 執行時，知道要忽略這次的 callback 執行；而 `isSyncListening` 則是用來控制 `flush` 為 `sync` 的 watch，這種 watch 會在資料一改變就馬上執行，所以我們可以直接在 `store.$patch` 的最後直接恢復開關。

但問題又來了！<br>
但問題又來了！<br>
但問題又來了！<br>

現在的程式碼在這個時候會出問題（可搭配重現範例：[Pinia #1129 重現](https://stackblitz.com/edit/vitejs-vite-vuof7u?file=src%2FApp.vue){ target="_blank" }）：

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

為什麼會這樣，我們把事發經過一步一步攤開來看。

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

### 安裝 Plugins

在研究 Plugins 安裝功能前先看看怎麼使用吧：

```ts
import { createPinia } from 'pinia'

function plugin({ 
  pinia,    // pinia instance
  app,      // 當前的 vue application instance
  store,    // 當前的 store
  options   // 取得 `defineStore()` 時定義商店的初始選項
})  {
  return { secret: 'the cake is a lie' }
}

const pinia = createPinia()
pinia.use(plugin)
```

而實際設計非常簡單：

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

### 其他沒提到的部分

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
    _p: pinia,
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

**markRaw**

在上一部份我們看到了 Pinia instance 會被以私有屬性的方式存到 Store instance 上，這裡我們可以使用 `markRaw` 來避免 Pinia instance 被 reactive。

```ts
function createSetupStore($id, setup, options, pinia, isOptionsStore) {
  const store = reactive({
    _p: markRaw(pinia),
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

不過實際上這裡的 `markRaw` 是被寫在第一篇的 `createPinia` 裡面

```ts
export function createPinia(): Pinia {

  let _p = []
  let toBeInstalled = []

  const pinia: Pinia = markRaw({
    // 略
  })

  return pinia
}
```

## 結語

綜合以上的內容，我們可以整理出 Setup Store 的實作內容：

- **初始化 state**，這裡在初始化時一樣需要考量 SSR 的 hydration 問題，但不太一樣的部分是這裡會針對每一個屬性檢查是補水。
- **包裝 actions**，在這裡會將 action function 封裝，並且在執行 action 前後調用 `store.$onAction` 的 subscription function；另外雖然這一篇沒有細講跨請求狀態污染的議題，但是每次在呼叫 action 前我們還是需要 `setActivePinia(pinia)` 來避免污染的問題，詳情可以回顧第二篇「整理 getters」的部分。
- 實作：`store.$onAction`、`store.$subscribe`、`store.$patch`、`store.$state`、`store.$reset`、`store.$dispose`。

深入了解 Pinia 的實作後，我們可以發現 Pinia 的實作其實很簡單，但也照顧到了非常多面向以及一些特殊案例，例如：Server Side Render、非同步等問題！最後希望這篇文章可以讓大家對 Pinia 的實作有更深入的了解。

因為篇幅考量，這裡將處理 HMR 的細節省全部略了，另外還有一些 API 沒有提及或更詳細探討，如果對這些部分有興趣歡迎與我討埨或是到 GitHub 上看更完整的原始碼！

### 參考資料

- [Pinia | The intuitive store for Vue.js](https://pinia.vuejs.org){ target="_blank" }
- [RFC - Reactivity Effect Scope](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md){ target="_blank" }
- [$subscribe handler invoked twice for single $patch operation #1129](https://github.com/vuejs/pinia/issues/1129){ target="_blank" }

