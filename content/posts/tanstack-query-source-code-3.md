---
title: 深入淺出 TanStack Query（三）：在呼叫 invalidateQueries 後發生了什麼事
tags:
  - TanStack Query

created: 2024-03-27T04:17:24.680Z
description: 在使用 TanStack Query 時，我們經常需要手動地讓某些或是特定的 query 重新發送請求來取得最新的資料，此時，我們可以使用 invalidateQueries 方法。這篇文章將深入了解在調用 invalidateQueries 後 TanStack Query 做了什麼事，以及 invalidateQueries 與 refetch 的使用比較。
---

## 前言

> 本篇的 TanStack Query 版本為 5.28.7

這是一個跟 TanStack Query 相關的深入原始碼系列文章，TanStack Query 的架構龐大且迭代快速，所以這個系列會不定期更新，下列是目前已經發布的文章：

1. [深入淺出 TanStack Query（一）：在呼叫 useQuery 後發生了什麼事](/posts/tanstack-query-source-code-1)
1. [深入淺出 TanStack Query（二）：在呼叫 useMutation 後發生了什麼事](/posts/tanstack-query-source-code-2)
1. [深入淺出 TanStack Query（三）：在呼叫 invalidateQueries 後發生了什麼事](/posts/tanstack-query-source-code-3)

## invalidateQueries 是什麼？

下列是 TanStack Query 官方文件中對於 `invalidateQueries` 的說明：

> The `invalidateQueries` method can be used to invalidate and refetch single or multiple queries in the cache based on their query keys or any other functionally accessible property/state of the query. By default, all matching queries are immediately marked as invalid and active queries are refetched in the background.

根據文件我們可以簡單理解 `invalidateQueries` 是 `queryClient` 上的一個方法，這個方法可以讓我們依照需求，手動的讓某些或是特定的 query 重新發送請求。像是下列兩種情境就很適合使用 `invalidateQueries`。

情境一：當使用 `useMutation` 新增一筆資料後，我們可能會想要讓 `useQuery` 重新取得最新的結果，這時我們可以這樣做。

```ts
const queryClient = useQueryClient()

const { data } = useQuery({
  queryKey: ['TODOS'],
  queryFn: fetchTodos
})

const { mutate } = useMutation({
  mutationFn: addTodo,
  onSuccess() {
    return queryClient.invalidateQueries({ queryKey: ['TODOS'] })
  }
})
```

情境二：畫面上有「重新載入」按鈕，當使用者點擊時我們需要取得最新的資料，這時我們可以這樣做。

```vue
<script setup lang="ts">
const queryClient = useQueryClient()

const { data } = useQuery({
  queryKey: ['TODOS'],
  queryFn: fetchTodos
})

const onRefetch = () => {
  return queryClient.invalidateQueries({ queryKey: ['TODOS'] })
}
</script>

<template>
  <button @click="onRefetch">重新載入</button>
</template>
```

## 在呼叫 `invalidateQueries` 後發生了什麼事

為了一窺究竟，我們來看看 `queryClient` 上的 `invalidateQueries` 實作。

```ts
class QueryClient {
  invalidateQueries(
    filters: InvalidateQueryFilters = {},
    options: InvalidateOptions = {},
  ): Promise<void> {
    return notifyManager.batch(() => {
      this.#queryCache.findAll(filters).forEach((query) => {
        query.invalidate()
      })

      if (filters.refetchType === 'none') {
        return Promise.resolve()
      }
      const refetchFilters: RefetchQueryFilters = {
        ...filters,
        type: filters.refetchType ?? filters.type ?? 'active',
      }
      return this.refetchQueries(refetchFilters, options)
    })
  }

}
```

根據程式碼我們知道在呼叫 `invalidateQueries` 後，TanStack Query 需要執行下列兩件事情：

1. 依照傳入的 `filters` 找出所有的 query，並呼叫 query 上的 `invalidate` 方法。
1. 確認 `filters.refetchType` 是否為 `none`，如果是則表示不需要重新發送請求。反之則呼叫 `refetchQueries`。

接著嘗試更近一步的拆解這兩個步驟。

### Query 上的 `invalidate` 做了什麼事情

要了解 `invalidate` 做了什麼我們可以到 Query 這個類別中找到他的實作。

```ts
class Query extends Removable {
  #cache: QueryCache
  #observers: Array<QueryObserver<any, any, any, any, any>>

  invalidate(): void {
    if (!this.state.isInvalidated) {
      this.#dispatch({ type: 'invalidate' })
    }
  }

  #dispatch(action: Action<TData, TError>): void {
    const reducer = (
      state: QueryState<TData, TError>,
    ): QueryState<TData, TError> => {
      switch (action.type) {
        // 其他省略

        case 'invalidate':
          return { ...state, isInvalidated: true }
      }
    }

    this.state = reducer(this.state)

    notifyManager.batch(() => {
      this.#observers.forEach((observer) => {
        observer.onQueryUpdate()
      })

      this.#cache.notify({ query: this, type: 'updated', action })
    })
  }
}
```

雖然程式碼看起來很多，但其實只做了兩件事情：

1. 將態上的 `isInvalidated` 設定為 `true`。
1. 通知所有的 observer 跟 cache 這個 query 已經被更新。

### 在呼叫 `refetchQueries` 後發生了什麼事

接著我們來看看 `queryClient` 上的 `refetchQueries` 實作。

