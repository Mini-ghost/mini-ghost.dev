---
title: 為什麼 Nuxt 推薦使用全域的 $fetch
tags:
  - Nuxt

created: 2025-04-12T00:00:00.000Z
description: 
  Nuxt 在 HTTP 請求上提供了 $fetch 這個全域的 utils function，這個 utils function 讓我們可以輕鬆取得來自後端的資料，但為什麼 Nuxt 會推薦我們使用 $fetch 而不是其他的 HTTP 請求工具呢？讓我們一起認識 $fetch 並了解它的優勢吧！
---

## 前言

在使用 Nuxt 開發 Server Side Rendering 網站時，你會用什麼工具來發送 HTTP 請求呢？

Nuxt 在 HTTP 請求上提供了 `$fetch` 這個全域的 utils function，這個 utils function 讓我們可以輕鬆取得來自後端的資料，用法如下：

```ts
const { data } = useAsyncData(() => {
  return $fetch('https://jsonplaceholder.typicode.com/posts')
})
```

當然，想要使用內部 API 路由取得資料也完全不是問題。

```ts
const { data } = useAsyncData(() => $fetch('/api/posts'))
```

不過有時候我們可能會想要使用我們原本習慣的 HTTP 請求工具，像是 axios 或者 ky-universal 等，難道不可以嗎！？

## Nuxt 與 axios 搭配使用無法 Server Side Rendering

我們把上面的範例改寫成使用 axios 的版本：

```ts
import axios from 'axios'

const { data } = useAsyncData(() => {
  return axios('https://jsonplaceholder.typicode.com/posts').then((res) => res.data)
})
```

使用起來完全沒有問題，所以想要使用原本習慣的 axios 當然是可以的。

但如果我們想要使用內部 API 路由取得資料，這時候 Server Side Rendering 就會發生錯誤了。

```ts
import axios from 'axios'

const { data } = useAsyncData(() => {
  return axios('/api/posts').then((res) => res.data).catch((error) => console.error(error))
})
```

我們來看看錯誤訊息顯示了什麼。

```text
 ERROR  Invalid URL

    at new URL (node:internal/url:775:36)
    at dispatchHttpRequest (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/adapters/http.js:232:20)
    at node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/adapters/http.js:152:5
    at new Promise (<anonymous>)
    at wrapAsync (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/adapters/http.js:132:10)
    at http (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/adapters/http.js:170:10)
    at Axios.dispatchRequest (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/core/dispatchRequest.js:51:10)
    at Axios._request (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/core/Axios.js:187:33)
    at Axios.request (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/core/Axios.js:40:25)
    at wrap (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/helpers/bind.js:5:15)
    at Axios.request (node_modules/.pnpm/axios@1.8.4/node_modules/axios/lib/core/Axios.js:45:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
```

而就算改用 Nuxt 使用的 HTTP 工具 ofetch，也一樣會發生錯誤。

```ts
import { $fetch } from 'ofetch'

const { data } = useAsyncData(() => {
  return $fetch('/api/posts').then((res) => res.data).catch((error) => console.error(error))
})
```

```text
 ERROR  [GET] "/api/posts": <no response> Failed to parse URL from /api/posts

    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async $fetchRaw2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:270:14)
    at async $fetch2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:316:15)

  [cause]: Failed to parse URL from /api/posts

      at Object.fetch (node:internal/deps/undici/undici:11372:11)
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      at async $fetchRaw2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:258:26)
      at async $fetchRaw2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:270:14)
      at async $fetch2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:316:15)

    [cause]: Invalid URL

        at new URL (node:internal/url:775:36)
        at new _Request (node:internal/deps/undici/undici:5055:25)
        at fetch2 (node:internal/deps/undici/undici:9195:25)
        at Object.fetch (node:internal/deps/undici/undici:11370:18)
        at fetch (node:internal/process/pre_execution:282:25)
        at node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/node.mjs:26:58
        at $fetchRaw2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:258:32)
        at onError (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:179:16)
        at $fetchRaw2 (node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/shared/ofetch.03887fc3.mjs:270:20)
        at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
```

