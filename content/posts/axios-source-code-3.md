---
title: 深入淺出 axios（三）：axios 內部 Promise 導致請求延遲
tags: 
  - JavaScript
  - axios

created: 2021-10-30T13:16:18.101Z
image: https://og-image-mini-ghost.vercel.app/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA%20axios.png?fontSize=82
image_caption: axios 內部 Promise 導致請求延遲
excerpt: axios 在 GitHub 上有超過 88.9k 的星星，擁有非常大量的使用社群，也有無數的開源貢獻者，但 axios 就因此無懈可擊了嗎？本篇將分享在今年年初一個筆者非常關注的的 PR 內容，而者個 PR 也被正式採納並發布在 axios v0.21.2 當中，就讓我們一起看下去吧！
---

## 前言

> 本篇的 axios 版本為 v0.21.2，但截至目前最新版本為 v0.24.0

閱讀本篇前建議可以先看過下面這兩篇
- [深入淺出 axios（一）：預設 axios 物件、Axios 類別、攔截器](../axios-source-code-1/)
- [深入淺出 axios（二）：XMLHttpRequest、CancelToken](../axios-source-code-2/)

在過去研究 axios 原始碼時翻閱了許多的 PRs 與 issues，經由這些紀錄當中的討論了解了 axios 一步一步演變、累積至今的原因與過程。

讀 issues 的過程中發現了一個令我相當感興趣的一個標題：**「Requests unexpectedly delayed due to an axios internal promise」**。大意就是本文作者發現他透過 axios 發出的請求總是會比使用原生的 XMLHttpRequest 還要晚被送出，平均會被延遲 200 - 300 毫秒。

這對於 SPA 網頁可能會有不小的影響。請求延遲送出可能導致畫面較晚被渲染出來，造成較差的使用者體驗。但到底發生了什麼事情呢？我們先來看看 axios 做了什麼。

## axios 做了什麼

我們來簡單回顧一下之前看過的 axios 的原始碼：

**XMLHttpRequset 請求的核心**

```javascript
// 以下內容簡略超多東西

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    var request = new XMLHttpRequest();

    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Listen for ready state
    request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) {
        return;
      }

      // 這裡會處理 resolve 或是 reject
      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Send the request
    request.send(requestData);
  });
};
```

**串連攔截器（Interceptors）並執行請求**

```javascript
// 以下內容簡略超多東西

Axios.prototype.request = function request(config) {
  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};
```

透過上面兩段我們可以知道，在過去的 axios 實作上有兩個地方會使用到非同步，其一是 `XMLHttpRequest`，另外一個是將攔截器（Interceptors）與核心請求串連起來的執行。

## 分析 axios 造成請求延遲的原因

為什麼透過 axios 發出請求會導致延遲呢？我們可以看到串連攔截器的部分，在[第一篇](../axios-source-code-1) 有提到，串連完攔截器的 axios 請求後如下：

```js
Promise.resolve(config)
  /**
   * 請求攔截器
   * 發出請求前一個一個執行
   */
  .then(requestFulfilled, requestRejected)
  /**
   * 發出請求
   */
  .then(dispatchRequest, undefined)
  /**
   * 回應攔截器
   * 接收到回應後一個一個執行 
   */
  .then(responseFulfilled, responseFulfilled)
```

我們試著把上面的程式碼再寫成以下，並放上了幾個 log 來輔助理解

```javascript
function axios () {
  return Promise.resolve("res")
	.then((res) => {
    // request 攔截器
		console.log("then 1")
		return res + " => then"
	})
	.then((res) => {
    // 發出請求
    console.log("then 2")
		return new Promise((resolve) => resolve(res + " => Promise"))
	})
	.then((res) => {
    // response 攔截器
    console.log("then 3")
		return res + " => then"
	});
}

axios()
console.log("run")
```

