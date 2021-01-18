# pdr —— 防止用户多次点击发送重复请求的工具

# pdr - a tool for preventing duplicated requests by user click

## demo：[https://heruns.github.io/pdr/demos/](https://heruns.github.io/pdr/demos/)

## 功能

- 不依赖 axios，自动监听 ajax 请求的发送和响应，防止重复请求
- 提供请求开始和结束的钩子，可自定义请求目标样式，或搭配 element ui 等组件库/样式库使用
- 内置为请求元素添加 loading 或降低不透明度的功能，提高交互体验
- 提供 vue 指令，可以指定特定目标，及手动控制请求开始和结束的时机

## 安装

1. 通过 npm 安装

在项目根目录运行命令 `npm install pdrjs`，然后在页面中通过 `import pdr from 'pdrjs'` 引入即可

2. 通过 `script` 标签引用

下载文件 [https://github.com/heruns/pdr/blob/master/pdr.js](https://github.com/heruns/pdr/blob/master/pdr.js)，放到项目中，然后通过 `script` 标签引用即可，文件加载后会在 `window` 对象上挂载一个 `pdr` 对象

## 使用

### 方式 1：全局监听请求

通过 `pdr.setOptions` 修改默认参数，即可在用户操作触发请求时自动处理事件目标，将目标设为禁用状态，并且降低不透明度或显示 loading

```js
pdr.setOptions({
  loading: true, // 是否添加 loading，默认为 true
  loadingText: "", // 请求时的文字提示，默认为 ""
  // opacity: 1, // 设置元素请求时的不透明度，0-1，默认不设置
  selectors: ["button"], // 需要全局统一处理请求的选择器列表，默认只处理按钮元素
  eventTypes: ["click"], // 需要全局统一处理请求的事件列表，默认只处理点击事件
  onRequest(target, options) {}, // 请求发起的钩子
  onResponse(target, options) {}, // 请求结束的钩子
});
```

### 方式 2：vue 指令指定请求元素和时机

首先通过 `Vue.use(pdr)` 注册 `v-pdr` 指令，注册后使用方式如下：

```html
<!-- 手动设置请求开始和结束时机，可用于处理多个请求的情况 -->
<button v-pdr="fetching" @click="request">按钮</button>

<!-- 手动指定目标，可用于 selectors 不匹配的情况 -->
<div v-pdr="{'loading': true, 'loadingText': '正在下载...'}" @click="download">
  <div class="content">点击下载文件</div>
</div>
```

### 方式 3：通过钩子函数自定义请求元素的样式，可搭配 element ui 等组件库使用

JS:

```js
pdr.setOptions({
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

- 当元素会触发连续请求时，比如点击按钮发起一个请求，请求完成后再通过拿到的数据去调另一个接口这种情况，可以通过 `pdr.start` + `pdr.stop` 方法或通过 vue 指令来处理

## TODO

- [ ] 完善 API 文档
- [x] 发布到 npm
- [ ] 单元测试
- [ ] 支持配置 loading 图标和颜色
