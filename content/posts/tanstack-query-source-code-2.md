---
title: 深入淺出 TanStack Query（二）：在呼叫 useMutation 後發生了什麼事
tags:
  - Vue
  - TanStack Query
  - Observer Pattern

created: 2023-11-04T09:00:00Z
description: 你是怎麼管理專案的 server data 狀態呢？前端開發時不僅要處理 server data 的快取，還要讓它能盡可能的跨元件共用，最後又要在適當的時候清除或更新，阿哩阿雜的真的很煩人。TanStack Query 是一個可以很好的解決這些問題的工具。這個系列文章將分享如何使用 TanStack Query 以及深入暸解它底層運作的原理與邏輯與架構。
---

## 前言

> 本篇的 TanStack Query 版本為 5.4.3

我也還不知道這系列會有多少文章，但有更新的話會一一的列在這裡：

1. [深入淺出 TanStack Query（一）：在呼叫 useQuery 後發生了什麼事](/posts/tanstack-query-source-code-1)
1. [深入淺出 TanStack Query（二）：在呼叫 useMutation 後發生了什麼事](/posts/tanstack-query-source-code-2)

## useMutation 與 useQuery 有什麼不同

`useMutation` 與 `useQuery` 有什麼不同呢？這個問題我們可以參考 Tanner Linsley（TanStack Query 的作者）在這篇推文下面的[回答](https://twitter.com/tannerlinsley/status/1324384797939003393){target="_blank"}：

>The difference is the flow of data. useQuery is used to query async data, >useMutation is used to mutate it. Or in the traditional CRUD speak:<br />
><br />
>Read: useQuery<br />
>Create/Update/Delete: useMutation

`useMutation` 主要使用在新增、修改、刪除，在設計上他是被動的，也就是說他不會自動觸發請求，而是要等到使用者調用 `mutate` 時才會發出相對應的請求；而 `useQuery` 是主動的，他會自動觸發請求，一但 `queryKey` 更新他也會自動重新發送請求。

**`useMutation`**

```ts
const useMutationTodo = () => {
  return useMutation({
    mutationFn: (options: { id: number: content: string }) => {
      return mutationTodoById(options)
    }
  })
}

const { mutate } = useMutationTodo()

const handleUpdateTodo = () => {
  // 這裡才會發送請求
  mutate({ id: 1, content: 'update todo' })
}
```

**`useQuery`**

```ts
const useQueryTodo = (id: MaybeRefOrGetter<number>) => {
  const toTefId = toRef(id)

  return useQuery({
    queryKey: ['TODO', toTefId],
    queryFn: () => fetchTodoById(toTefId.value),
  })
}

// 這裡會自動發送請求
// 並且會在 id 更新時重新發送請求
const { data } = useQueryTodo(() => router.params.id)
```

在 Dominik Dorfmeister（TanStack Query 的維護者）的[這篇文章](https://tkdodo.eu/blog/mastering-mutations-in-react-query){target="_blank"}中也有提到：

> useQuery is declarative, useMutation is imperative.

中文翻譯成聲明式（declarative）跟是命令式（imperative），但在這裡使用主動跟被動去解釋可能會更好理解。

另外如果同時調用多次相同 `useMutation` ，他們之間的狀態都是獨立，而多次調用相同的 `useQuery` ，他們之間的狀態則是共享的。

**`useMutation`**

下列三個 `useMutation` 之間的狀態是獨立的，他們之間的狀態不互相同步。

```ts
const mutation1 = useMutationTodo()
const mutation2 = useMutationTodo()
const mutation3 = useMutationTodo()
```

**`useQuery`**

下列三個 `useQuery` 之間的狀態是共享的，他們之間的狀態是同步的。

```ts
const query1 = useQueryTodo(1)
const query2 = useQueryTodo(1)
const query3 = useQueryTodo(1)
```

在理解了 `useMutation` 與 `useQuery` 的差異後，接下來我們來看看 `useMutation` 背後的實作邏輯。

### 在呼叫 useMutation 後發生了什麼事

跟 `useQuery` 一樣，`useMutation` 背後與三個類（Class）密切相關：

1. `MutationCache` - 儲存 `Mutation` 的地方。
1. `MutationObserver` - 訂閱 `Mutation` 的狀態。
1. `Mutation` - 管理請求與請求狀態的地方。

但就如同前面提到到的，`useMutation` 在設計上是被動的，所以在呼叫 `useMutation` 時並不會像是 `useQuery` 會去建立對應 `Query`，而是直到調用 `mutate` 時才會建立 `Mutation`。

所以或許標題應該寫：在呼叫 `mutate` 後發生了什麼事。

`mutate` 的實作如下：

```ts
class MutationObserver {
  mutate (
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>,
  ) {
    this.#mutateOptions = options

    this.#currentMutation?.removeObserver(this)

    this.#currentMutation = this.#client
      .getMutationCache()
      .build(this.#client, this.options)

    this.#currentMutation.addObserver(this)

    return this.#currentMutation.execute(variables)
  }
}
```

`mutate` 接受一個 `variables` 與 `options`。`variables` 是 `mutationFn` 會接收到的請求參數；而 `options` 可以用來設定 `mutate` 結束後的行為。

當呼叫 `mutate` 後，如果 `MutationObserver` 上面存有 `Mutation`，會先移除該上的 `MutationObserver`，然後建立新的 `Mutation`，並且告訴他對應到的 `MutationObserver` 是誰，最後執行 `Mutation` 上的 `execute` 方法完成請求的發送。

`MutationObserver` 與 `Mutation` 關係如下：

![Mutation 與 MutationObserver 關係圖- by Alex Liu](/images/mutation-architecture-1.png){width=794 height=530}

每一個 `MutationObserver` 只會對應到一個 `Mutation`，但不是每一個 MutationObserver 都會對應到一個 `Mutation`，這取決於是否有調用過 `mutate` 這個方法。

## 結語

綜合以上內容我們可以整理出：在呼叫 usMutation 後發生了什麼事？

1. 建立 `MutationObserver` instance。 
1. 當使用者調用 `mutate` 時，檢查使否有舊有的 `Mutation` instance，如果有則先移除該 instance 上面的 `MutationObserver` instance，最後建立 `Mutation` instance。
1. 呼叫 `Mutation` instance 發送請求。

![useMutation Flow Chart - by Alex Liu](/images/mutation-flow-chart.png){width=794 height=1211}

`useMutation` 與 `useQuery`  都是基於 Observer Pattern，所以實作上都是非常相似的。關於如何將 `query-core` 的 `mutationObserver` 整合到 `vue-query` 或是 `react-query` 中的方法其實跟 `queryObserver` 類似，所以這篇就沒有再重複提及了。

不過 `useMutation` 背後不像 `useQuery` 需要處理多個 `QueryObserver` 對應到同一個 `Query` 的問題，所以在實作上簡單很多，`MutationCache` 的存在感也低非常多。

到這裡就是 TanStack Query 的 `useMutation` 底層基本概念拉！之後還會慢慢推出更多探究 TanStack Query 底層的分享，有任何想暸解或內容有誤的地方都歡迎跟我討論。

### 參考資料

- [Mastering Mutations in React Query | TkDodo's blog](https://tkdodo.eu/blog/mastering-mutations-in-react-query)