上面的程式碼毫無疑問最先被印出來的會是 `run`。接著才會是 `then 1`、`then 2` 等。這是因為傳入 `Promise.prototype.then()` 的 callback 會被丟掉工作佇列（Task Queue）中，JavaScript 會先把執行堆疊（Call Stack）全部執行完才把被丟到工作佇列（Task Queue）的程式抓出來執行。如果執行堆疊（Call Stack）阻塞，阻塞了 200 毫秒，那工作佇列（Task Queue）就會等到這 200 毫秒過了才有機會執行到。

所以找到原因了！**是 `Promise.prototype.then()` 導致請求的延遲**。

## 解決 axios 延遲請求的問題

在原本的設計下，每一個攔截器都可以做非同步的請求，並修改傳入的 `config` 再傳給下一個攔截器處理，最後交給 `dispatchRequest`，收到回應後再經由攔截器傳出響應。

其實我們並不頻繁在攔截器中呼叫並等待非同步，甚至大多數時候不會，因此在使用者沒有使用請求攔截器，或是請求攔截器執行的都是同步程式時，應該有更好的選擇，提出這個問題的開發者想到了下列方法解決：

首先調整了攔截器類型設計。

```javascript
/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
  });
  return this.handlers.length - 1;
};
```

對照一下原本新增攔截器要傳入的參數，多了一個可選的 `options` 物件， 其中當物件的屬性 `synchronous` 為 `true` 則攔截器被視為同步 function，若為 `false` 則以非同步處理，預設為 `false`。

預設為 `false` 是為了向下兼容，在現行數以千計、萬計的專案中，已有超多專案已經在使用預設為非同步處理的攔截器，如果這裡這裡的 `synchronous` 選用預設為 `true`，這樣這些現行專案一但進行升級就很容易發生意外。

有了上面的設定，在 `Axios.prototype.request()` 在執行攔截器串接時，就可以依照是否有需要執行非同步攔截器，下面是新的請求與響應攔截器的收集，我們只看請求攔截器的部分。

```javascript
Axios.prototype.request = function request(config) {
  // 略

  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // 先略
};
```

首先，我們一樣把請求攔截器抓出來一個一個確認，確認這些攔截器中是否有任何一個需要被當非同步處理。如果有的話，`synchronousRequestInterceptors` 就設定為 `false`，反之則為 `true`。確認完後我們就知道還需不需要處理非同步的請求攔截，也可以更好的挑選串連攔截器的策略。

- 非同步處理請求攔截器

  ```javascript
  Axios.prototype.request = function request(config) {
    // 全略

    var promise;

    if (!synchronousRequestInterceptors) {
      var chain = [dispatchRequest, undefined];

      Array.prototype.unshift.apply(chain, requestInterceptorChain);
      chain = chain.concat(responseInterceptorChain);

      promise = Promise.resolve(config);
      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    }
  };
  ```

- 同步執行請求攔截器

  ```javascript
  Axios.prototype.request = function request(config) {
    // 全略

    var promise;

    var newConfig = config;
    while (requestInterceptorChain.length) {
      var onFulfilled = requestInterceptorChain.shift();
      var onRejected = requestInterceptorChain.shift();
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected(error);
        break;
      }
    }

    try {
      promise = dispatchRequest(newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    while (responseInterceptorChain.length) {
      promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
    }

    return promise;
  };
  ```

如果要執行非同步，那才需要跟原本一樣使用 `Promise.prototype.then()` 將所有攔截器與請求串連起來，不然請求攔截器得部分則可以改為同步的方是處理。

在這樣處理的機制下，如果沒有使用攔截器，或是在使用攔截器時都告訴 axios 要使用同步處理，就不會在一開始就把請求丟到工作佇列（Task Queue）中，也不會被後面耗時的執行給卡住了。

## axios releases v0.21.2

弄清楚了 axios 如何解決過去因設計造成的延遲的問題，我們來看看新的攔截器的用法吧！一樣透過 TypeScript 定義來認識新的 API