我們可以看到 `Invalid URL` 跟 `Failed to parse URL from /api/posts` 這兩個錯誤訊息。

上面的做法在 Server Side 會出錯是因為在 Node.js 的環境下，像 `/api/posts` 這樣的請求並不會自動帶上 host，這樣 Node.js 就無法判斷應該將請求發送到哪裡，因而導致錯誤。

解決方法是發出請求時要確保 `axios` 或是 ofetch 可以解析出完整的 URL，這樣 Node.js 才能正確解析這個請求。

```ts
import axios from 'axios'

const url = useRequestURL()
const { data } = useAsyncData(() => {
  return axios(`${url.origin}/api/posts`).then((res) => res.data)
})
```

```ts
import { $fetch } from 'ofetch'

const url = useRequestURL()
const { data } = useAsyncData(() => {
  return $fetch(`${url.origin}/api/posts`)
})
```

但到這裡更令人好奇的是，為什麼直接使用 `$fetch`，就不會發生這個問題呢？

## Nitro Server 上的 $fetch

在 Nuxt 中我們使用全域的 `$fetch` 與從 ofetch 導入的 `$fetch` 是不完全一樣的 function。在 Server Side 我們使用的全域 `$fetch` 是經由 Nitro Server 重新封裝過的，我們稍微看一下 Nitro Server 是怎麼處理這個部分的。

```ts
import { createApp, toNodeListener } from "h3";
import { Headers, createFetch } from "ofetch";
import { fetchNodeRequestHandler, callNodeRequestHandler } from "node-mock-http";

function createNitroApp(): NitroApp {
  const h3App = createApp({ ... });

  // Create local fetch caller
  const nodeHandler = toNodeListener(h3App);

  const localFetch: typeof fetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }

    // ⬇️ 如果是內部請求走這裡
    return fetchNodeRequestHandler(
      nodeHandler,
      input as string,
      init
    ).then((response) => normalizeFetchResponse(response));
  };

  const $fetch = createFetch({
    fetch: localFetch,
    Headers,
    defaults: { baseURL: config.app.baseURL },
  });

  // @ts-ignore
  globalThis.$fetch = $fetch;

  //...
}
```

透過上面的實作的片段，我們大概可以略知一二。

ofetch 的 `createFetch` 允許我們傳入一個自己的 `fetch` 實作，而 Nitro 傳入的 `localFetch` 會先判斷要發出的請求是否是內部請求（以 `/` 開頭的相對路徑），如果是內部請求就會使用 `fetchNodeRequestHandler` 這個函式與 `nodeHandler` 來處理後續的邏輯，反之則發使用 Native Fetch API 發出 HTTP 請求。

這也就是為什麼只有 Nuxt 全域的 `$fetch` 可以正確的處理 `/api/posts` 請求，而其他 HTTP 函式會出錯的原因。

## 結語

暸解了 Nitro 對全域 `$fetch` 的處理後再回頭看 Nuxt 的文件，原本被我忽略的一段話突然變得很有意義：

> During server-side rendering, calling `$fetch` to fetch your internal [API routes](https://nuxt.com/docs/guide/directory-structure/server) will directly call the relevant function (emulating the request), **saving an additional API call**.

使用全域 `$fetch`，對內部的 API 路由而言就像是呼叫了另外一個 function，它不會發起 HTTP 請求，省去了 HTTP 請求中的 DNS 查找、TCP 連線，也省去了處理 socket、header、解析 JSON 等等開銷。我想這也是為什麼 Nuxt 會建議使用 `$fetch` 的原因吧！

### 參考連結

- [Nuxt 3 - $fetch](https://nuxt.com/docs/api/utils/dollarfetch#passing-headers-and-cookies)
- [Fetch - Nitro](https://nitro.build/guide/fetch#in-server-fetch)
- [Nitro GitHub](https://github.com/nitrojs/nitro/blob/5736f5be463c1e59c8c4971512fc569c008cc403/src/runtime/internal/app.ts#L133-L150)