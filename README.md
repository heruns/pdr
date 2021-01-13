# prr —— 防止用户多次点击发送重复请求的工具

## demo 地址：[https://heruns.github.io/prr/demos/](https://heruns.github.io/prr/demos/)

## 功能

- 不依赖 axios，自动监听 ajax 请求的发送和响应，防止重复请求
- 提供 vue 指令，用于指定特定目标，及手动控制请求开始和结束的时机
- 提供请求开始和结束的钩子，可自定义请求目标样式，或搭配 element ui 等组件库/样式库使用
- 内置为请求元素添加 loading 的功能，提高交互体验

## 使用

### 方式 1：全局监听请求

这种方式只需直接在页面中加载 [prr.js](./prr.js) 即可，加载后会在 `window` 对象上挂载一个 `prr` 对象，可通过 `prr.setOptions` 修改默认参数

```js
prr.setOptions({
  loading: true, // 是否添加 loading
  selectors: ["button"], // 需要全局统一处理请求的选择器列表
  eventTypes: ["click"], // 需要全局统一处理请求的事件列表
  onRequest(target, options) {}, // 请求发起的钩子
  onResponse(target, options) {}, // 请求结束的钩子
});
```

### 方式 2：vue 指令指定请求元素和时机

首先通过 `Vue.use(prr)` 注册 `v-prr` 指令，注册后使用方式如下：

```html
<!-- 手动设置请求开始和结束时机，可用于处理多个请求的情况 -->
<button v-prr="loading" @click="request">按钮</button>

<!-- 手动指定目标，可用于 selectors 不匹配的情况，添加 loading 修饰符表示请求时为元素添加 loading -->
<div v-prr.loading @click="request" class="box">可点击区域</div>
```

### 方式 3：通过钩子函数自定义请求元素的样式，可搭配 element ui 等组件库使用

JS:

```js
prr.setOptions({
  loading: false,
  onRequest(target, options) {
    // 请求开始，添加 loading
    if (target.classList.contains("el-button")) {
      target.classList.add("is-loading");
      const loading = document.createElement("i");
      loading.className = "el-icon-loading";
      target.insertBefore(
        loading,
        target.children.length > 0 ? target.children[0] : null
      );
    }
  },
  onResponse(target, options) {
    // 请求结束，移除 loading
    if (target.classList.contains("el-button")) {
      target.classList.remove("is-loading");
      const loading = document.querySelector(".el-icon-loading");
      loading && target.removeChild(loading);
    }
  },
});
```

在模板中正常使用即可，请求时会自动为按钮加上 loading 样式

```html
<el-button type="primary" @click="request">click me</el-button>
```

## 原理

- 通过重写 `XMLHttpRequest.prototype.send` 方法和监听 xhr 对象的 `loadend` 事件实现请求监听
- 通过 `window.event` 对象获取触发请求的元素
- 通过给请求元素设置 `pointer-events:none`，防止用户多次点击导致的重复请求
- 设置不透明度时涉及到修改行内样式，即使是行内样式也要使用 `el.style.setProperty("opacity", opacity, "important")` 保证样式优先级是最高的，同时通过 `el.style.getPropertyPriority` 获取原样式的优先级，以便后面恢复

## 限制

- 当元素会触发连续请求时，比如点击按钮发起一个请求，请求完成后再通过拿到的数据去调另一个接口这种情况，目前只能通过 vue 指令来处理

## TODO

- [ ] 发布到 npm
- [ ] 支持内置 loading 自定义，支持配置图标和文字
