---
title: 用 Vue.js 做 15 Puzzle 拼圖小遊戲（上）
tags: 
  - Vue
  - 15-puzzle

created: 2020-05-01T23:50:57Z
image: /images/rbF4vD8.jpg
image_caption: 15 Puzzle 數字推盤遊戲
description: 前陣子在 Facebook 社團看到有網友用 Vanilla JS 做了一個 15 puzzle 的小遊戲，剛好假日非常有（ㄅㄧㄢ）空（ㄩㄢˊ），那就利用 Vue.js 來做做看囉！
---

那個！這個練習是在去年 9 月中左右做的，而這篇紀錄原始版是在去年 10 月 1 號寫的，以下正文開始。

## 15 Puzzle 作品連結

* Demo：**[數字推盤遊戲｜15 Puzzle - Vue.js](https://mini-ghost.github.io/15-Puzzle-Vue/)**
* GitHub 連結：**[15-Puzzle-Vue](https://github.com/Mini-ghost/15-Puzzle-Vue)**

**使用工具**

* Vue.js
* Vuex

## 第一步：思考資料的樣貌

首先，必須產生一組資料讓 Vue.js 可以在畫面上渲染出拼圖的樣子，並且這組資料要有下列三個元素：

1. **字面數字** - 紀錄畫面中拼圖顯示的值。
2. **數字對應陣列** - 利用上面樹子產生的 [x, y] 陣列。
3. **所在位置** - 現在拼圖所在位置  [x, y]。

以下是 **15 puzzle 物件的 Type**

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

最後當所有拼圖的`value` 跟 `position` 接相等，表示所有拼圖都找到正確的位置，闖關成功啦！

### `initMultiArrays` 數字轉座標陣列

首先我需要一個 `initMultiArrays` 幫每一個數字產出他對應的陣列：

```ts 數字轉座標
/** 產生二微陣列 [x, y]: 座標 */
const initMultiArrays = (num: number): [number, number] => {
  return [ num % 4, Math.floor(num / 4) ]
}
```

這個 function 最後會回傳一個座標陣列 [ x, y ]，例如：

```js
initMultiArrays(1) // return [1,0]
initMultiArrays(6) // return [1,0]
initMultiArrays(11) // return [2,1]
```

### `initPuzzle` 初始化拼圖資料

接下來就講到時要渲染在畫面上的陣列給產出來啦！

```ts
/**
 * 原始 15 + 1 筆 puzzle 資料
 * number: number
 * value: [x, y]
 * position: [x, y]
 */
const initPuzzle = (num: number): PuzzleData[] => {
  const sum = num * num
  const puzzle: PuzzleData[] = []
  for (let number: number = 1; number <= sum; number++) {
    const value = initMultiArrays(number - 1)
    puzzle.push({ number, value, position: [0, 0]})
  }
  return puzzle
}
```

提醒：`value = initMultiArrays(number - 1)` 這裡之所以要 -1 是因為我設定 number 是從 1 開始

另外提一點，`initPuzzle`之所以設計可以傳入數字，原本是設計考已透過 route 來設定等級的。但後來就有點...懶了...（笑）~~

這個部分會產生下面這個陣列：

```js
[
  { number: 0, value: [0, 0], position: [0, 0] },
  { number: 1, value: [1, 0], position: [0, 0] },
  { number: 2, value: [2, 0], position: [0, 0] },
  { number: 3, value: [3, 0], position: [0, 0] },
  { number: 4, value: [0, 1], position: [0, 0] },
  // ...（略）
]
```

## 第二步：Vuex 初始化資料

構想是這樣的，在 Vue Component 裡面 dispatch Vuex 的 Action 初始化資料，打亂資料並確定資料有解後，完成初始化，將資料存到 state 讓 Vue Component 讀取。

所以！Action 裡面長這樣

```ts
actions: {
  INIT_PUZZLE({ commit }) {
    /** 初始化 puzzle 資料 */
    const puzzle: PuzzleData[] = initPuzzle(4)
    let emptyIndex: number = 0
    let emptyArray: [number, number] = [0, 0]
    let resolvable: boolean = false

    while (!resolvable) {
      /** 打亂初始化的 puzzle 資料 */
      puzzle.sort(() => (Math.random() > 0.5 ? 1 : -1))
      resolvable = checkResolvable(puzzle)
    }

    /** 排組亂數後賦予定位 */
    puzzle.forEach((item, index) => {
      item.position = initMultiArrays(index)
    })

    /** 設定空格資料 */
    emptyIndex = puzzle.findIndex(item => item.number === 16)
    emptyArray = puzzle[emptyIndex].position
    puzzle.splice(emptyIndex, 1)

    /** mutations 資料 */
    commit('SAVE_PUZZLE', puzzle)
    commit('SET_EMPTY', emptyArray)
  }
}
```

一點一點說明

1. `puzzle`：存放初始化（未被打亂）的拼圖資料。
2. `emptyIndex`：存放空格的索引數
3. `emptyArray`：存索引數換算出來的位置陣列 [ x, y ]
4. `resolvable`：拼圖陣列是否有解的旗標，預設值為 `false`

接下來開始跑 while 迴圈，迴圈會不斷打亂拼圖資料，直到確認有解後才會跳出迴圈繼續往下走 <br />
流程大概就是：**「打亂」=>「驗證」=>「有解跳出 / 無解再打亂」**

當確認拼圖資料是有解的之後，就要一個一個將每一片拼圖的座標 __（position 一開始都是給 [0, 0]）__ 給寫進去。最後在將編號 16 的拼圖找出來刪掉，這個刪掉的 16 就是畫面中空格的位置拉！

mutations 資料的部分，除了將產好的拼圖資料存到 state 裡面，也因為之後在遊戲的時候會需要知道空格的位置，所以這裡也一併將空格陣列存進 state 裡面去。

## 第三步：比對資料是否有解答 `checkResolvable()`

要怎麼知道亂數產生的拼圖資料是否是有解的呢？根據網路資料表示必須滿足以下條件：

* 拼圖列數為奇數時，逆序列數和為偶數。
* 拼圖列數為偶數時，逆序列數和奇偶與空行奇偶和守恆。

就是例如說，拼圖是 3 × 3 那逆序列數的總和只要是偶數就好。但如果是 4 × 4 的話，逆序列數的合的奇偶要與空格所在行數的奇偶相反。

簡單說明逆序列：
1、2、3 的逆序列數為 0 ，因為 1 後面比自己小的數字數量為 0。2 後面也沒有比自己小的數字。3 就不用講了；如果是 3、1、2 逆序列數為 2。1 跟 2 後面都沒有比自己小的數字。3 後面有 2 個比自己小的數字，所以逆序列數總合為 2 。

試著實踐他吧！首先：我們需要一個：逆序列累加 function

### 逆序列累加 `countComputed()`

```ts
/** 逆序列累加 */
const countComputed = (ary: PuzzleData[]): number => {
  const length: number = ary.length
  let count: number = 0
  ary.forEach((item: PuzzleData, index: number, _ary: PuzzleData[]) => {
    let _index: number = index + 1

    while (_index < length) {
      // item.number 後面的數字只要有比我小的就加 1
      if (item.number > _ary[_index].number) count++
      _index++
    }

  })

  return count
}
```

`countComputed()` 接收打亂的拼圖資料陣列 `ary: PuzzleData[]` 最後會回傳逆序列數總和。

再看看看最ㄎㄅ的演算法本體：比對資料是否有解答。

### 比對資料是否有解答 `checkResolvable()`

```ts
/**
 * 檢查資料是否有解答
 * ary: puzzle 陣列,
 */
const checkResolvable = (ary: PuzzleData[]): boolean => {
  /** 16 的序號 */
  const space: number = ary.findIndex(item => item.number === 16)
  /** 16 的列（X軸位置） */
  const spaceX: number = initMultiArrays(space)[0] + 1

  /**
   * 切掉空格
   * splice 會動到原本的陣列，所以這裡解構出一個陣列來操作 
   */
  const newAry: PuzzleData[] = ((ary: PuzzleData[]) => {
    ary.splice(space, 1)
    return ary
  })([...ary])

  /** 逆序列數 */
  const count: number = countComputed(newAry)
  return count % 2 + spaceX % 2 !== 0
}
```

`const space = ary.findIndex(item => item.number === 16)`<br />
空格在陣列中的第幾個位置（index）

`const spaceX = initMultiArrays(space)[0] + 1`<br />
在這裡首先要找出空格所在的行（x 軸）_（+1是因為這裡的數字會從 0 開始）_ 。

再來要計算逆序列總和，但 **注意：這裡要先把空格給移除掉再做計算** <br />
我們一開始有拿到空格的 index，接下來使用 `Array.prototype.splice()` 切掉 ~

這裡有幾個點要提醒

1. `Array.prototype.splice()` 會改變原本的陣列，**回傳被切掉的陣列**。
2. `Array.prototype.splice()` **會改變原本的陣列**，回傳被切掉的陣列。這件事情讓我必須在這複製一個不同參考（記憶體位置）的陣列使用，不然每跑一圈切一個...真棒不用擔心無窮迴圈了（不是），總之這個很重要。

這一定要強調一下

**`Array.prototype.splice()` 會改變原本的陣列，回傳被切掉的陣列。** <br />
**`Array.prototype.splice()` 會改變原本的陣列，回傳被切掉的陣列。** <br />
**`Array.prototype.splice()` 會改變原本的陣列，回傳被切掉的陣列。** <br />

_~~TDM 被雷到~~（自己觀念不紮實怪誰）_

最後將「逆序列數組合取除以 2 的餘數」 + 「空格行數除以 2 的餘數」 如果等於 1 就表示其中一個為奇數，另外一個為偶數。而這也表示該拼圖資料有解可以給使用者玩。

其實做到這裏基本上的邏輯都已經完成了！剩下來的就是讓 Vue 去讀取 Vuex 裡面的資料，渲染到畫面上就好囉！

### 完整的 vuex 內容

```ts
import Vue from 'vue';
import Vuex from 'vuex';

import { PuzzleData } from './siteFuture'

Vue.use(Vuex);

/** 產生二微陣列 [x, y]: 座標 */
const initMultiArrays = (num: number): [number, number] => {
  return [ num % 4, Math.floor(num / 4) ]
}

/**
 * 原始 15 + 1 筆 puzzle 資料
 * number: number
 * value: [x, y]
 * position: [x, y]
 */
const initPuzzle = (num: number): PuzzleData[] => {
  const sum = num * num
  const puzzle: PuzzleData[] = []
  for (let number: number = 1; number <= sum; number++) {
    const value = initMultiArrays(number - 1)
    puzzle.push({ number, value, position: [0, 0]})
  }
  return puzzle
}

/**
 * 檢查資料是否有解答
 * ary: puzzle 陣列,
 */
const checkResolvable = (ary: PuzzleData[]): boolean => {
  /** 16 的序號 */
  const space: number = ary.findIndex(item => item.number === 16)
  /** 16 的列（X軸位置） */
  const spaceX: number = initMultiArrays(space)[0] + 1
  /**
   * 切掉空格，
   * splice 會動到原本的陣列，所以這裡解構出一個陣列來操作 
   */
  const newAry: PuzzleData[] = ((ary: PuzzleData[]) => {
    ary.splice(space, 1)
    return ary
  })([...ary])
  /** 逆序列數 */
  const count: number = countComputed(newAry)
  return count % 2 + spaceX % 2 !== 0
}

/** 逆序列累加 */
const countComputed = (ary: PuzzleData[]): number => {
  let count: number = 0
  const length: number = ary.length
  ary.forEach((item: PuzzleData, index: number, _ary: PuzzleData[]) => {
    let _index: number = index + 1
    while (_index < length) {
      // item.number 後面的數字只要有比我小的就加 1
      if (item.number > _ary[_index].number) count++
      _index++
    }
  })
  return count
}

export default new Vuex.Store({
  state: {
    puzzle: [],
    moves: 0,
    empty: [0, 0],
    complete: false,
    play: false
  },
  getters: {
    complete: state => {
      const puzzle = state.puzzle as PuzzleData[]
      return !!puzzle.length && puzzle.every(item => 
        item.value.join('') === item.position.join('')
      )
    }
  },
  mutations: {
    /** 改變滑塊定位 */
    SET_ITEM_POS(state, data) {
      const { position, index } = data
      const puzzle: PuzzleData = state.puzzle[index]
      puzzle.position = position
    },
    /** 初始化 Puzzle */
    SAVE_PUZZLE(state, data) {
      state.puzzle = data
    },
    /** 設定空格座標 */
    SET_EMPTY(state, id) {
      state.empty = id
    },
    /** 更新移動次數 */
    SET_MOVE(state, num) {
      state.moves = state.moves + num
    },
    /** 切換遊戲狀態 */
    SET_PLAY_TYPE(state, type) {
      state.play = type
    },
    RESET_MOVE(state, num) {
      state.moves = num
    }
  },
  actions: {
    INIT_PUZZLE({ commit }) {
      /** 初始化 puzzle 資料 */
      const puzzle: PuzzleData[] = initPuzzle(4)
      let emptyIndex: number = 0
      let emptyArray: [number, number] = [0, 0]
      let resolvable: boolean = false
      while (!resolvable) {
        /** 打亂初始化的 puzzle 資料 */
        puzzle.sort(() => (Math.random() > 0.5 ? 1 : -1))
        resolvable = checkResolvable(puzzle)
      }
      /** 排組亂數後賦予定位 */
      puzzle.forEach((item, index) => {
        item.position = initMultiArrays(index)
      })
      /** 設定空格資料 */
      emptyIndex = puzzle.findIndex(item => item.number === 16)
      emptyArray = puzzle[emptyIndex].position
      puzzle.splice(emptyIndex, 1)
      /** mutations 資料 */
      commit('SAVE_PUZZLE', puzzle)
      commit('SET_EMPTY', emptyArray)
    }
  }
});
```

## 結語

其實當時實作時是從畫面開始的，但一方面希望開始培養自己為來處理專案可以習慣從資料面著手，另一方面相對 Components 的製作 Vuex 這裡複雜許多，所以這篇也就從 Vuex 的部分開始分享哩！

如何找出有解的排序部分是看了網路 Youtuber 分享後才稍稍能理解並且補上的（原本是跑 200 次迴圈去推亂畫面），所以如果演算法部分看不懂的下面會放我看的影片，裡面有更詳細的說明可以參考！

接下來下篇的部分會分享 Components 的實作，以及闖關完成的判定，在請大家多多指教囉！

---
推薦參考影片：

**[ Alex 宅幹嘛 ] 👨‍💻 Vue.js 應用｜HTML+CSS+JS 兩百行拼圖小遊戲**（[連結](https://youtu.be/ed2wmMBfveo)）

![[ Alex 宅幹嘛 ] 👨‍💻 Vue.js 應用｜HTML+CSS+JS 兩百行拼圖小遊戲](//img.youtube.com/vi/ed2wmMBfveo/maxresdefault.jpg){ loading=lazy width=794 }
