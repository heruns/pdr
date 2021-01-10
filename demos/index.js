axios.defaults.baseURL =
  "https://www.fastmock.site/mock/a54aeb751600c404e896d70bb29468c7/prr";

prr.setOptions({
  loading: false,
  onRequest(target, options) {
    // console.log(target, "请求开始");
    // 处理 element ui 的按钮
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
    // console.log(target, "请求结束");
    if (target.classList.contains("el-button")) {
      target.classList.remove("is-loading");
      const loading = document.querySelector(".el-icon-loading");
      loading && target.removeChild(loading);
    }
  },
});

// demo 展示组件
const IframeDemo = {
  name: "iframe-demo",
  template: "#iframe-demo",
  props: {
    src: String,
  },
  mounted() {
    this.$refs.iframe.addEventListener("load", (e) => {
      const bodyHeight = this.$refs.iframe.contentDocument.body.scrollHeight;
      this.$refs.iframe.height = bodyHeight + "px";
    });
  },
};

// 示例代码
new Vue({
  el: "#app",
  components: {
    IframeDemo,
  },
  data: {
    loading: false,
  },
  methods: {
    handleClick(e) {
      this.loading = true;
      axios
        .get("/one-second")
        .then(() => axios.get("/two-seconds"))
        .then(() => {
          this.loading = false;
        });
    },
    fetchJs() {
      axios.get("/two-seconds");
    },
  },
});