```ts
class QueryClient {
  refetchQueries(
    filters: RefetchQueryFilters = {},
    options?: RefetchOptions,
  ): Promise<void> {
    const fetchOptions = {
      ...options,
      cancelRefetch: options?.cancelRefetch ?? true,
    }
    const promises = notifyManager.batch(() =>
      this.#queryCache
        .findAll(filters)
        .filter((query) => !query.isDisabled())
        .map((query) => {
          let promise = query.fetch(undefined, fetchOptions)
          if (!fetchOptions.throwOnError) {
            promise = promise.catch(noop)
          }
          return query.state.fetchStatus === 'paused'
            ? Promise.resolve()
            : promise
        }),
    )

    return Promise.all(promises).then(noop)
  }
}
```

1. 依照傳入的 `filters` 找出所有的 query。
1. 過濾掉所有 `isDisabled()` 為 `true` 的 query。
1. 調用剩下的 query 上的 `fetch` 方法重新發送請求。

`isDisabled` 是一個 query 上的方法，這個方法依照兩件事情來判斷是否為 `false`：

```ts
class Query extends Removable {
  isActive(): boolean {
    return this.#observers.some(
      (observer) => observer.options.enabled !== false,
    )
  }

  isDisabled(): boolean {
    return this.getObserversCount() > 0 && !this.isActive()
  }
}
```

這裡的程式碼邏輯有點繞，簡單列點說明：

1. 如果 query 沒有被任何 observer 訂閱則為 `false`。
1. 如果 query 上的任一個 observer 的 `enabled` 不為 `false` 則為 `false`。

經過上述重重的判斷條件

看完了這個段落關於 `refetchQueries` 的實作分析，結合上一段的內容我們可以完整拼湊出在呼叫 `invalidateQueries` 後發生了什麼事情。

## invalidateQueries vs refetch

在一開始的範例中，我們提到了如果要讓 `useQuery` 重新取得結果，我們可以使用 `invalidateQueries`。但這似乎有點違背直覺，重新取得（refetch）應該比無效（invalidate）更直覺才是，並且 `useQuery` 也有 `refetch` 方法可以使用，為什麼需要特地印入 `queryClient` 的 `invalidateQueries` 呢？

當然，上面的例子完全可以改使用 `refetch` 方法。

```ts
const { data, refetch } = useQuery({
  queryKey: ['TODOS'],
  queryFn: fetchTodos
})

const { mutate } = useMutation({
  mutationFn: addTodo,
  onSuccess() {
    return refetch()
  }
})
```

但 TanStack Query 的核心維護成員（[@TkDodo](https://twitter.com/TkDodo)）依然推薦使用 `invalidateQueries`，更勝於 `refetch`，像是[這篇討論](https://github.com/TanStack/query/discussions/2468)或是下列這篇推文串。

::tweet
<p lang="en" dir="ltr">I mostly agree with Julien. `refetch()` on a disabled observer; `refetch()` after local setState in an event handler. `refetch()` in a useEffect. They all point to underlying issues and a non-idiomatic use of react-query <a href="https://t.co/PRLXnNo77L">https://t.co/PRLXnNo77L</a></p>&mdash; Dominik 🔮 (@TkDodo) <a href="https://twitter.com/TkDodo/status/1635618031521996806?ref_src=twsrc%5Etfw">March 14, 2023</a>
::

針對這個問題，核心維護成員也進一步提到了兩個理由：

::tweet
<p lang="en" dir="ltr">I&#39;d say yes. `refetch` only targets the specific query, while invalidation matches fuzzily. This is important if you have multiple list, e.g. when having filters.<br><br>Also, most often you don&#39;t have access to `refetch` returned from useQuery where your mutation lives</p>&mdash; Dominik 🔮 (@TkDodo) <a href="https://twitter.com/TkDodo/status/1635663049452404736?ref_src=twsrc%5Etfw">March 14, 2023</a></blockquote>
::

另外，如果我們回顧前面的內容會發現，如果我們要 `invalidate` 的 query 是 `disabled` 的話，TanStack Query 只會把這個 query 標記為無效，而不會重新發送請求。這個細節 `refetch` 就做不到，使用 `refetch` 的 query 就算是 `disabled` 也會重新發送請求。這個行為甚至被認定為只是為了繞過 `disabled` 的一種手段。

## 結語

在這篇文章中，我們了解了 `invalidateQueries` 的功能與使用場景，接著深入剖析了在呼叫 `invalidateQueries` 後發生了什麼事。最後也比較了 `invalidateQueries` 和 `refetch` 兩種方法的差異跟官方推薦的使用方式。

![useMutation Flow Chart - by Alex Liu](/images/invalidate-queries-flow-chart.png){width=794 height=887}

深入了解 `invalidateQueries` 之後，我們發現其整體實作遠比預期的要簡單。除了原始碼外，會特別挑 `invalidateQueries` 出來寫的另一個原因是在工作上蠻常遇到選用 `invalidateQueries` 與 `refetch` 的討論。很顯然地 `refetch` 不論在使用上跟命名上都比 `invalidateQueries` 更直覺，如果想要說服團隊選用 `invalidateQueries` 就需要更完整的論述。

到這裡就是關於 TanStack Query 的 `invalidateQueries` 的完整探討拉！文章中有任何想進一步了解或內容有誤的地方都歡迎跟我討論。

### 參考資料

- [QueryClient | TanStack Query Docs](https://tanstack.com/query/v5/docs/reference/QueryClient#queryclientinvalidatequeries)
- [refetch vs invalidating query · TanStack/query · Discussion #2468](https://github.com/TanStack/query/discussions/2468)