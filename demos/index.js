// demo 展示组件
const IframeDemo = {
  name: "iframe-demo",
  template: "#iframe-demo",
  props: {
    src: String,
  },
  data() {
    return {
      height: "",
      snippets: [],
      showCode: false,
    };
  },
  created() {
    if (window.location.protocol === "file:" && !IframeDemo.alerted) {
      alert(
        "此 demo 无法直接通过 file 协议直接预览，请将文件放到本地或远程服务器中预览"
      );
      IframeDemo.alerted = true;
    }
    this.getStorageHeight();
    this.getCode();
  },
  mounted() {
    // 加载完成后将当前 iframe 高度保存到 localStorage 中
    this.$refs.iframe.addEventListener("load", (e) => {
      const bodyHeight = this.$refs.iframe.contentDocument.body.scrollHeight;
      this.height = bodyHeight + 20 + "px";
      this.setStorageHeight();
    });
  },
  methods: {
    // 获取示例代码
    async getCode() {
      const res = await axios.get(this.src);
      const code = res.data;
      const lines = code.split(/\n/g);
      const snippets = [];
      let snippet = {
        lineCodes: [], // 代码片段每行组成的数组
        code: "", // 代码片段内容
        info: {}, // 代码片段相关信息
      };
      let isSnippet = false; // 当前是否是代码片段的内容
      // 判断当前行是否代码片段开始的标志
      const isSnippetStart = (lineCode) => {
        const codeStartRegexps = [
          /^\s*\<\!\-\-\s+code\sstart.*\s+\-\-\>/,
          /^\s*\/\/\s+code\sstart/,
        ];
        return codeStartRegexps.some((regexp) => regexp.test(lineCode));
      };
      // 判断当前行是否代码片段结束的标志
      const isSnippetEnd = (lineCode) => {
        const codeEndRegexps = [
          /^\s*\<\!\-\-\s+code\send\s+\-\-\>/,
          /^\s*\/\/\s+code\send/,
        ];
        return codeEndRegexps.some((regexp) => regexp.test(lineCode));
      };
      // 格式化和拼接代码
      const lines2code = (lines) => {
        const prefixSpaceLengths = lines
          .map((line) => {
            line = line.replace(/\s+$/, "");
            const spaces = /^(\s*)/.exec(line)[1] || "";
            return spaces.length;
          })
          .filter((spacesLength) => spacesLength > 0);
        const spaceMinLength = Math.min(...prefixSpaceLengths);
        return lines.map((line) => line.slice(spaceMinLength)).join("\n");
      };
      // 获取代码片段信息
      const getSnippetInfo = (lineCode) => {
        const infoText = /code\sstart:?(.*?)(\s|$)/.exec(lineCode)[1] || "";
        const infoLines = infoText.split(";");
        const info = infoLines.reduce((info, line) => {
          const [prop, value] = line.split(":");
          info[prop] = value;
          return info;
        }, {});
        return info;
      };
      for (let i = 0; i < lines.length; i++) {
        const lineCode = lines[i];
        if (isSnippet) {
          if (isSnippetEnd(lineCode)) {
            isSnippet = false;
            snippet.code = lines2code(snippet.lineCodes);
            snippets.push(snippet);
          } else {
            snippet.lineCodes.push(lineCode);
          }
        } else if (isSnippetStart(lineCode)) {
          isSnippet = true;
          snippet = {
            lineCodes: [],
            code: "",
            info: {},
          };
          snippet.info = getSnippetInfo(lineCode);
        }
      }
      this.snippets = snippets;
    },
    toggleShow() {
      this.showCode = !this.showCode;
    },
    // 获取 localStorage 中保存的所有 iframe 高度
    getStorageHeights() {
      const iframeHeightStr = window.localStorage.getItem("iframe_height");
      return iframeHeightStr ? JSON.parse(iframeHeightStr) : {};
    },
    // 获取 localStorage 中保存的当前 iframe 高度
    getStorageHeight() {
      const iframeHeights = this.getStorageHeights();
      this.height = iframeHeights[this.src] || "";
    },
    // 将当前 iframe 高度保存到 localStorage 中
    setStorageHeight(height) {
      const iframeHeights = this.getStorageHeights();
      iframeHeights[this.src] = this.height;
      window.localStorage.setItem(
        "iframe_height",
        JSON.stringify(iframeHeights)
      );
    },
  },
};

// 示例代码
Vue.use(hljs.vuePlugin);
new Vue({
  el: "#app",
  components: {
    IframeDemo,
  },
});
