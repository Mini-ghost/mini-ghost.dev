---
title: 新手 JS 地下城 - 1F 九九乘法表 Multiplication Chart
tags: 
  - JavaScript
  - Vanilla JS
  - JS 地下城
created: 2019-05-28 22:32:58
image: /images/5GtdHXF.jpg
image_caption: 新手 JS 地下城 - 1F 九九乘法表 Multiplication Chart
description: 這是由六角學院在 Udemy 推出的：JavaScript 題目篇 - 新手 JS 地下城，所出的題目。裡面有各種有趣的題型可以練習，如果是剛接觸前端的捧油們可以在這裡面找一些題目來練練手。也可以在練習過後爬爬其他人所分享的製作方法，多方比較過後一定會有所成長的！ 

---

## 題目說明

* 【特定技術】需使用 JS for 迴圈技巧，裡頭數字不能直接寫在 HTML 上，需使用 JS 印出。
* 需使用 HTML、CSS、JS 技術
* 介面需與設計稿一致

## HTML / JavaScript

我給自己一點點小小的限制，一來是為了讓自己對 js 的使用更熟悉，一種是...自虐：

* 盡量挑戰使用 Vanilla JS
* 盡可能不用 ES6 的方法

### HTML 部分

```html
<main class="multiplyBox">
 <section class="multiplyTitle">
  <div class="hr"></div>
  <h1>
   <div class="title">九九乘法表</div>
   <div class="subTitle">MULTIPLICATION CHART</div>
  </h1>
  <div class="hr"></div>
 </section>
 <section class="multiplyItem" data-num="2" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="3" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="4" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="5" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="6" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="7" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="8" data-star="1" data-end="9"></section>
 <section class="multiplyItem" data-num="9" data-star="1" data-end="9"></section>
</main>
```

### JS 部分

```js
(function () {
 'use strict';
 var item = Array.apply(null, document.getElementsByClassName('multiplyItem'));
 for (var i = 0, l = item.length; i < l; i++){
  var obj = item[i],
   title = document.createElement('h2'),
   itemBox = document.createElement('div'),
   multiplicand = obj.dataset.num,
   numStar = obj.dataset.star,
   numEnd = obj.dataset.end;
  
  itemBox.classList.add('itemBox');
  title.innerText = multiplicand;
  itemBox.appendChild(title);

  for (; numStar <= numEnd; numStar++){
   var listItem = document.createElement('div');
   listItem.classList.add('listItem');
   listItem.innerText = multiplicand + '×' + numStar + '=' + multiplicand*numStar;
   itemBox.appendChild(listItem);
  }

  obj.appendChild(itemBox);
 };
})()

```

這邊大概兩件事提出來分享

**for 迴圈**

```js
for (; numStar <= numEnd; numStar++){
 /* code */
}
```

for 迴圈很多教學都會這樣寫：`for (var i = 0 ; i < j; i++)`，但後來更傾向這樣理解：`for ([初始表達式]; [條件式]; [遞增表達式])`。

* 初始表達式
    迴圈的初始化，可省略，通常會在這裡宣告變數，但因為該範例在一開始就設定好變數，所以就不再另外 var 一個變數了。
* 條件式
    判斷裡面的條件為 true 才執行，直到為 false 結束。如果不設定則默認為 true
* 遞增表達式
    每執行一圈迴圈，就執行一次。

**陣列(array)與類陣列(array-like)**

```js
document.getElementsByClassName('multiplyItem')
```

`document.getElementsByClassName('multiplyItem')` 所取得的資料行別為 **HTMLCollection** 雖然跟陣列 (Array) 很像，但並沒有支援像是 forEach 等功能，所以在處裡上會用 `Array.apply(null, document.getElementsByClassName('multiplyItem'))` 的方式將其轉換為陣列在進行操作。

類似的問題也出現在 `document.querySelectorAll` 裡面，他取出來為 **NodeList**，一樣有部分陣列的功能不支援，雖然 NodeList 在 Chrome 上支援 forEach，但在 ie11 中 NodeList 的原型鍊中就沒有該功能，使用上要留意一下。

---

## 結語

css 部分就沒有特別放上來，可以到 github 上參考，連結我就放在這裡囉：
[https://mini-ghost.github.io/JSunderground/01/public/](https://mini-ghost.github.io/JSunderground/01/public/)

以上就是針對 新手 JS 地下城 - 1F 九九乘法表 Multiplication Chart 的分享。有興趣的可以到 Udemy 找來看看，會有蠻多收穫的。

九九乘法表 Multiplication Chart 這個題目作為一系列新手題目的熱身再適合不過了。所謂迴圈寫得好，程式沒煩惱！掌握迴圈的應用基本上就掌握了一半以上的程式基礎了。所以上面的 JavaScript Code 就讓各位捧油們當作參考囉！有任何指教都歡迎在下方留言告訴我。
