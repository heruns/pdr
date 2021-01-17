(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.pdr = factory());
}(this, (function () { 'use strict';

  // 全局参数
  const globalOptions = {
    loading: true, // 是否添加 loading
    loadingText: "", // 请求时的文字提示
    // opacity: 1, // 请求时设置的不透明度
    selectors: ["button"], // 需要全局统一处理请求的选择器列表
    eventTypes: ["click"], // 需要全局统一处理请求的事件列表
    onRequest(target, options) {}, // 请求发起的钩子
    onResponse(target, options) {}, // 请求结束的钩子
  };

  // dom 相关的数据存储
  const elementDataStore = {
    elements: [],
    set(el, key, data) {
      const index = this.getIndex(el);
      if (index > -1) {
        const obj = this.elements[index].data;
        obj[key] = data;
      } else {
        const obj = {
          el,
          data: {
            [key]: data,
          },
        };
        this.elements.push(obj);
      }
    },
    remove(el, key) {
      const index = this.getIndex(el);
      if (index === -1) return;
      if (!key) {
        this.elements.splice(index, 1);
      } else {
        const obj = this.elements[index].data;
        delete obj[key];
        const keysLength = Object.keys(obj).length;
        if (keysLength === 0) {
          this.elements.splice(index, 1);
        }
      }
    },
    getIndex(el, key) {
      const index = this.elements.findIndex((item) => item.el === el);
      if (!key) {
        return index;
      } else if (index > -1) {
        return this.getData(el, key) ? index : -1;
      }
      return -1;
    },
    getData(el, key) {
      const index = this.getIndex(el);
      if (index === -1) {
        return null;
      }
      const data = this.elements[index].data;
      return key ? data[key] : data;
    },
    has(el, key) {
      return this.getIndex(el, key) > -1;
    },
  };
  // 管理指令指定的dom
  const directiveElStore = {
    key: "directiveOptions",
    add(el, options) {
      elementDataStore.set(el, this.key, options);
      if (options.fetching) {
        const requestOptions = normalizeRequestOptions(el);
        onRequest(el, requestOptions);
      }
    },
    remove(el) {
      return elementDataStore.remove(el, this.key);
    },
    update(el, options) {
      if (!this.has(el)) return;
      const oldOptions = this.getOptions(el);
      // 对比新旧值，判断是请求开始还是请求结束
      if (oldOptions.fetching && !options.fetching) {
        onResponse(el, normalizeRequestOptions(el));
      } else if (!oldOptions.fetching && options.fetching) {
        onRequest(el, normalizeRequestOptions(el));
      }
      this.setOptions(el, options);
    },
    getIndex(el) {
      return elementDataStore.getIndex(el, this.key);
    },
    getOptions(el) {
      return elementDataStore.getData(el, this.key);
    },
    setOptions(el, options) {
      elementDataStore.set(el, this.key, options);
    },
    has(el) {
      return this.getIndex(el) > -1;
    },
  };
  // 转换指令的 binding 参数
  function normalizeDirectiveOptions(binding) {
    const options = {
      manual: false, // 是否手动
      fetching: false, // 是否在请求中，仅当 manual 为 true 时有效
    };
    if (typeof binding.value === "boolean") {
      options.fetching = binding.value;
      options.manual = true;
    } else if (typeof binding.value === "object") {
      const bindingValue = binding.value;
      const hasOwn = (prop) =>
        Object.prototype.hasOwnProperty.call(bindingValue, prop);
      if (hasOwn("fetching")) {
        options.fetching = bindingValue.fetching;
        options.manual = true;
      }
      if (hasOwn("loading")) {
        options.loading = Boolean(bindingValue.loading);
      }
      if (hasOwn("loadingText")) {
        options.loadingText = String(bindingValue.loadingText);
      }
      if (hasOwn("opacity")) {
        options.opacity = String(bindingValue.opacity);
      }
    }
    return options;
  }
  // vue 指令
  const directive = {
    inserted(el, binding) {
      directiveElStore.add(el, normalizeDirectiveOptions(binding));
    },
    update(el, binding) {
      directiveElStore.update(el, normalizeDirectiveOptions(binding));
    },
    unbind(el, binding) {
      directiveElStore.update(el, normalizeDirectiveOptions(binding));
      directiveElStore.remove(el);
    },
  };

  // 获取元素某个样式
  function getStyle(el, prop) {
    return document.defaultView.getComputedStyle(el)[prop];
  }
  // 管理 loading
  const loadingManager = {
    key: "loadingMask",
    createLoadingMask() {
      const mask = document.createElement("div");
      mask.className = "pdr-loading-mask";
      mask.innerHTML = `
      <div class="pdr-loading-spinner">
        <svg class="pdr-circular" viewBox="25 25 50 50">
          <circle class="pdr-path" cx="50" cy="50" r="20" fill="none"/>
        </svg>
      </div>
      `;
      return mask;
    },
    getMaskStyle(parent) {
      const rect = parent.getBoundingClientRect();
      const maskStyle = {};
      ["top", "left"].forEach((property) => {
        const scroll = property === "top" ? "scrollTop" : "scrollLeft";
        const margin = property === "top" ? "marginTop" : "marginLeft";
        maskStyle[property] =
          rect[property] +
          document.body[scroll] +
          document.documentElement[scroll] -
          parseInt(getStyle(document.body, margin), 10) +
          "px";
      });
      ["height", "width"].forEach((property) => {
        maskStyle[property] = rect[property] + "px";
      });
      return maskStyle;
    },
    setCircularSize(parent, mask) {
      const rect = parent.getBoundingClientRect();
      const { width, height } = rect;
      const minSize = Math.min(width, height);
      if (minSize < 42) {
        const circular = mask.querySelector(".pdr-circular");
        circular.style.width = minSize + "px";
        circular.style.height = minSize + "px";
      }
    },
    addLoading(el, loadingText) {
      const position = getStyle(el, "position");
      if (position !== "absolute" && position !== "fixed") {
        el.classList.add("pdr-loading-parent-relative");
      }
      const mask = this.createLoadingMask();
      const maskStyle = this.getMaskStyle(el);
      Object.keys(maskStyle).forEach((property) => {
        mask.style[property] = maskStyle[property];
      });
      this.setCircularSize(el, mask);
      el.appendChild(mask);
      if (loadingText) {
        const circular = mask.querySelector(".pdr-circular");
        // 如果空间不足就不显示文字
        if (mask.clientHeight - circular.clientHeight < 26) return;
        this.addLoadingText(mask, loadingText);
      }
      elementDataStore.set(el, this.key, mask);
    },
    addLoadingText(mask, loadingText) {
      const text = document.createElement("div");
      text.className = "pdr-loading-text";
      text.textContent = loadingText;
      mask.querySelector(".pdr-loading-spinner").appendChild(text);
    },
    removeLoading(el) {
      el.classList.remove("pdr-loading-parent-relative");
      const mask = elementDataStore.getData(el, this.key);
      if (mask) {
        el.removeChild(mask);
        elementDataStore.remove(el, this.key);
      }
    },
  };
  // 管理不透明度
  const opacityManager = {
    key: "originalOpacity",
    setOpacity(el, opacity) {
      // 将原来内联样式中的 opacity 属性值和优先级存起来
      const inlineOpacity = el.style.opacity;
      if (inlineOpacity) {
        const originalOpacity = {
          value: inlineOpacity,
          priority: el.style.getPropertyPriority("opacity"),
        };
        elementDataStore.set(el, this.key, originalOpacity);
      }
      el.style.setProperty("opacity", opacity, "important");
    },
    restoreOpacity(el) {
      el.style.removeProperty("opacity");
      const originalOpacity = elementDataStore.getData(el, this.key);
      elementDataStore.remove(el, this.key);
      // 恢复原来内联样式中的 opacity 属性值和优先级
      if (originalOpacity) {
        el.style.setProperty(
          "opacity",
          originalOpacity.value,
          originalOpacity.priority
        );
      }
    },
  };
  // 获取元素 data-pdr-* 属性中的值
  function getDataOptions(el) {
    const options = {};
    const dataset = el.dataset;
    if (dataset.pdrOpacity) {
      options.opacity = Number(dataset.pdrOpacity);
    }
    if (dataset.pdrLoading) {
      options.loading = dataset.pdrLoading === "true";
    }
    if (dataset.pdrLoadingText) {
      options.loadingText = dataset.pdrLoadingText;
    }
    return options;
  }
  // 转换 onRequest 的参数
  function normalizeRequestOptions(el, options) {
    const defaults = {
      loading: globalOptions.loading,
      loadingText: globalOptions.loadingText,
      opacity: globalOptions.opacity,
      type: "manual",
      xhr: null,
    };
    const requestOptions = Object.assign(defaults, options);
    if (directiveElStore.has(el)) {
      const directiveOptions = directiveElStore.getOptions(el);
      Object.assign(requestOptions, directiveOptions);
    } else {
      const dataOptions = getDataOptions(el);
      Object.assign(requestOptions, dataOptions);
    }
    return requestOptions;
  }
  // 发起请求时的回调函数
  function onRequest(target, options) {
    target.classList.add("pdr-no-pointer-events");
    target.classList.add("pdr-fetching");
    if (options.loading) {
      loadingManager.addLoading(target, options.loadingText);
    }
    if (options.opacity) {
      opacityManager.setOpacity(target, options.opacity);
    }
    globalOptions.onRequest.call(null, target, options);
  }
  // 请求结束时的回调函数
  function onResponse(target, options) {
    target.classList.remove("pdr-no-pointer-events");
    target.classList.remove("pdr-fetching");
    loadingManager.removeLoading(target);
    opacityManager.restoreOpacity(target);
    globalOptions.onResponse.call(null, target, options);
  }
  // 手动调用方法，表示元素开始请求
  function start(el, options) {
    onRequest(el, normalizeRequestOptions(el, options));
  }
  // 手动调用方法，表示元素请求完成
  function stop(el, options) {
    onResponse(el, options);
  }

  // 获取发起请求的dom
  function getTarget(target) {
    if (!target) return null;
    const isMatchedSelector = (selector) => target.matches(selector);
    const isMatched =
      globalOptions.selectors.some(isMatchedSelector) ||
      directiveElStore.has(target);
    if (isMatched) {
      return target;
    } else {
      return getTarget(target.parentElement);
    }
  }
  // 重写 XMLHttpRequest.prototype.send 方法以获取点击目标
  function resetXMLHttpRequest() {
    const xhrSend = XMLHttpRequest.prototype.send;
    if (xhrSend._isReset) return;
    XMLHttpRequest.prototype.send = function (...args) {
      if (
        !window.event ||
        globalOptions.eventTypes.indexOf(window.event.type) === -1
      ) {
        return xhrSend.apply(this, args);
      }
      const target = getTarget(window.event.target);
      const isDirectiveManualEl = () => {
        return (
          directiveElStore.has(target) &&
          directiveElStore.getOptions(target).manual
        );
      };
      // 当不存在目标或目标由指令指定且是手动设置 fetching 值时不做处理
      if (!target || isDirectiveManualEl()) {
        return xhrSend.apply(this, args);
      }
      const type = window.event.type;
      const options = normalizeRequestOptions(target, {
        type,
        xhr: this,
      });
      onRequest(target, options);
      this.addEventListener("loadend", function (event) {
        onResponse(target, options);
      });
      return xhrSend.apply(this, args);
    };
    XMLHttpRequest.prototype.send._isReset = true;
  }

  // 添加相关样式
  function addStyle() {
    const primaryColor = "#11A560";
    const STYLE_TEXT = `
      .pdr-no-pointer-events {
        pointer-events: none !important;
      }
      .pdr-loading-parent-relative {
        position: relative !important;
      }
      .pdr-loading-mask {
        position: absolute;
        z-index: 2000;
        background-color: rgba(255, 255, 255, .9);
        margin: 0;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transition: opacity 0.3s;
      }
      .pdr-loading-spinner {
        top: 50%;
        transform: translateY(-50%);
        width: 100%;
        text-align: center;
        position: absolute;
      }
      .pdr-circular {
        height: 42px;
        width: 42px;
        animation: pdr-loading-rotate 2s linear infinite;
      }
      .pdr-path {
        animation: pdr-loading-dash 1.5s ease-in-out infinite;
        stroke-dasharray: 90, 150;
        stroke-dashoffset: 0;
        stroke-width: 2;
        stroke: ${primaryColor};
        stroke-linecap: round;
      }
      .pdr-loading-text {
        color: ${primaryColor};
        margin: 3px 0;
        font-size: 14px;
      }
      @keyframes pdr-loading-rotate {
        100% {
          transform: rotate(360deg);
        }
      }
      @keyframes pdr-loading-dash {
        0% {
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -40px;
        }
        100% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -120px;
        }
      }
    `;
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(STYLE_TEXT));
    const head = document.getElementsByTagName("head")[0];
    head.appendChild(style);
  }

  // 暴露给外部使用的对象
  const preventDuplicatedRequest = {
    // 是否已通过 Vue.use 注册该工具
    _installed: false,
    // 设置参数
    setOptions(userOptions) {
      userOptions = userOptions || {};
      Object.assign(globalOptions, userOptions);
    },
    // 手动调用方法，表示元素开始请求
    start: start,
    // 手动调用方法，表示元素请求完成
    stop: stop,
    // 指令
    directive,
    // 通过 Vue.use 使用该工具时调用
    install(Vue) {
      if (this._installed) return;
      Vue.directive("pdr", directive);
      this._installed = true;
    },
  };
  // 初始化
  function init() {
    resetXMLHttpRequest();
    addStyle();
  }

  init();

  return preventDuplicatedRequest;

})));
