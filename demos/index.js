(() => {
  prr.setOptions({
    loading: false,
    onRequest(target, options) {
      console.log(target, "请求开始");
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
      console.log(target, "请求结束");
      if (target.classList.contains("el-button")) {
        target.classList.remove("is-loading");
        const loading = document.querySelector(".el-icon-loading");
        loading && target.removeChild(loading);
      }
    },
  });

  // 示例代码
  const button = document.getElementById("btn");
  button.addEventListener("click", function (e) {
    axios.get("https://unpkg.com/axios@0.21.0/dist/axios.min.js");
  });

  new Vue({
    el: "#app",
    data: {
      loading: false,
    },
    methods: {
      handleClick(e) {
        this.loading = true;
        axios
          .get("https://unpkg.com/axios@0.21.0/dist/axios.min.js")
          .then(() => axios.get("https://unpkg.com/vue/dist/vue.js"))
          .then(() => {
            this.loading = false;
          });
      },
      fetchJs() {
        axios.get("https://unpkg.com/axios@0.21.0/dist/axios.min.js");
      },
    },
  });
})();
