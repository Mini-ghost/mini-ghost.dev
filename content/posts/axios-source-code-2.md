---
title: 深入淺出 axios（二）：XMLHttpRequest、CancelToken
tags: 
  - JavaScript
  - axios
  - XMLHttpRequest

created: 2021-02-26T00:06:44.109Z
image: https://og-image-mini-ghost.vercel.app/%E6%B7%B1%E5%85%A5%E6%B7%BA%E5%87%BA%20axios.png?fontSize=82
image_caption: 深入淺出 axios - XMLHttpRequest
excerpt: axios 是一個 Promise based 的 Http 請求工具，他可以運行在瀏覽器環境與 Node.js 中。相信在 AJAX 技術被廣泛應用的今日，稍微有一點經驗的捧油門對他一定都不陌生。上篇對 axios 的核心程式設計做了剖析，這篇要來從 axios 的適配器（adapter，介面）的設計認識 XMLHttpRequest 物件，並且了解 axios 取消請求的設計。那就就讓我們一起看下去吧！
---

## 前言

> 本篇的 axios 版本為 0.21.0

這是一個系列的分享，預計會有兩篇，本文是該系列的第二篇。

上一篇我們了解了預設導入的 axios 其實是一個 function，並且利用了在 JavaScript 中 function 的本質也是一個物件的特性，在該 function 上掛上了各種方法提供使用者操作；另外也了解了核心的 `Axios` 類別設計與負責攔截器（Interceptor）管理的 `InterceptorManager` 類別設計。

這一篇我們要看的是 axios 如何應用 `XMLHttpRequest`，以及當我們取消了一個請求 axios 做了什麼操作。

在本文當中會提到以下這些內容：

- 從 axios 的角度認識 `XMLHttpRequest`。
- axios 取消請求的 CancelToken 類別設計。

axios 可應用在「瀏覽器環境」與「Node.js」環境中。在瀏覽器環境下使用了 `XMLHttpRequest` 而在 Node.js 環境則使用了 `http` 模組。由於目前工作上的使用經驗還是以瀏覽器端為主，因此本系列暫時也只會針對瀏覽器端的功能做研究，分享。

## 從 axios 的角度認識 `XMLHttpRequest`

axios 如果是在瀏覽器環境運行，HTTP 請求部分會使用 `XMLHttpRequest` 這個 Web API。一般情況我們其實比較少有機會直接操作 `XMLHttpRequest`，但只要牽涉到需要做 HTTP 請求，許多相關工具的底層還是會透過他來操作，除了本系列的 axios 外，像在 jQuery 中操作 AJAX 請求，其實底層也是使用了 `XMLHttpRequest`。

下面會以段落的方式瀏覽 axios 使用了那些 `XMLHttpRequest` 屬性與方法，做了哪些事情。不過在開始前我們需要先知道幾個會在段落中出現的變數名稱與意義

```js
module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    // 接下來都會在這裡面處理處理
  })
}
```

`resolve()` 與 `reject()`，就是建立 `Promise` 物件時傳入的 executor 會接到的兩個參數；`requestData` 就是我們發送 `PUT`、`POST` 之類的方法時帶的 `config.data`，`requestHeaders` 則是 `config.headers`。

### `XMLHttpRequest` 基本使用方式

先來了解一下 `XMLHttpRequest` 類型基本使用方式：

**GET**

```js
var request = new XMLHttpRequest();
request.open('GET', '/my/url', true);

request.onreadystatechange = function() {
  if (this.readyState === 4) {
    if (this.status >= 200 && this.status < 400) {
      // Success!
      var data = JSON.parse(this.responseText);
    } else {
      // Error :(
    }
  }
};

request.send();
request = null;
```

**POST**

```js
var request = new XMLHttpRequest();
request.open('POST', '/my/url', true);
request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
request.send(data);
```

