---
title: 深入淺出 TanStack Query（一）：在呼叫 useQuery 後發生了什麼事
tags:
  - TanStack Query
  - Observer Pattern

created: 2023-09-30T13:45:16.002Z
description: 你是怎麼管理專案的 server data 狀態呢？前端開發時不僅要處理 server data 的快取，還要讓它能盡可能的跨元件共用，最後又要在適當的時候清除或更新，阿哩阿雜的真的很煩人。TanStack Query 是一個可以很好的解決這些問題的工具。這個系列文章將分享如何使用 TanStack Query 以及深入暸解它底層運作的原理與邏輯與架構。
---

## 前言

> 本篇的 TanStack Query 版本為 5.0.0-rc.1

這是一個跟 TanStack Query 相關的深入原始碼系列文章，TanStack Query 的架構龐大且迭代快速，所以這個系列會不定期更新，下列是目前已經發布的文章：

1. [深入淺出 TanStack Query（一）：在呼叫 useQuery 後發生了什麼事](/posts/tanstack-query-source-code-1)
1. [深入淺出 TanStack Query（二）：在呼叫 useMutation 後發生了什麼事](/posts/tanstack-query-source-code-2)
1. [深入淺出 TanStack Query（三）：在呼叫 invalidateQueries 後發生了什麼事](/posts/tanstack-query-source-code-3)

## TanStack Query 是什麼？

TanStack Query 有個更為人熟知的名稱叫：**React-Query**。而 TanStack Query 在 v4 這個版本時將核心獨立分離出來，分離出來的 `query-core` 本身與框架無關所以可再依照不同的框架特性分別封裝成專屬特定框架使用的 package，像是目前TanStack Query 就提供以下 npm package 給不同框架的使用者使用：

- Vue：`@tanstack/vue-query`
- React：`@tanstack/react-query`
- Solid：`@tanstack/solid-query`
- Svelte：`@tanstack/svelte-query`

接下來的範例會使用我比較熟悉的 `@tanstack/vue-query` 撰寫，在 API 上會與 React 版本的 `@tanstack/react-query` 有些微差異。但當在探討涉及核心實作時，基本上就如同前面提到的「**與框架無關**」所以就算是 React 的使用者也可以方心服用。

## 為何要使用 TanStack Query

TanStack Query 不是一個 data fetching 的工具，它是一個 server data 的狀態管理工具。TanStack Query 會幫我們快取來自 server 的資料，並且在適當的時間內盡可能使用快取或是在過期後背景重新取得資料。

在不使用 TanStack Query 時我們需要手動的將這些狀態一個一個存起來自己管理：

```vue
<script lang="ts">
function fetchTodoById(id: number) {
  return fetch(`https://jsonplaceholder.typicode.com/todos/${id}`).then(
    response => response.json()
  );
}

function useTodo(id: number) {
  const data = ref();
  const error = ref();
  const isFetching = ref(false);

  isFetching.value = true;
  fetchTodoById(id)
    .then(result => {
      data.value = result;
    })
    .catch(err => {
      error.value = err;
    })
    .finally(() => {
      isFetching.value = false;
    });

  return {
    data,
    error,
    isFetching,
  };
}
</script>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  id: number;
}>();

const { data, error, isFetching } = useTodo(props.id);
</script>
```

大費周章的寫了一個基本範例，但如果使用 TanStack Query 改寫會變成什麼樣子呢？

要在 Vue 專案中使用 TanStack Query，我們必須在 Vue app 的 instance 上面裝上 `VueQueryPlugin` 

```ts
// main.ts
import { VueQueryPlugin } from "@tanstack/vue-query";

app.use(VueQueryPlugin)
```

接著我們將上面手動觀禮狀態的版本改成使用 TanStack Query 的版本：

```vue
<script lang="ts">
function fetchTodoById(id: number) {
  return fetch(`https://jsonplaceholder.typicode.com/todos/${id}`).then(
    response => response.json()
  );
}

