// freewebnovel source
const SourceFreewebnovel = {
  name: "freewebnovel",
  pattern: /(?:www\.)?freewebnovel\.com\/(?:novel\/)?[a-zA-Z0-9-]+/,
  // ── Preview config ────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: { custom: (doc) => doc.querySelector('h1.tit, .book-name, h1')?.textContent?.trim() || doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "" },
      authorName: {
        custom: (doc) => {
          const authorEl = doc.querySelector('.right .author a, .m-desc .author a, span[itemprop="author"]');
          return authorEl ? authorEl.textContent?.trim() : null;
        }
      },
      coverImage: {
        custom: (doc, url) => {
          const img = doc.querySelector(".pic img, .book-img img, meta[property='og:image']");
          if (!img) return null;
          let src = img.getAttribute("src") || img.getAttribute("content") || "";
          if (src.startsWith("//")) src = "https:" + src;
          return src || null;
        }
      },
      description: {
        custom: (doc) => {
          const el = doc.querySelector(".inner, .m-desc .txt, .summary") || doc.querySelector('meta[property="og:description"]');
          if (!el) return null;
          const text = el.tagName === 'META' ? el.getAttribute("content") : el.textContent?.trim();
          return text && text.length > 200 ? text.slice(0, 200) + "…" : text;
        }
      },
      sourceBookCode: {
        custom: (doc, url) => {
          const match = url.match(/(?:novel\/)?([a-zA-Z0-9-]+)(?:\.html)?/);
          return match ? match[1] : "";
        }
      }
    }
  },
  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "h1.tit, .book-name, #uls li a",
    extract: async (url) => {
      let cleanUrl = url.replace(/\.html$/, "");
      if (!cleanUrl.includes("/novel/")) {
        cleanUrl = cleanUrl.replace("freewebnovel.com/", "freewebnovel.com/novel/");
      }
      // Thử gọi API AJAX nội bộ của tab (đã vượt Cloudflare)
      try {
        const pageSize = 1000;
        const firstRes = await fetch(`${cleanUrl}?ajax=chapters&page=1&pageSize=${pageSize}`);
        if (firstRes.ok) {
          const firstData = await firstRes.json();
          const totalPage = firstData.totalPage || 1;
          let allHtml = firstData.html || "";
          const pagePromises = [];
          for (let p = 2; p <= totalPage; p++) {
            pagePromises.push(
              fetch(`${cleanUrl}?ajax=chapters&page=${p}&pageSize=${pageSize}`)
                .then(r => r.json())
                .then(d => ({ page: p, html: d.html || "" }))
                .catch(() => ({ page: p, html: "" }))
            );
          }
          const results = await Promise.all(pagePromises);
          results.sort((a, b) => a.page - b.page);
          results.forEach(res => { allHtml += res.html; });
          const div = document.createElement("div");
          div.innerHTML = `<ul>${allHtml}</ul>`;
          const ajaxLinks = Array.from(div.querySelectorAll("a"));
          if (ajaxLinks.length > 0) {
            return ajaxLinks.map((a, index) => {
              let href = a.getAttribute("href") || "";
              if (href.startsWith("/")) href = window.location.origin + href;
              return {
                chapter_number: index + 1,
                chapter_title: a.getAttribute("title") || a.textContent.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
                chapter_url: href,
                type: "normal"
              };
            });
          }
        }
      } catch (e) {
        console.error("Error fetching AJAX chapters from tab:", e);
      }
      // Fallback: bóc tách từ DOM trang nếu AJAX bị lỗi
      const links = Array.from(document.querySelectorAll("#uls li a, .ul-list li a, .wp-manga-chapter a"));
      return links.map((a, index) => {
        return {
          chapter_number: index + 1,
          chapter_title: a.textContent.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
          chapter_url: a.href,
          type: "normal"
        };
      });
    }
  },
  // ── Content config ────────────────────────────────────────────────────────
  content: {
    readySelector: "#txt, div.txt, .txt p",
    type: "paragraphs",
    selector: "#txt, div.txt, .reading-content",
    remove: ["script", "style", ".code-block", "ins", ".adsbygoogle"]
  },
  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  async fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};