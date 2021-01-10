(() => {
  // 全局参数
  const globalOptions = {
    loading: true, // 是否添加 loading
    selectors: ["button"], // 需要全局统一处理请求的选择器列表
    eventTypes: ["click"], // 需要全局统一处理请求的事件列表
    onRequest(target, options) {}, // 请求发起的钩子
    onResponse(target, options) {}, // 请求结束的钩子
  };

  // 管理指令指定的dom
  const directiveElStore = {
    elements: [],
    add(el, options) {
      this.elements.push({
        el,
        options,
      });
      if (options.requesting) {
        const requestOptions = normalizeRequestOptions(el);
        onRequest(el, requestOptions);
      }
    },
    remove(el) {
      const index = this.getIndex(el);
      if (index !== -1) {
        this.elements.splice(index, 1);
      }
    },
    update(el, options) {
      if (!this.has(el)) return;
      const oldOptions = this.getOptions(el);
      // 对比新旧值，判断是请求开始还是请求结束
      if (oldOptions.requesting && !options.requesting) {
        onResponse(el, normalizeRequestOptions(el));
      } else if (!oldOptions.requesting && options.requesting) {
        onRequest(el, normalizeRequestOptions(el));
      }
      this.setOptions(el, options);
    },
    getIndex(el) {
      return this.elements.findIndex((item) => item.el === el);
    },
    getOptions(el) {
      const index = this.getIndex(el);
      return index !== -1 ? this.elements[index].options : null;
    },
    setOptions(el, options) {
      const index = this.getIndex(el);
      if (index !== -1) {
        this.elements[index].options = options;
      }
    },
    has(el) {
      return this.getIndex(el) > -1;
    },
  };
  // 转换指令的 binding 参数
  function normalizeDirectiveOptions(binding) {
    const options = {
      manual: false, // 是否手动
      requesting: false, // 是否在请求中，仅当 manual 为 true 时有效
    };
    if (binding.modifiers.loading) {
      options.loading = true;
    }
    if (typeof binding.value === "boolean") {
      options.requesting = binding.value;
      options.manual = true;
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

  // 管理 loading
  const loadingManager = {
    createLoadingMask() {
      const mask = document.createElement("div");
      mask.className = "prr-loading-mask";
      mask.innerHTML = `
        <div class="prr-loading-spinner">
          <svg class="prr-circular" viewBox="25 25 50 50">
            <circle class="prr-path" cx="50" cy="50" r="20" fill="none"/>
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
        const circular = mask.querySelector(".prr-circular");
        circular.style.width = minSize + "px";
        circular.style.height = minSize + "px";
      }
    },
    addLoading(el) {
      const position = getStyle(el, "position");
      if (position !== "absolute" && position !== "fixed") {
        el.classList.add("prr-loading-parent-relative");
      }
      const mask = this.createLoadingMask();
      const maskStyle = this.getMaskStyle(el);
      Object.keys(maskStyle).forEach((property) => {
        mask.style[property] = maskStyle[property];
      });
      this.setCircularSize(el, mask);
      el.appendChild(mask);
      el._prrMask = mask;
    },
    removeLoading(el) {
      el.classList.remove("prr-loading-parent-relative");
      el._prrMask && el.removeChild(el._prrMask);
    },
  };
  // 转换 onRequest 的参数
  function normalizeRequestOptions(el, options) {
    const defaults = {
      loading: globalOptions.loading,
      type: "manual",
      xhr: null,
    };
    const requestOptions = Object.assign(defaults, options);
    if (directiveElStore.has(el)) {
      const directiveOptions = directiveElStore.getOptions(el);
      if (Object.prototype.hasOwnProperty.call(directiveOptions, "loading")) {
        requestOptions.loading = directiveOptions.loading;
      }
    }
    return requestOptions;
  }
  // 发起请求时的回调函数
  function onRequest(target, options) {
    // TODO: 自动设置透明度
    target.classList.add("prr-no-pointer-events");
    target.classList.add("prr-requesting");
    if (options.loading) {
      loadingManager.addLoading(target);
    }
    globalOptions.onRequest.call(null, target, options);
  }
  // 请求结束时的回调函数
  function onResponse(target, options) {
    target.classList.remove("prr-no-pointer-events");
    target.classList.remove("prr-requesting");
    loadingManager.removeLoading(target);
    globalOptions.onResponse.call(null, target, options);
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
      // 当不存在目标或目标由指令指定且是手动设置 requesting 值时不做处理
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

  // 获取元素某个样式
  function getStyle(el, prop) {
    return document.defaultView.getComputedStyle(el).prop;
  }
  // 添加相关样式
  function addStyle() {
    const STYLE_TEXT = `
        .prr-no-pointer-events {
          pointer-events: none !important;
        }
        .prr-loading-parent-relative {
          position: relative !important;
        }
        .prr-loading-mask {
          position: absolute;
          z-index: 2000;
          background-color: rgba(255, 255, 255, .8);
          margin: 0;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transition: opacity 0.3s;
        }
        .prr-loading-spinner {
          top: 50%;
          transform: translateY(-50%);
          width: 100%;
          text-align: center;
          position: absolute;
        }
        .prr-circular {
          height: 42px;
          width: 42px;
          animation: prr-loading-rotate 2s linear infinite;
        }
        .prr-path {
          animation: prr-loading-dash 1.5s ease-in-out infinite;
          stroke-dasharray: 90, 150;
          stroke-dashoffset: 0;
          stroke-width: 2;
          stroke: #11A560;
          stroke-linecap: round;
        }
        @keyframes prr-loading-rotate {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes prr-loading-dash {
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
  const preventRepetitiveRequest = {
    // 是否已通过 Vue.use 注册该工具
    _installed: false,
    // 设置参数
    setOptions(userOptions) {
      userOptions = userOptions || {};
      Object.assign(globalOptions, userOptions);
    },
    // 指令
    directive,
    // 通过 Vue.use 使用该工具时调用
    install(Vue) {
      if (this._installed) return;
      Vue.directive("prr", directive);
      this._installed = true;
    },
  };
  // 初始化
  function init() {
    resetXMLHttpRequest();
    addStyle();
  }

  init();
  window.prr = preventRepetitiveRequest;
  // 检测到 Vue 时自动注册
  if (window.Vue) {
    window.Vue.use(preventRepetitiveRequest);
  }
})();
