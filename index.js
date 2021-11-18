const { renderToString } = require("react-dom/server");
const react = require("react");
const { createElement: h } = react;
const Highlight = require("prism-react-renderer");
const visit = require("unist-util-visit");
const rangeParser = require("parse-numeric-range");

const prismTheme = {
  plain: {
    color: "#d6deeb",
    backgroundColor: "#011627",
  },
  styles: [],
};

const RE = /{([\d,-]+)}/;
const calculateLinesToHighlight = (meta) => {
  if (RE.test(meta)) {
    const strlineNumbers = RE.exec(meta)[1];
    const lineNumbers = rangeParser(strlineNumbers);
    return (index) => lineNumbers.includes(index + 1);
  } else {
    return () => false;
  }
};

const titleRE = /title=([a-zA-Z. -_])+/;

const extractTitle = (meta) => {
  if (titleRE.test(meta)) {
    const title = titleRE.exec(meta)[0].replace("title=", "");
    return title;
  }
};

const rehypePrism = (options) => (ast) => {
  visit(ast, "element", (tree, index, parent) => {
    if (tree.tagName === "code" && parent.tagName === "pre") {
      // store codestring for later
      tree.properties.codestring = tree.children[0].value;
      tree.properties.title = extractTitle(tree.data?.meta);
      const shouldHighlightLine = calculateLinesToHighlight(tree.data?.meta);

      const lang =
        tree.properties.className &&
        tree.properties.className[0] &&
        tree.properties.className[0].split("-")[1];
      const highlightedCode = renderToString(
        h(
          Highlight.default,
          {
            ...Highlight.defaultProps,
            ...{
              code: tree.children[0].value.trim(),
              language: lang,
              theme: prismTheme,
            },
          },
          ({ className, style, tokens, getLineProps, getTokenProps }) =>
            h(
              "pre",
              {
                className: className,
                style: { ...style, backgroundColor: "transparent" },
              },
              tokens.map((line, i) =>
                h(
                  "div",

                  getLineProps({
                    line,
                    key: i,
                    style: shouldHighlightLine(i)
                      ? {
                          backgroundColor: "rgb(53, 59, 69)",
                          marginRight: "-1em",
                          marginLeft: "-1em",
                          paddingRight: "1em",
                          paddingLeft: "0.75em",
                          borderLeft: "0.3em solid rgb(153, 153, 153)",
                        }
                      : {},
                  }),

                  [
                    h(
                      "span",
                      {
                        key: "line-no",
                        className: "line-no",
                      },

                      i + 1
                    ),
                    ...line.map((token, key) =>
                      h(
                        "span",
                        getTokenProps({
                          token,
                          key,
                        })
                      )
                    ),
                  ]
                )
              )
            )
        )
      );
      // render code to string
      tree.children = [
        {
          value: highlightedCode,
          type: "text",
        },
      ];
    }
  });
};

module.exports = rehypePrism;