```typescript
interface AxiosInterceptorOptions {
  runWhen?(config: AxiosRequestConfig): boolean;
  synchronous?: boolean;
}

export interface AxiosInterceptorManager<V> {
  use<T = V>(
    onFulfilled?: (value: V) => T | Promise<T>,
    onRejected?: (error: any) => any,
    options?: AxiosInterceptorOptions
  ): number;
}
```

在原本的 `axios.interceptors.request.use()` 除了原本的 `onFulfilled` 與 `onRejected` 外，多了第三個可選的參數 `options`。

第三個 `options` 除了本篇聚焦提到的 `synchronous` 外，還有一個可選的 `runWhen`。這個 `runWhen` 接收一個 `function` 用於過濾這個攔截器這次請求是否需要被收集起來執行。

實作的原始碼如下：

```javascript
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};
```


```javascript
Axios.prototype.request = function request(config) {
  // 略

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // 略
};
  ```

可以怎麼使用 `runWhen` 呢？例如：Refresh Token。

我們可以設計一個請求攔截器，負責使用 Refresh Token 刷新 Access Token，我們可能不會需要每次請求都刷新 Access Token，所以可以傳給 `runWhen` 一個確認是否需要刷新 Access Token 的 function，如果檢查這次請求需刷新，就回傳 `true`，反之則回傳 `false` 來讓這次請求略過這個攔截器。

## 結語

看完這篇，還不趕緊檢查手上專案是不是也遇到了請求被延遲的問題。如果有發現，只要升級 axios 的版本，就可以有效解決畫面被卡住的問題⋯真的是這樣嗎？在一開始提到的 issue 中說到，axios 發出的請求比直接使用 XMLHttpRequest 還慢 200-300 毫秒，而原因是因為執行堆疊（Call Stack）阻塞卡住了被放進工作佇列（Task Queue）的請求。現在解決的問題是避免請求被延遲，將請求提前至執行堆疊（Call Stack）被阻塞前執行，但執行堆疊阻塞問題只要不被排除，響應回來的資料依舊無法被處理，依舊得等執行堆疊被清空才有機會執行資料響應後的工作。因此如果真的發現有相關問題，筆者認為首要被解決的還是檢查是什麼因素造成執行堆疊執行了這麼長的時間，是什麼地方需要執行 200-300 毫秒。

總結這次的內容，我們把原本 axios 為什麼會造成延遲請求的原因找了出來，也看到了 v0.21.2 版怎麼解決這個問題。除此之外還 axios 也新增了略過攔截器的選項。這些改動都讓使用 axios 變得更加彈性、好用。

不過其實 axios 也還有不少值得改善、討論的空間，例如，`runWhen` 為什麼只做用在請求攔截器裡面？在 issue #4228 就有人問到了「Why runWhen is only supported in request interceptors options?」。而 `axios.interceptors.request.use()` 的第三個參數目前也還沒有 TypeScript 的型別支援（瀏覽了一下有至少 3 個 PR 試圖做這樣的貢獻）。

axios 活用了非同步與同步的處理，是個非常值得深入認識的好用工具，更多 axios 的動態也可以到 GitHub 上追蹤最新的討論喔！

### 參考資料

- [axios/axios tree v0.21.2](https://github.com/axios/axios/tree/v0.21.2)
- [axios/axios releases v0.21.2](https://github.com/axios/axios/releases/tag/v0.21.2)

- [Requests unexpectedly delayed due to an axios internal promise #2609](https://github.com/axios/axios/issues/2609)
- [issue#2609 | Sasha | predictable axios requests #2702](https://github.com/axios/axios/pull/2702)
- [Add AxiosInterceptorOptions to d.ts #3800](https://github.com/axios/axios/pull/3800)
- [Why runWhen is only supported in request interceptors options? #4228](https://github.com/axios/axios/issues/4228)