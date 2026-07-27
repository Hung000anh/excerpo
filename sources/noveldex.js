// noveldex source
function getContextProp(doc, prop) {
  const scripts = Array.from(doc.querySelectorAll("script[type='application/ld+json']"));
  for (let s of scripts) {
    try {
      let json = JSON.parse(s.innerHTML);
      if (json && json[prop] != null) return json[prop];
    } catch(e) {}
  }
  return null;
}

const SourceNoveldex = {
  name: "noveldex",
  pattern: /(?:www\.)?noveldex\.(?:io|org|net|com)\/(?:series\/)?(?:novel|manga)\/[a-zA-Z0-9-]+/,

  // ── Preview config ────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: { custom: (doc) => doc.querySelector("main h1:first-of-type")?.textContent?.trim() || "" },
      authorName: {
        custom: (doc) => {
          let authorInfo = getContextProp(doc, "author");
          let author = (authorInfo && typeof authorInfo === "object") ? authorInfo.name : null;
          
          const translatorMatch = /(?:\\"team\\":.+?\\"name\\":\\")(.*?)(?:\\")/.exec(doc.body.innerHTML);
          let translator = translatorMatch ? translatorMatch[1] : null;
          
          return [author, translator].filter(Boolean).join(", ") || null;
        }
      },
      coverImage: {
        custom: (doc, url) => {
          const imgUrl = getContextProp(doc, "image");
          if (typeof imgUrl === "string") {
            return imgUrl.startsWith("/") ? new URL(imgUrl, url).href : imgUrl;
          }
          return null;
        }
      },
      description: {
        custom: (doc) => {
          const desc = getContextProp(doc, "description");
          return typeof desc === "string" ? desc : null;
        }
      },
      sourceBookCode: {
        custom: (doc, url) => {
          const match = url.match(/(?:novel|manga)\/([a-zA-Z0-9-]+)/);
          return match ? match[1] : "";
        }
      }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "div[id] div[data-state] a[href*='chapter']",
    extract: (url) => {
      // Excludes locked chapters using :not(:has(svg.lucide-lock))
      const linksElements = document.querySelectorAll("div[id] div[data-state] a[href*='chapter']:not(:has(svg.lucide-lock))");
      const links = Array.from(linksElements);
      return links.map((a, index) => {
        const titleSpans = a.querySelector("div:first-of-type")?.querySelectorAll("span");
        let title = titleSpans ? Array.from(titleSpans).map(s => s.innerText.trim()).join(" ") : a.textContent;
        return {
          chapter_number: index + 1,
          chapter_title: title.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
          chapter_url: a.href,
          type: "normal"
        };
      });
    }
  },

  // ── Content config ────────────────────────────────────────────────────────
  content: {
    readySelector: "[data-paragraph-index]",
    type: "noveldex",
    selector: "body",
    remove: ["script", "style", ".code-block"]
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  async fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};
(self.EXCERPO_SOURCES = self.EXCERPO_SOURCES || []).push(SourceNoveldex);