function useTodo(id: number) {
  return useQuery({
    queryKey: ['TODO', id],
    queryFn: () => fetchTodoById(id),
  });
}
</script>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

const props = defineProps<{
  id: number;
}>();

const { data, error, isFetching } = useTodo(props.id);
</script>
```

是不是簡潔很多呢？而且 TanStack Query 還可以依照設定，決定多久時間內重新呼叫 `useTodo` 不再重新發送請求，又或是畫面上兩個以上的地方都使用到 `useTodo` 他可以讓請求不重複並且共享相同的結果。

```vue
<script setup lang="ts">
// A 元件
const { data, error, isFetching } = useTodo(1);
</script>
```

```vue
<script setup lang="ts">
// B 元件
const { data, error, isFetching } = useTodo(1);
</script>
```

如果 A 元件與 B 元件同時出現在畫面上，最終只會發出一個 data fetching，並且兩個元件共享同一個資料響應。

感受到 TanStack Query 的厲害了嗎？為了暸解**在呼叫 `useQuery` 後發生了什麼事？**，我們必須先暸解 TanStack Query 的核心架構。

## TansStack Query 的核心架構

在我們每次呼叫 `useQuery` 後 TanStack Query 會建立一個 `QueryObserver` 的 instance，這個 instance 紀錄著我們傳入的設定，並且他會拿著這個設定去一個叫 `QueryCache` 的 instance 上找有沒有符合條件的 `Query` instance 存在，有的話就取出使用，沒有的話 `QueryCache` 就會就建立一個新的 `Query` instance 返回並儲存。

所以如果當上面範例中的 `useTodo` 分別傳入三個不同 `id` 呼叫，他被後建立的關係圖如下：

```ts
useTodo(1);
useTodo(2);
useTodo(3);
```

![Query 與 QueryObserver 關係圖 - by Alex Liu](/images/query-architecture.png){width=794 height=530}

我們可以看到，每一個 `QueryObserver` 都會對應到一個存在 `QueryCache` 上的 `Query`。那 `QueryObserver` 拿什麼去找 `Query` 呢？

是的！就是：`queryKey`。

```ts
function useTodo(id: number) {
  return useQuery({
    // 這裡的 `queryKey` 會對應到一個 `Query` instance。
    queryKey: ['TODO', id],
    queryFn: () => fetchTodoById(id),
  });
}
```

在這裏，每一個 `QueryObserver` instance 都只會對應到一個 `Query` instance。所以當城市更新，第三個 `useTodo` 傳入的 `queryKey` 發生變化，變成與第二個的相同，他的關係圖就會變成如下：

```ts
useTodo(1);
useTodo(2);

// 從 3 變成 2
useTodo(2);
```


![Query 與 QueryObserver 關係圖（2）- by Alex Liu](/images/query-architecture-2.png){width=794 height=530}

此時 `queryKey` 相同的 `QueryObserver` 就會對應到同一個 `Query` instance 上面。

## QueryCache 怎麼找到 Query

不過我們傳入的 `queryKey` 是一個陣列，TanStack Query 是如何儲存 `Query` 跟找到建立過的 `Query` 呢？

在 TanStack Query 中 `queryKey` 扮演了很重要的角色，他牽起了 `QueryObserver` 與 `Query` 的關係，讓具有相同 `queryKey` 的不同 `QueryObserver` instance 可以找到同一個 `Query` instance。除此之外根據官方文件，`queryKey` 不但可以像上面傳入 `string` 與 `number` 還可以傳入物件、陣列等等。

```ts
useQuery({ queryKey: ['TODOS', { status: 'done', page: 1, perPage: 20 }], ... })
```

而且 `queryKey` 的物件順序不影響 `QueryObserver` 找到同一個 `Query` instance，也就是説下列程式碼產生的三個 `QueryObserver` 都會找到同一個 `Query` instance。

```ts
useQuery({ queryKey: ['TODOS', { status: 'done', page: 1, perPage: 20 }], ... })
useQuery({ queryKey: ['TODOS', { page: 1, perPage: 20, status: 'done' }], ... })
useQuery({ queryKey: ['TODOS', { perPage: 20, page: 1, status: 'done' }], ... })
```

這是怎麼做到的呢？

其實很簡單，`QueryCache` 在查找 `QueryObserver` 需要的 `Query` 時會先將 `queryKey` 使用內部一個叫 `hashKey` 的 function 轉換成字串，我們可以看看核心是怎麼實作的：

```ts
/**
 * Default query & mutation keys hash function.
 * Hashes the value into a stable hash.
 */