這是從 [You might not need jQuery](http://youmightnotneedjquery.com/#json) 上擷取的範例。從範例可以得知基本用法，我們必須透過建構式來初始化一個 `XMLHttpRequest` 物件；透過 `open()` 初始化請求；最後透過 `send()` 送出請求。

如果是 POST 請求，則可以將要傳送的資料（body）作為 `send()` 的參數傳入。

另外如果是非同步請求，則可以設置事件處理器（EventHandler）：`onreadystatechange`。當 `readyState` 發生改變時調用指定的 function 確認狀態，取得回應的資料。

> **補充**

> 如果去看 You might not need jQuery 這個網站上的範例，可能會看見他不是使用 `onreadystatechange` 這個事件處理器，而是選用 `onload`，並且不需要特別確認 `readyState` 的值。如果要看到跟上述一樣的範例，需要將 「What's the oldest version of IE you need to support?」這個選項設定為 9 或是 8。

> 根據 MDN 以及 [Can I use...](https://caniuse.com/mdn-api_xmlhttprequesteventtarget_onload) 的資料都顯示，`onload` 事件處理器是在 IE 9 之後才支援的。

瞭解了基本使用方式，與在建立 `XMLHttpRequest` 物件後，就要準備來初始化請求了。

### 初始化請求

建立 `XMLHttpRequest` 物件後，需要透過 `XMLHttpRequest.prototype.open()` 初始化請求，其語法與型別定義如下：

**語法**：

```text
XMLHttpRequest.open(method, url[, async[, user[, password]]])
```

**型別**：

```ts
open(method: string, url: string): void;
open(method: string, url: string, async: boolean, username?: string | null, password?: string | null): void;
```

在 axios 中，會將 `config`（請求的設定與預設設定合併後）中的屬性解析出需要的參數：

```js
var fullPath = buildFullPath(config.baseURL, config.url);
request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);
```

這有個奇怪的點可以討論：HTTP Method 的大小寫

在這裡會將傳入的 `method` 轉為大寫後帶入，所以我們在使用 axios 時不論 `method` 給大小寫都是可以的，忽大忽小也可以（只是很奇怪而已）。

看到這裡其實我有很大的疑惑，在 `Axios.prototype.request()` 中，有特別將 `method` 全部轉為小寫，但在這裡卻又統一轉為大寫，這樣明顯多做了一次工！但逐一瀏覽 git 紀錄後發現在這兩個地方其實原本都是沒有轉換大小寫的，而是分別在後來的兩個 PR 中加上的

- [PR #30 - Delete fails in IE8/IE9, the verb needs to be capitalized.](https://github.com/axios/axios/pull/30)

  在 `open()` 方法中統一轉大寫是為了解決 `ActiveXObject` 在 IE8/IE9 環境必須使用大寫的問題。雖然 axios 早已沒有使用 `ActiveXObject` 物件，但這轉換依然留了下來。

  不過另外在 [whatwg - fetch 2.2.1. Methods](https://fetch.spec.whatwg.org/#methods) 中有提到：

  > To normalize a method, if it is a byte-case-insensitive match for `DELETE`, `GET`, `HEAD`, `OPTIONS`, `POST`, or `PUT`, byte-uppercase it.

  <p></p>

  > Using `patch` is highly likely to result in a `405 Method Not Allowed`. `PATCH` is much more likely to succeed.

  看起來 `DELETE`、`GET`、`HEAD`、`OPTIONS`、`POST`、或 `PUT` 使用大小寫都可以，但遇到到使用 patch 有極高的可能會發生錯誤，使用 PATCH 更有可能成功（我的經驗是 PATCH 一定要大寫）。

- [PR #912 與 #930 - Convert the method parameter to lowercase](https://github.com/axios/axios/pull/912)

  另外在 `Axios.prototype.request()` 將 `method` 全部轉為小寫則是說以下狀況會發生錯誤：

  ```js
  axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

  return axios({
    method: 'POST',
    url: url
  });
  ```

  這裡之前沒有特別提到，在 `Axios.prototype.request()` 中呼叫 `dispatchRequest` 這個方法到使用適配器發出請求前會將 `config.headers.common`、`config.headers[config.method] || {}`、`config.headers` 合併成一個新物件 賦值回 `config.headers` 中：

  ```js
  // dispatchRequest.js

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );
  ```

  依照前面的範例，在合併之前 `method` 如果沒有統一轉為小寫，在這裡就無法取得正確的值而造成錯誤。

### 設定超時（timeout）

在 `XMLHttpRequest` 中可以在每個請求中設定該請求的時間（毫秒）限制，設定 0 則表示沒有超時限制，如果在時間限制內沒有取得回應則拋出錯誤。

```js
// Set the request timeout in MS
request.timeout = config.timeout;
```

如果因為請求超時拋出錯誤，可以監聽 `timeout` 事件，或設定 `ontimeout` 事件處理器對錯誤的後續做處理。

### 設定非同步資料響應處理

```js
// Listen for ready state
request.onreadystatechange = function handleLoad() {
  if (!request || request.readyState !== 4) {
    return;
  }

  // The request errored out and we didn't get a response, this will be
  // handled by onerror instead
  // With one exception: request that using file: protocol, most browsers
  // will return status as 0 even though it's a successful request
  if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
    return;
  }

  var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
  var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
  var response = {
    data: responseData,
    status: request.status,
    statusText: request.statusText,
    headers: responseHeaders,
    config: config,
    request: request
  };

  settle(resolve, reject, response);

  // Clean up request
  request = null;
};

// Add responseType to request if needed
if (config.responseType) {
  try {
    request.responseType = config.responseType;
  } catch (e) {
    if (config.responseType !== 'json') {
      throw e;
    }
  }
}
```

**確認是否完成，onreadystatechange** 與 **readyState**

因為 `onreadystatechange` 是每當 `readyState` 有更動時就會被呼叫，所以需需要了解 `readyState` 及其含義，如下：

| 值   | 狀態               | 說明                                                                                                     |
|:----:| ----------------- | ------------------------------------------------------------------------------------------------------- |
| 0    | UNSENT            | `XMLHttpRequest` 物件已經被初始化，但還沒有呼叫 `open()` 方法。                                               |
| 1    | OPENED            | `open()` 已經被呼叫，再次期間可使用 `setRequestHeader()` 設定 Request Header，並可呼叫 `send()` 方法來發送請求。  |
| 2    | HEADERS_RECEIVED  | `send()` 方法已被呼叫，並且已接收到 Response Header                                                          |
| 3    | LOADING           | 正在接收資料中。                                                                                           |
| 4    | DONE              | 請求操作完成。                                                                                             |  

由此可知，當由當請求結束後，`readyState` 的值為 `4`，在這之外的其他值都不是我們要的，可以直接跳出。

**產生資料**

確認「請求操作完成」後經過整理就幾乎會是我們平常接收到的資料。

由原始碼可以得知，如果我們沒有設定 `config.responseType`（預設為 `''`）或是 `config.responseType` 設定為 `'text'`，會取用 `XMLHttpRequest.prototype.responseText`，其餘都會使用 `XMLHttpRequest.prototype.response` 的值，這個值瀏覽器會依據我們設定的 `XMLHttpRequest.prototype.responseType` 幫我們轉換。

> 補充：
>
> 注意到 `XMLHttpRequest.prototype.responseText` 這個屬性，如果在初始化時設定 `responseType` 「不為」`''` 或是 `'text'` 的話，瀏覽器會丟出一個錯誤，像這樣：
>
> ```
> Uncaught DOMException: Failed to read the 'responseText' property from 'XMLHttpRequest': The value is only accessible if the > object's 'responseType' is '' or 'text' (was 'json').
> ```

最後在 `settle()` 中會再驗證 `response.status` 的值是否在 200 至 300 之間（預設）來決定要 resolve 承諾還是 reject。

### 設定錯誤處理

在目前的 axios 中，有對三種狀況做錯誤的後續處理，一個是前面提到的操時錯誤處理：`ontimeout`，其他分別是取消請求的 `onabort`以及網路發生錯誤的 `onerror`。

```js
request.onabort = function handleAbort() {
  if (!request) {
    return;
  }

  reject(createError('Request aborted', config, 'ECONNABORTED', request));

  request = null;
};

request.onerror = function handleError() {
  reject(createError('Network Error', config, null, request));

  request = null;
};

request.ontimeout = function handleTimeout() {
  var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
  if (config.timeoutErrorMessage) {
    timeoutErrorMessage = config.timeoutErrorMessage;
  }
  reject(createError(timeoutErrorMessage, config, 'ECONNABORTED', request));

  request = null;
};
```

在每個錯錯誤處理中都會 `reject` 該錯誤，並且帶入錯誤訊息。另外可以先注意到在這裡的 `onabort` 是有執行 `reject()` 的，後面會再提到。

最後這裡可以看到文件上沒有提到的：「超時錯誤訊息是可以自定義的」。（這就是深入閱讀原始碼的小確幸）

### 防止 XSRF（CSRF） 攻擊

在 axios 請求中有 3 個屬性在這裡會用到：

- **`withCredentials`**：布林值，設定 `XMLHttpRequest.prototype.withCredentials`。這個部分設定了，當為**跨域**請求，是否要夾帶憑證資料。如果跨域並設定為 `true`，那在 Server 的 Response Header 要加上 `Access-Control-Allow-Origin`，並且必須指定來源不得為 `*`。
- **`xsrfCookieName`**：如果 `withCredentials` 為 `true`，axios 會根據指定的 `xsrfCookieName` 去 cookie 中取得值，並帶入 Request Header 中
- **`xsrfHeaderName`**：如果 `xsrfCookieName` 在 cookie 中有取得值，則把該值設定到 `requestHeaders[config.xsrfHeaderName]` 中，送給後端驗證。

```js
// Add xsrf header
// This is only done if running in a standard browser environment.
// Specifically not if we're in a web worker, or react-native.
if (utils.isStandardBrowserEnv()) {
  var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName 
    ? cookies.read(config.xsrfCookieName) 
    : undefined;

  if (xsrfValue) {
    requestHeaders[config.xsrfHeaderName] = xsrfValue;
  }
}

if (!utils.isUndefined(config.withCredentials)) {
  request.withCredentials = !!config.withCredentials;
}
```

> 關於 XSRF 攻擊究竟是什麼，推薦閱讀由胡立（huli）寫的：[讓我們來談談 CSRF](https://blog.techbridge.cc/2017/02/25/csrf-introduction/)。

### 設定 HTTP Authorization

```js
if (config.auth) {
  var username = config.auth.username || '';
  var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
  requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
}
```

這部分在原始碼中其實是在初始化前，不過為了整體流暢性，我把它放在這裡。但這個部份有沒有需要使用需要跟後端討論，至於沒有設定 `config.auth`，就完全不會執行這一段囉！

### 設定 Request Header

在發起請求時我們可以在 `config.headers` 設定我們要傳送的 Request Headers，在這裡就會將我們希望傳送的屬性寫進請求的 Header 中。而如果要設定 `XMLHttpRequest` 的 Request Header 則需要使用 `XMLHttpRequest.prototype.setRequestHeader()` 方法。

**語法：**

```
XMLHttpRequest.setRequestHeader(header, value)
```

**型別：**

```ts
setRequestHeader(name: string, value: string): void;
```

這部分很單純只要把 `config.headers` 中的屬性與值透過這個方法設定到請求當中就好了，另外如果請求沒有帶 `data` 則會把 `Content-Type` 這個 Request Headers 刪除。

```js
// Add headers to the request
if ('setRequestHeader' in request) {
  utils.forEach(requestHeaders, function setRequestHeader(val, key) {
    if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
      // Remove Content-Type if data is undefined
      delete requestHeaders[key];
    } else {
      // Otherwise add header to the request
      request.setRequestHeader(key, val);
    }
  });
}

```

<!-- 為了畫面好看 -->
<br />

### 支援上傳與下載進度

如果是有檔案下載或上傳進度顯示需求，可以透過設定 `config.onDownloadProgress` 與 `config.onUploadProgress` 傳入自定義的事件監聽器來處理。

```js
// Handle progress if needed
if (typeof config.onDownloadProgress === 'function') {
  request.addEventListener('progress', config.onDownloadProgress);
}

// Not all browsers support upload events
if (typeof config.onUploadProgress === 'function' && request.upload) {
  request.upload.addEventListener('progress', config.onUploadProgress);
}
```

如果想知道要怎麼應用，這裡有一個範例可以參考：[axios 檔案下載進度範例](https://codepen.io/mini_ghost/pen/VwmyXRd)

### 取消請求

在 `XMLHttpRequest` 物件中，我們可以透過 `XMLHttpRequest.prototype.abort()` 來取消一個還在等待資料的請求。而 axios 則包裝成使用 `axios.CancelTokn` 這個類別來操作。關於這個類別在後面會來討論。

可能有人沒用過，我們要先知道在一種在 axios 取消請求的方式：

```js
const CancelToken = axios.CancelToken;
let cancel;

axios.get('/user/12345', {
  cancelToken: new CancelToken(function executor(c) {
    // An executor function receives a cancel function as a parameter
    cancel = c;
  })
});

// cancel the request
cancel();
```

在這個建構出來的 `CancelToken` 實例中有一個 `CancelToken.prototype.promise` 的 Promise 物件，在執行 `cancel()` 後會 `resolve`（CancelToken 實例內部的 `resolve`）這個承諾。

接著來看到在 axios 中針對取消請求後會做什麼！

```js
if (config.cancelToken) {
  // Handle cancellation
  config.cancelToken.promise.then(function onCanceled(cancel) {
    if (!request) {
      return;
    }

    request.abort();
    reject(cancel);
    // Clean up request
    request = null;
  });
}
```

在接到 `resolve` 取消請求後會執行 `XMLHttpRequest.prototype.abort()`，這裡就會觸發 `onabort` 事件處理器並接著執行 `reject()`。

還記得前面特別請大家記得 `onabort` 事件處理器中也會執行 `reject()` 嗎？

```js
request.onabort = function handleAbort() {
  if (!request) {
    return;
  }

  reject(createError('Request aborted', config, 'ECONNABORTED', request));

  request = null;
};
```

在執行 `XMLHttpRequest.prototype.abort()` 後，如果有設定 `onabort` 事件處理器，會先跑完事件處理器才往下走，也就是說 `request.abort()` 到 `reject(cancel)` 之間其實已經跑過一次 `reject(createError('Request aborted', config, 'ECONNABORTED', request))`，所以理論上 `reject(cancel);` 執行了也沒有任何效果，我們不能 `reject()` 兩次。

但可能是因為這兩段是不同人處理的，因此這裡出現了一點點小瑕疵吧！雖然有人提出過相關疑惑但目前仍然沒有回應。

### 送出請求

經過上面各種設定，終於走到最後要送出請求了，我們需要用 `XMLHttpRequest.prototype.open()` 來送出請求，他的定語法語與型別定義如下：

**語法：**

```
XMLHttpRequest.send(body)
```

**型別：**

```ts
send(body?: Document | BodyInit | null): void
```

所以我們只要將要傳送的資料（body）帶入就可以了，axios 的原始碼：

```js
if (!requestData) {
  requestData = null;
}

// Send the request
request.send(requestData);
```

不過又一個奇怪的是，為什麼如果當 `requestData` 為空時（可能為 `''`, `0`, `undefined` ...等）要特地將它設定為 `null` 呢？

追查後發現這是在 React Native 上 Android 平台的一個蟲子。我把修復該錯誤的 PR 附在這裡（[#PR 1487 - fix 'Network Error' in react native android](https://github.com/axios/axios/pull/1487)）。

### XMLHttpRequest 部分小結語

到這裡，我們已經看完了 axios 使用 `XMLHttpRequest` 的部分。但關於 `XMLHttpRequest` 還有超多細節可以深入著墨，這裡提到的真的只是冰山一角角，有興趣的可以繼續深入研究。

## axios 取消請求的 CancelToken 類別設計

取消請求我覺得是一個蠻有趣的功能，也是我入坑研究 axios 的起頭原因之一。這邊會先了解他的用法，接著了解 CancelToken 類別設計。

### 取消請求的用法

這個部分們先來看看官方文件取消請求的範例：

```js
const CancelToken = axios.CancelToken;
let cancel;

axios.get('/user/12345', {
  cancelToken: new CancelToken(function executor(c) {
    // An executor function receives a cancel function as a parameter
    cancel = c;
  })
});

// cancel the request
cancel();
```

或是

```js
const CancelToken = axios.CancelToken;
const source = CancelToken.source();

axios.get('/user/12345', {
  cancelToken: source.token
}).catch(function (thrown) {
  if (axios.isCancel(thrown)) {
    console.log('Request canceled', thrown.message);
  } else {
    // handle error
  }
});

axios.post('/user/12345', {
  name: 'new name'
}, {
  cancelToken: source.token
})

// cancel the request (the message parameter is optional)
source.cancel('Operation canceled by the user.');
```

整理一下用法：

- 使用 `new CancelToken()` 建立一個 `CancelToken` 實例，這個類別建構時接收一個 `executor` function，這個 function 會接到一個 `cancel`（範例中為 `c`） 的 funciotn，可以將其存起來，如果要取消請求則執行這個 function，並可以帶入取消的訊息。

- 使用 `CancelToken.source()` 回傳一個 `source` 物件，並把 `source.token` 屬性傳給 `config.cancelToken`，如果要取消請求則執行 `source.cancel()` 一樣可以帶入取消的訊息。

- 在 axios 上提供了一個 `isCancel` 的方法，給使用者確認這次的錯誤是不是由取消請求拋出的。

有了這些基礎資訊，就可以試著來實作看看囉！

### CancelToken 類別設計

收先我們需要一個 CancelToken 的類別，上面有一個`promise` 屬性，而建構 CancelToken 需要傳入一個 `executor` function 當參數傳入，而這個 function 則又會收到一個取消用的 function。所以程式碼的部分會像這樣：

```js
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  executor(resolvePromise);
}
```

`CancelToken.prototype.promise` 部分是一個 Promise 物件，我們需要先把他的 `resolve()` 存起來，傳給使用者。如果使用者要取消請求，就可以執行該 `resolve()`

**如果取消，則拋出錯誤**

接著我們需要一個方法，提供在幾個時機點檢查是否已經取消請求，如果取消了就拋出一個錯誤，而著個取消的時機點則是看 `CancelToken.prototype.reason` 是否已經被賦予取消的理由。

所以上面的 `CancelToken` 會這樣調整

```js
function CancelToken(executor) {
  // 略

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}
```

有了上面的調整，就可以來時作檢查機制 `CancelToken.prototype.throwIfRequested()`，在裡面我們只要判斷 `CancelToken.prototype.reason` 有沒有值就知道該請求有沒有被取消。

```js
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};
```

到這裡 CancelToken 類別還缺一個功能，前面提到我們也可以用 `CancelToken.source()` 取得一個 `source` 物件，並且將 `source.token` 傳給 `config.token` 以及要取消時就執行 `source.cancel`。

其實 `CancelToken.source` 這個靜態方法本質上還是建構了一個 CancelToken 實例，並將建立的實例與取消的 function 包成物件回傳。

```js
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,  // CancelToken 實例
    cancel: cancel // 取消的 function
  };
};
```

看完兩種方法的設計方式，在應用上可以自行選擇喜歡的用法，反正本質上是在做同一件事情。

### Cancel 類別與 `isCancel()`

在 CancelToken 類別中，我們呼叫了 `cancel()` 並傳入了一段取消的 `message`，而這個 `message` 會當作 Cancel 類別建構時的參數。

```js
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

module.exports = Cancel;
```

這邊可以看到 Cancel 類別上還有一個 `toString()` 的方法，這邊可以小小科普一個觀念：物件上或物件的原型鍊上如果有 `toString()` 這個方法，當該物件轉字串後就會是這個方法的回傳值。

例如：

```js
const obj1 = {
  key: 'value'
}

const obj2 = {
  toString() {
    return '這是一個字串'
  }
}

console.log(`${obj1}`)
console.log(`${obj2}`)
```

因為在轉字串的過程中，實際上就是呼叫了 `toString()` 這個方法，所以輸出分別會是：

```
[object Object]
這是一個字串
```

由此可知，當接到取消請求的錯誤，我們可以這樣使用 `console.log('Request canceled' + thrown.message)` 就可以將我們傳入的錯誤訊息接在 `Request canceled` 後面囉！

最後關於 `isCancel()` 的實作則是先在 Cancel 的實例上新增一個 `__CANCEL__` 的屬性。

```js
Cancel.prototype.__CANCEL__ = true;
```

這樣當呼叫 `isCancel()` 他只要確認傳入的物件 `__CANCEL__` 是否有值即可：

```js
module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};
```

整個取消請求的設計就差不多是這樣。

在一些教學中會提到使用取消請求的時機，像是當有重複的請求先取消上一次的請求再去發新的請求，以減少後端的負擔。但在跟後端工程師聊過這個問題後發現，就算前端有發出取消請求，但如果後端沒有實作這一段，你以為取消了？但其實後端還是處理了一個完整的請求，你以為取消了刪除的請求，後端其實還是執行了刪除。

## 結語

本篇中，我們花了很大的篇幅透過 axios 的原始碼認識了 `XMLHttpRequset` 這個類別，知道如何初始化請求、設定細節以及送出請求。具有比較疑惑的部分也從過去的 git 紀錄中，找到貢獻了者遇到的問題與解決方式。

最後我們快速地看過 axios 取消請求的設計，也提到任何物件在字串化的過程中其實都是呼叫了原型鍊的 `toString()` 方法，最後也分享了我對於取消請求的一些看法。

在 axios 的設計非常彈性，很多東西都是可以換成自己想要的的，例如你覺得 `XMLHttpRequest` 太老派了，想用又酷又炫的 `fetch`，就可以自己包好以 `fetch` 為基底的適配器設定在 `config.adapter` 上；希望不論狀態碼 400、500 都不要拋出錯誤，也可以自己寫驗證邏輯到 `config.validateStatus`，彈性真的非常大。這些內容都在原始碼的 `default.js` 中，有興趣可以去了解了解。

### 參考資料

- [axios/axios at v0.20.0](https://github.com/axios/axios/tree/v0.20.0)
- [XMLHttpRequest Standard](https://xhr.spec.whatwg.org/)
- [XMLHttpRequest - Web APIs | MDN](https://developer.mozilla.org/zh-TW/docs/Web/API/XMLHttpRequest)
- [讓我們來談談 CSRF](https://blog.techbridge.cc/2017/02/25/csrf-introduction/)
