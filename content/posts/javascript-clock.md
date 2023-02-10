---
title: 新手 JS 地下城 - 2F 時鐘 Clock
tags: 
  - JavaScript
  - Vanilla JS
  - JS 地下城
created: 2019-06-02T16:07:16Z
image: /images/4yieHue.jpg
image_caption: 新手 JS 地下城 - 2F 時鐘 Clock
description: 這是由六角學院在 Udemy 推出的：JavaScript 題目篇 - 新手 JS 地下城，所出的題目。今天要來分享的是第二題：時鐘（Clock)
---

## 題目說明

* 需使用 JS 原生語法的 `getDate()` 撈取時間，不可用套件
* 需使用 JS 原生語法的 `setTimeout()` 或 `setInterval()`，持續讓秒針、分針、時針能夠以台北時區移動

## HTML / CSS / JavaScript

我給自己一點點小小的限制，一來是為了讓自己對 js 的使用更熟悉，一種是...自虐：

* 盡量挑戰使用 Vanilla JS
* 盡可能不用 ES6 的方法

### HTML 部分

```html
<div class="clockBody">
 <div class="clockFace">
  <div class="secHandler"></div>
  <div class="hrHandler"></div>
  <div class="minHandler"></div>
 </div>
</div>
```

### CSS 部分

```css
.secHandler, .minHandler, .minHandler {
 transform-origin: center 2px
}
```

CSS 的部分比較複雜 _（而且當時沒有模組化的觀念，後來改用 BEM 管理）_

想看完整樣式的捧油可以點下面的連結