export function hashKey(queryKey: QueryKey | MutationKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )
}
```

`hashKey` 這個 function 其實就是用 `JSON.stringify` 將傳入的 `queryKey` 轉換成字串，在這裡使用了 `JSON.stringify` 比較罕見地第二個參數：`replacer`，我們可以看看 MDN 上怎麼解釋 `replacer` 的使用方式與功能：

```
JSON.stringify(value [,replacer [, space]])
```

`replacer` 可以是一個 function，他用來改變轉成字串這個過程的行為；也可以是一個包含字串與數字的陣列，用於輸入後要保留的屬性。如果 `replacer` 是一個陣列，陣列中的元素只要不是字串或是數字（任何 primitives 或是物件），包括 `Symbol` 都會被忽略掉。如果 `replacer` 不是一個 function 或陣列（例如 `null` 或沒有提供），則物件的所有以字符串為 key 的屬性都將包括在生成的 JSON 字符串中。

看完這麼長一段我們知道一個重點：**傳入的 `replacer` 傳入 function 可以用來改變轉成字串這個過程的行為**。

所以回頭看 `hashKey` 在處理的就是將陣列丟到 `JSON.stringify` 轉換成字串。在轉換的過程中如果遇到一個純物件， `replacer` function 就會將原本物件（`val`）的 keys 重新排序並產生一個新的物件並會傳給 `JSON.stringify` 轉換成字串。

轉換成字串的 `queryKey` 叫做 `queryHash`。有了 `queryHash` 就可以在 `QueryCache` 上的 `#queries` 找找有沒有已經存在的 `Query` instance 存放在裡面。有的話就重複使用，沒有的話就建立一個新的 `Query` instance。

注意：因為 `queryKey` 轉換成 `queryHash` 的過程在實作上只針對物件的 keys 做排序，所以陣列裡面的順序不同會被視為不同的 `queryKey`。

```ts
useQuery({ queryKey: ['TODOS', status, page], ... })
useQuery({ queryKey: ['TODOS', page, status], ...})
useQuery({ queryKey: ['TODOS', undefined, page, status], ...})
```

以上三個，因為陣列內的順序不太一樣，所以會視為不同的 `queryKey`。

## 建立雙向的關係

每一個 `QueryObserver` 都會指向一個 `Query`，而 `Query` 掌管了 data fetching 跟狀態管理，當 `Query` instance 上的資料更新他也要通知所有 `QueryObserver` 更新資料。可是此時 `Query` 並不會知道有哪些 `QueryObserver` 指向（訂閱）他，所以 TanStack Query 需要一個機制來讓 `Query` 收集有哪些 `QueryObserver` 指向自己。

為了說明 TanStack Query 怎麼處理這件事情，我們先跳離核心（`query-core`），來看看 `vue-query` 跟 `react-query` 怎麼訂閱 `Query` 上的狀態更新。

**vue-query**

```ts
const observer = new Observer(client, defaultedOptions.value)
const state = reactive(observer.getCurrentResult())

watch(
  client.isRestoring,
  (isRestoring) => {
    if (!isRestoring) {
      unsubscribe()
      unsubscribe = observer.subscribe((result) => {
        updateState(state, result)
      })
    }
  },
  { immediate: true },
)
```

**react-query**

