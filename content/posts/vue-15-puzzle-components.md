---
title: 用 Vue.js 做 15 Puzzle 拼圖小遊戲（下）
tags: 
  - Vue
  - Vue 範例
  - 15-puzzle
created: 2020-05-02T01:32:32.592Z
image: /images/15-puzzle-congratulations.jpg
image_caption: 15 Puzzle 數字推盤遊戲
description: 上一篇分享了用 Vue.js 做 15-puzzle 小遊戲的資料部分。接下來這一篇來分：我是怎麼規劃 components 與遊戲成功的判定方式。
---

上篇：[用 Vue.js 做 15 Puzzle 拼圖小遊戲（上）](/posts/vue-15-puzzle-vuex/)

那個！這個練習是在去年 9 月中左右做的，上篇紀錄是在去年 10 月 1 號寫的。距離上一篇其實好像過了整整 7 個月了阿！呵...以下正文開始。

## 15 Puzzle 作品連結

* Demo：**[數字推盤遊戲｜15 Puzzle - Vue.js](https://mini-ghost.github.io/15-Puzzle-Vue/)**
* GitHub 連結：**[15-Puzzle-Vue](https://github.com/Mini-ghost/15-Puzzle-Vue)**

**使用工具**

* Vue.js
* Vuex

## PuzzleItem.vue

PuzzleItem.vue 是拼圖的 Component，不囉嗦！直接把 template 跟 script 部分附上

對了！因為工作的關係使用了 vue class api，真的非常推薦使用歐！

* vue-property-decorator：[npm](https://www.npmjs.com/package/vue-property-decorator)

**template**

```html
<template>
  <transition 
    name="fade" 
    @after-enter="handleAfterEnter" 
    appear
  >
    <div 
      class="puzzle-group__item" 
      :style="styleObj" 
      @click="handleClick"
    >
      <div 
        class="puzzle-group__content"
      >
        {{ item.number }}
      </div>
    </div>
  </transition>
</template>
```

**Typescript**

```ts
import { Component, Prop, Vue } from 'vue-property-decorator';
import { PuzzleData } from './../siteFuture';

@Component
export default class PuzzleItem extends Vue {
  @Prop({ default: 0 }) private index!: number;
  @Prop({ default: 75 }) private itemWidth!: number;
  @Prop() private item!: PuzzleData;

  inited: boolean = false

  get complete(): boolean {
    return this.$store.getters.complete
  }

  get propItem(): PuzzleData {
    return this.item;
  }
  set propItem(data: PuzzleData) {
    const { index, $store } = this;
    const { position } = data
    $store.commit('SET_ITEM_POS', { position, index });
  }

  get styleObj(): object {
    const { itemWidth } = this
    const { position, number } = this.item;
    const left = position[0] * itemWidth + 'px';
    const top = (position[1] % 4) * itemWidth + 'px';
    const transitionDelay = number * 0.0667 + 's'
    return !this.inited 
      ? { top, left, transitionDelay }
      : { top, left }
  }

  /** 滑塊物件點擊 */
  private handleClick(): void {
    if(this.$store.state.complete) return

    const { propItem } = this;
    const position = this.$store.state.empty;
    const oldPosition = this.propItem.position;
    /** 差幾列 */
    const col = Math.abs(position[0] - oldPosition[0]);
    /** 差幾行 */
    const row = Math.abs(position[1] - oldPosition[1]);
    /** 判斷該物件是否相鄰 */
    const isNeighbor = col + row === 1;

    if (isNeighbor) {
      this.propItem = { ...propItem, position };
      this.$store.commit('SET_EMPTY', oldPosition);
      this.$store.commit('SET_MOVE', 1)
    }
  }

  /** 動畫結束後清除動畫延遲 */
  private handleAfterEnter(): void {
    this.inited = true
  }
}
```

### 拼圖 component 接收三個 peops

* `index` - 表示自己的順序
* `itemWidth` - 每一片拼圖在畫面上的寬度
* `item` - 自己的詳細資料 `PuzzleData`

這邊複習一下 `PuzzleData` 的內容

```ts
/** 15 puzzle 物件 */
type PuzzleData = {
  /** 字面數字 */
  number: number
  /** 數字對應陣列 */
  value: [number, number]
  /** 位置 */
  position: [number, number]
}
```

### computed 計算屬性的部分

* `complete` - 拼圖是否完成
* `propItem` - 其實就是 props 的 `item`，這邊利用 computed 裡面的 set 對 vuex 做資料修改
* `styleObj` - 每一片拼圖的 `style`，利用 `left` 跟 `top` 決定位置，這裡會依照 `PuzzleData['position']` 裡面的 [ x, y ] 跟 `itemWidth` 一起做計算

### methods 部分

`handleClick()`，當拼圖被點擊時，會去檢查子幾是否與空格相鄰，如果相鄰 _（該拼圖 x 軸、y 軸，與空格 x 軸、y 軸的差剛好為 1 時）_ 則兩組資料的 position 交換，並且將 move 計數器 +1

## App.vue

在 2020 的版本裡面，在判定拼圖完成的部分改成利用 Vuex getter 處理，不過因為判斷條件其實跟原本在 App.vue 裡面寫的是一模一樣的，這裡還是會分享 2019 年的版本，並簡單分享為什麼我覺得這樣更好。

以下是 2019 版本 Watch 的部分：

### Watch deep 觀測整包 PuzzleData

```ts
@Watch('puzzle', { deep: true })
puzzleDataChange(val: PuzzleData[]): void {
  /** 這裡很麻煩不能直接拿兩個陣列相比，要比每一個值 */
  const complete = val.every(
    (item: PuzzleData) => item.value.join('') === item.position.join(''));
  if( complete ) {
    this.complete = true
    /** 等動畫做完 */
    setTimeout(() => { this.play = false }, 1000)
  }
}
```

遊戲到最後，就要判斷是否完成啦！在 `PuzzleData` 裡面份別紀錄了 `position` 目前所在位置跟 `value`，如果陣列中每一項的 `position === value` 就表示遊戲完成了！！！（灑花 ~~

但問題就出在 `[0, 0] !== [0, 0]`（唉！？
其實是因為 `position: [0, 0]` 跟 `value: [0, 0]` 其實在參考（記憶體位置）上是不一樣的，所以這裡直接抓來比較他怎麼樣都不會相等啊！！！

在 Javascript 中，除了 `String`、`Number`、`Boolean` 是 call by value 之外，其他型別都是 call by reference，因此上面在比較的時候，字面上看起來一樣，實際上卻不會相等。因此在比較陣列時，特別將其組成字串，單純去比字串是否相等即可。

### 為什麼會說在 Vuex getter 裡面判斷比 Watch deep 更好？

我想除了個人喜好問題，在 Vue 官方文件當中也有提到 [文件](https://cn.vuejs.org/v2/guide/computed.html)

> Vue 提供了一种更通用的方式来观察和响应 Vue 实例上的数据变动：侦听属性。当你有一些数据需要随着其它数据变动而变动时，你很容易滥用 watch——特别是如果你之前使用过 AngularJS。然而，通常更好的做法是使用计算属性而不是命令式的 watch 回调。

而在 Watch 的部分有提到

> 虽然计算属性在大多数情况下更合适，但有时也需要一个自定义的侦听器。这就是为什么 Vue 通过 watch 选项提供了一个更通用的方法，来响应数据的变化。当需要在数据变化时执行异步或开销较大的操作时，这个方式是最有用的。

所以原則上，除非是需要非同步操作，像是隨資料改變發送 request，能盡量不用 Watch 就不用。另外一點則是，當 Watch 設定了 deep 那它其實是深層的去遍歷你的資料，這在觀察整個物件的變化就會蠻有用的，但卻也隱含了一些不必要的效能浪費。

綜合以上幾點，最後選擇了在 Vuex 中使用 getter，其實 getter 就像是被禁用 set 的 computed 就是了！

## 結語

css 的部分跟比較細的 UI 設計就沒有著墨太多了，整個遊戲花費最多精力的地方還是落在資料處理的部分。在上篇產生資料，判斷有無解，到最後判斷是否完成遊戲，一直不斷的再回圈，不斷的在處理陣列的問題。當時也有些觀念不那麼紮實的部分導致花了蠻多時間再反覆檢查的，當然自己做完收穫是非常多的。寫這段結語的時間點已經是製作這個 15 puzzle 的將近 8 個月後了，時至今日回頭看還是有一些新的想法，是個很棒的題目呢！

這個小遊戲還有蠻多可以擴充的地方，例如：利用鍵盤控制 ~~（滑鼠點的很煩）~~ 或是利用 router 控制難易度...不過這些有機會再慢慢加上去拔！

最後，希望這些內容能讓各位看官捧油有點收穫！有任何指教都歡迎在下方留言告訴我囉！

---
推薦參考影片：

**[ Alex 宅幹嘛 ] 👨‍💻 Vue.js 應用｜HTML+CSS+JS 兩百行拼圖小遊戲**（[連結](https://youtu.be/ed2wmMBfveo)）

![[ Alex 宅幹嘛 ] 👨‍💻 Vue.js 應用｜HTML+CSS+JS 兩百行拼圖小遊戲](//img.youtube.com/vi/ed2wmMBfveo/maxresdefault.jpg){ loading=lazy width=768 }