* CSS 部分： [CSS 部分連結](https://github.com/Mini-ghost/JSunderground/blob/master/02/public/css/style.css)
* sass 部分：[sass 部分連結](https://github.com/Mini-ghost/JSunderground/blob/master/02/source/sass/style.sass)

簡單來說：內的 transform-origin 這個屬性可以設定元素變化（`transform`）的原點。預設的位置為元素的中心點也就是：`transform-origin: 50% 50%` 的位置。
上面 transform-origin 的第一個參數為 X 軸，第二個參數為 Y 軸，如果有第三個參數的話則是 Z 軸

MDN 上有更詳細的範例說明，連結也附在這裡：[transform-origin - CSS | MDN](https://developer.mozilla.org/zh-TW/docs/Web/CSS/transform-origin)

### JS 部分

以下分成四個部分：DOM 選取、產生刻度、產生數字，不然一次貼有點長啊！

**DOM 選取**

```js
var clockFace = document.querySelector('.clockFace');
var hrHandler = document.querySelector('.hrHandler');
var minHandler = document.querySelector('.minHandler');
var secHandler = document.querySelector('.secHandler');
```

**產生刻度**

```js
for (var i = 0; i < 60; i++){
  var timePoint = document.createElement('div');

  i % 5 === 0
    ? timePoint.classList.add('line') 
    : timePoint.classList.add('point');

  timePoint.style.transform = 'translate(-50%) rotate(' + i*6 + 'deg)';
  clockFace.appendChild(timePoint);
}
```

這裡的迴圈總共會產 60 個 div

`(i % 5 === 0)? timePoint.classList.add('line') : timePoint.classList.add('point')`
三元判斷式部分，如果 i ÷ 5 的餘數為 0 ，他的位置就是整點像是：0、5、10...，那這裡依照設計稿就會是一條縣，其他地方則會式一個點，我分別用了兩個不同 class 做區分。

`timePoint.style.transform = 'translate(-50%) rotate(' + i*6 + 'deg)'`
角度部分：360 ÷ 60 = 6 度。所以每一個 div 間隔 6 度（deg），至於要讓他對準時中的政中心旋轉的部分則寫在 CSS 裡面，例如： `transform-origin: center 130px`

_這個部份我沒有按照設計稿，設計稿的間隔怪怪的_

**產生數字**

```js
for (var i = 0; i < 12; i++) {
  var amNum = document.createElement('div');
  var amNumText = document.createElement('span');
  var pmNum= document.createElement('div');
  var pmNumText = document.createElement('span');

  amNum.classList.add('amNum');
  pmNum.classList.add('pmNum');

  (i === 0) ? amNumText.innerText = 12 : amNumText.innerText = i;
  (i === 0) ? pmNumText.innerText = 24 : pmNumText.innerText = i + 12;

  amNumText.style.transform = 'rotate(' + (-i * 30) + 'deg)'
  pmNumText.style.transform = 'rotate(' + (-i * 30) + 'deg)'

  amNum.appendChild(amNumText);
  pmNum.appendChild(pmNumText);

  amNum.style.transform = 'translate(-50%) rotate(' + i * 30 + 'deg)';
  pmNum.style.transform = 'translate(-50%) rotate(' + i * 30 + 'deg)';

  clockFace.appendChild(amNum);
  clockFace.appendChild(pmNum);
}
```

amNumText 的範圍為 1 ~ 12，pmNumText 的範圍為 13 ~ 24，延伸上面間隔的部分，每五格會出現一次數字，所以是 `translate(-50%) rotate(' + i*30 + 'deg)`，而 `rotate(' + (-i*30) + 'deg)` 的部分則是要把對著中心旋轉的數字在喬正。

```js
function showTime(){
  var timeData = new Date();
  var hr = timeData.getHours();
  var min = timeData.getMinutes();
  var sec = timeData.getSeconds();
  var secMillis = timeData.getMilliseconds();
  var secRotate = sec * 6 + secMillis * 0.006 + 180;
  var minRotate = min * 6 + sec * 0.1 + 180 ;
  var hrRotate = hr * 30 + min * 0.5 + 180;
  secHandler.setAttribute('style','transform: translateX(-50%) rotate(' + secRotate + 'deg)');
  minHandler.setAttribute('style','transform: translateX(-50%) rotate(' + minRotate + 'deg)');
  hrHandler.setAttribute('style','transform: translateX(-50%) rotate(' + hrRotate + 'deg)');
  window.requestAnimationFrame(showTime);
}
window.requestAnimationFrame(showTime);
```

`new Date()`
進到重點 JavaScript 了（灑花）。關於 `Date.prototype` 的 methods 下面僅說明這個題目會用到的，他有超多方法可以用，需要時可以去 MDN（[Date - JavaScript | MDN](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Date)） 查詢。

`Date.prototype.getHours()`<br />
回傳本地時間的小時（0 ~ 23）。

`Date.prototype.getMinutes()`<br />
回傳本地時間的分鐘數（0 ~ 59）。

`Date.prototype.getSeconds()`<br />
回傳本地時間的秒數（0 ~ 59)。

`Date.prototype.getMilliseconds()`<br />
回傳本地時間的毫秒數（0 ~ 999）。

有了上面的資料，接下來要進到數學的部分啦！算角度拉 ~

```js
var secRotate = sec*6 + secMillis*0.006 + 180;
var minRotate = min*6 + sec*0.1 + 180 ;
var hrRotate = hr*30 + min*0.5 + 180;
```

* **秒針**：每一小格 6 度，所以 **秒數 × 6 度** 得到到的就是秒針的角度，這邊加上了毫秒（0 ~ 999）× 0.006 是為了讓動畫看起來更順暢，這裡也可以不加，秒針看起來就是一格一格的跳，取決於想要什麼效果囉！
* **分針**：每一小格 6 度，**分 × 6 度** 即可得到分針的角度。但多數時鐘設計，分針跟時針都是緩緩移動，不是時間到瞬間彈到下一格，所以分針這邊要加上 **秒數 × 0.1** _（每 60 秒前進 6 度）_
* **時針**：每一大格 30 度，**時 × 30 度**，加上 **分 × 0.5** _（每 60 秒前進 30 度）_

上面如果不太能理解，帶數字進去算會比較有幫助喔~

接下來要動起來囉！！！~

這邊我使用了 `requestAnimationFrame()` 執行畫面的更新。_雖然題目指定要使用 setTimeout() 或 setInterval()_。
requestAnimationFrame() 可以想像是優化版本的 setTimeout()，他的更新頻率是對準螢幕更新平率的，在有，當螢幕更新一次畫面就會呼叫一次 `requestAnimationFrame()` 帶進去的 function。新方法總要看一下瀏覽器支援度。

 ![Can I use requestAnimationFrame](https://i.imgur.com/vlHEhlu.png "Can I use requestAnimationFrame"){ loading=lazy width=768 }
 Can I use requestAnimationFrame：[Can I use requestAnimationFrame](https://caniuse.com/#feat=requestanimationframe)

 基本上大多數瀏覽器都已經有很高的支援度，如果真的在意的話可以做下面的動作：

```js
;(function(){
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
  window.requestAnimationFrame = requestAnimationFrame;
})()
```

這樣就可以比較放心地使用囉！如果上面的方式都不支援最後還是可以用： `setTimeout(function, 16)`

我自己大多數的時候是 requestAnimationFrame() / setTimeout() 的愛用者，但要記得這兩這都知會呼叫一次 function，如果要定時呼叫的話要在自被呼叫的 function 立面再呼叫自己一次。

---

## 結語

以上就是針對 新手 JS 地下城 - 2F 時鐘 Clock 的分享。當時在寫這題時在角度計算部分小卡了一下，其實在前端工作經驗裡也常常需要進行簡單卻繁瑣的數學運算，這時就要讓自己頭腦保持清楚，最好是還是拿出紙根比稍微畫一下會比想破頭有幫助。希望這些內容能讓各位看官捧油有點收穫！有任何指教都歡迎在下方留言告訴我。

**額外推薦**

這題其實在 Wes Bos 的 [JavaScript30](https://javascript30.com/) 第二單元有教。JavaScript30 是一個完全免費 + 全英文字幕 的 JavaScript 教學課程。建議有點 JavaScript 基礎的可以去聽聽看。

如果想看更多關於 JavaScript 時鐘的製作，也推薦下面這支影片：

**[ Alex 宅幹嘛 ] 👨‍💻 深入淺出 Javascript30 快速導覽：Day 2：CSS + JS Clock**（[連結](http://www.youtube.com/watch?v=O1YsB3qxO4g)）
![深入淺出 Javascript30 快速導覽：Day 2：CSS + JS Clock](//img.youtube.com/vi/O1YsB3qxO4g/maxresdefault.jpg){ loading=lazy width=768 }

Alex 大大的頻道上有非常豐富的 JavaScript 學習資源，特別如果喜歡 Vue.js 的捧油絕對不能錯過啦！
