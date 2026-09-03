// AliceSW source
const SourceAlicesw = {
  name: "alicesw",
  pattern: /(?:www\.)?alicesw\.tw\/novel\/\d+\.html/,

  preview: {
    fields: {
      bookName: ".box_info .novel_title",
      authorName: ".box_info .novel_info a[href*='f=author']",
      coverImage: {
        selector: "#detail-box > div > div.ui_bg6 > div.box_intro > div.pic > img | .box_intro .pic img",
        attr: ["data-src", "src"]
      },
      sourceBookCode: { urlPattern: /novel\/(\d+)\.html/ }
    }
  },

  chapters: {
    method: "fetch",
    listUrl: (url) => {
      const id = url.match(/novel\/(\d+)\.html/)?.[1];
      return id ? `https://www.alicesw.tw/other/chapters/id/${id}.html` : url;
    },
    extract: (doc) => {
      const seen = new Set();
      const chapters = [];

      for (const a of doc.querySelectorAll(".mulu_list a[href]")) {
        let href;
        try {
          href = new URL(a.getAttribute("href"), "https://www.alicesw.tw");
        } catch {
          continue;
        }
        if (!/^https?:$/.test(href.protocol) || !/(?:^|\.)alicesw\.tw$/.test(href.hostname)) continue;
        href = href.href;
        if (seen.has(href)) continue;
        seen.add(href);

        const title = a.textContent.replace(/\s+/g, " ").trim();
        if (!title) continue;
        chapters.push({
          chapter_number: chapters.length + 1,
          chapter_title: title,
          chapter_url: href,
          type: "normal"
        });
      }

      return chapters;
    }
  },

  content: {
    readySelector: ".read-content.j_readContent",
    type: "paragraphs",
    selector: ".read-content.j_readContent",
    remove: ["script", "style", ".ad", ".ads", ".advertisement"]
  },

  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};