```ts
const [observer] = React.useState(() => new Observer(client, defaultedOptions),)
const result = observer.getCurrentResult()

React.useSyncExternalStore(
  React.useCallback(
    (onStoreChange) => {
      const unsubscribe = isRestoring
        ? () => undefined
        : observer.subscribe(notifyManager.batchCalls(onStoreChange))

      // Update result to make sure we did not miss any query updates
      // between creating the observer and subscribing to it.
      observer.updateResult()

      return unsubscribe
    },
    [observer, isRestoring],
  ),
  () => observer.getCurrentResult(),
  () => observer.getCurrentResult(),
)
```

其實兩個框架的實作我們都只需要關注 `observer.subscribe(callback)` 這一段就好。假設這裡的 `isRestoring` 一開始就是 `false`，這時會馬上執行 `observer.subscribe(callback)`。這個 `subscribe` 是 `QueryObserver` 繼承的 `Subscribable` 類型上的實作方法，他內部又會呼叫 `QueryObserver` 上的 `onSubscribe`，如下：

```ts
class QueryObserver extends Subscribable {
  //...
   protected onSubscribe(): void {
    if (this.listeners.size === 1) {
      // this.#currentQuery 是這個 QueryObserver 指向的 `Query` instance
      this.#currentQuery.addObserver(this)

      if (shouldFetchOnMount(this.#currentQuery, this.options)) {
        this.#executeFetch()
      }

      this.#updateTimers()
    }
  }
}
```

從程式碼裡面可以發現，對框架實作來說 `QueryObserver` 提供了一個「訂閱」的方法。一但框架執行了訂閱，這時 `onSubscribe` 會被呼叫，接著 `QueryObserver` 就會將自己的 instance 加到他所追蹤的 `Query` instance 上的觀察者清單裏面，這樣 `Query` 就完成了訂閱者的收集。接下來只要 `Query` 有任何狀態變更，像是開始請求、請求成功、請求失敗 … 等，`Query` 都可以把收集到的 `QueryObserver` 一個一個叫出來更新。

我們複習一下上面出現過的關係圖：

![Query 與 QueryObserver 關係圖（3）- by Alex Liu](/images/query-architecture-3.png){width=794 height=393}

`QueryObserver` 與 `Query` 建立了雙向的關係，`QueryObserver` 可以知道要去那個一個 `Query` 上面找資料，而 `Query` 也會知道誰訂閱了自己的狀態，當自己狀態變化時要去叫哪些 `QueryObserver` 更新資料，這就是「觀察者模式」（Observer Pattern）又被稱為「發布-訂閱模式」（Publish-Subscribe Pattern）。

## 結語

綜合以上內容我們可以整理出：在呼叫 useQuery 後發生了什麼事？

1. 建立 `QueryObserver` instance
1. 在 `QueryCache` 取的需要的 `Query` instance。`QueryCache` 會依照 `QueryObserver` 提供的 `queryKey` 轉換成 `queryHash` 並找看看有沒有對應的 `Query` 已經被建立。
1. 有找到對應的 `Query` instance 就共用，沒有的的話就建立一個新的並回傳。
1. 當開始訂閱 `QueryObserver` 時，`QueryObserver` 會將自己加到 `Query` instance 上的 observers 清單。當 `Query` 的資料有任何變化時，它就可以通知所有的 `QueryObserver` 做出相對應的更新。

![useQuery Flow Chart - by Alex Liu](/images/query-flow-chart.png){width=794 height=1211}

到這裡就是 TanStack Query 的 `useQuery` 底層基本概念拉！之後還會慢慢推出更多探究 TanStack Query 底層的分享，有任何想暸解或內容有誤的地方都歡迎跟我討論。

### 參考資料

- [Inside React Query | TkDodo's blog](https://tkdodo.eu/blog/inside-react-query)
- [JSON.stringify() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [Observer Pattern | Patterns](https://www.patterns.dev/posts/observer-pattern)
- [觀察者模式 | Rock070](https://rock070.me/notes/designpattern/22_pattern/observer-pattern)
- [[npm] react-query | PJCHENder 未整理筆記](https://pjchender.dev/npm/npm-react-query/)