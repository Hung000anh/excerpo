const Source69shubatw = {
  name: "69shubatw",
  maxWorkers: 1,
  downloadDelay: 2000,
  pattern: /69shuba\.tw\/book\/.*/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName:       ".bookinfo h1",
      authorName:     {
        custom: (doc) => {
          const a = doc.querySelector('.bookinfo a[href*="author"]');
          return a ? a.textContent.trim() : null;
        }
      },
      coverImage:     {
        custom: (doc) => {
          const img = doc.querySelector('.bookinfo img');
          srcImg = img.getAttribute("src");
          return srcImg?.startsWith("//") ? "https:" + srcImg : srcImg;
        }
      },
      description:    ".intro p",
      sourceBookCode: { urlPattern: /book\/(\d+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    listUrl: (url) => {
      const id = url.match(/book\/(\d+)/)?.[1];
      return `https://69shuba.tw/indexlist/${id}/`;
    },
    readySelector: "ul.last9",
    extract: (selector) => {
      const elements = [...document.querySelectorAll(selector)];
      return elements.map((el, i) => {
        return {
          chapter_number: i + 1,
          chapter_title:  el.textContent.replace(/\s+/g, ' ').trim(),
          chapter_url:    el.href,
          type:           "normal"
        };
      }).filter(c => c.chapter_url && !c.chapter_url.includes('javascript:'));
    },
    extractArgs: () => ["ul.last9 a[href^='/read/']"]
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: "#nr1",
    type:          "text",
    selector:      "#nr1",
    remove:        []
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) { 
    return parsePreview(html, url, this.preview); 
  },
  async fetchChapters(url, progressCb) {
    const id = url.match(/book\/(\d+)/)?.[1] || url.match(/indexlist\/(\d+)/)?.[1];
    if (!id) throw new Error("Không tìm thấy Book ID trong URL");

    const baseUrl = "https://69shuba.tw";
    const firstUrl = `${baseUrl}/indexlist/${id}/`;

    const firstConfig = {
      ...this.chapters,
      listUrl: () => firstUrl,
      extract: (selector) => {
        const elements = [...document.querySelectorAll(selector)];
        const chapters = elements.map((el) => {
          return {
            chapter_title:  el.textContent.replace(/\s+/g, ' ').trim(),
            chapter_url:    el.href,
            type:           "normal"
          };
        }).filter(c => c.chapter_url && !c.chapter_url.includes('javascript:'));
        
        const options = [...document.querySelectorAll("select#indexselect-top option")];
        const urls = options.map(opt => opt.value).filter(val => val);
        
        return { chapters, urls };
      }
    };

    const firstResult = await parseChapters(url, firstConfig, progressCb);
    const allChapters = firstResult.chapters || [];
    const urls = firstResult.urls || [];
    
    allChapters.forEach((c, i) => c.chapter_number = i + 1);

    const otherUrls = urls
      .filter(u => !u.endsWith(`/${id}/`) && !u.endsWith(`/${id}`))
      .map(u => new URL(u, baseUrl).href);

    for (const nextUrl of otherUrls) {
      const nextConfig = {
        ...this.chapters,
        listUrl: () => nextUrl
      };
      
      const nextChapters = await parseChapters(nextUrl, nextConfig, progressCb);
      if (Array.isArray(nextChapters)) {
        for (const c of nextChapters) {
          c.chapter_number = allChapters.length + 1;
          allChapters.push(c);
        }
      }
    }

    return allChapters;
  }
};
