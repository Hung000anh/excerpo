// syosetu.today manga source
const SourceSyosetuToday = {
  name: "syosetu_today",
  kind: "manga",
  maxWorkers: 1,
  downloadDelay: 1000,
  pattern: /^https?:\/\/(?:www\.)?syosetu\.today\/manga\/[^/?#]+\/?$/i,

  preview: {
    fields: {
      bookName: ".z-single-mg h1.name | h1.name",
      authorName: { custom: () => null },
      coverImage: {
        custom: (doc, url) => {
          const src = doc.querySelector(".z-single-mg img.w-100, img.w-100")?.getAttribute("src");
          if (!src) return null;
          try { return new URL(src, url).href; } catch { return src; }
        }
      },
      description: ".z-single-mg .content-text p | .content-text p",
      sourceBookCode: {
        custom: (_doc, url) => {
          const slug = url.match(/\/manga\/([^/?#]+)/i)?.[1] || null;
          if (!slug) return null;
          try { return decodeURIComponent(slug); } catch { return slug; }
        }
      }
    }
  },

  chapters: {
    method: "tab",
    readySelector: ".chapter-box .entry h4 a",
    extract: async (bookUrl) => {
      const links = Array.from(document.querySelectorAll(".chapter-box .entry h4 a[href]"));
      const seen = new Set();
      let chapters = links.map((link) => {
        const title = link.textContent.replace(/\s+/g, " ").trim();
        let chapterUrl;
        try { chapterUrl = new URL(link.getAttribute("href"), bookUrl).href; } catch { return null; }
        if (seen.has(chapterUrl)) return null;
        seen.add(chapterUrl);

        const normalized = title.normalize("NFKC");
        const numberMatch = normalized.match(/第\s*(\d+(?:\.\d+)?)\s*話/i)
          || chapterUrl.match(/chapter-(\d+(?:\.\d+)?)/i);
        return {
          chapter_number: 0,
          chapter_title: title,
          chapter_url: chapterUrl,
          type: "normal",
          _sourceNumber: numberMatch ? Number(numberMatch[1]) : null,
          _isNewest: !!link.closest(".entry")?.querySelector(".badge")
        };
      }).filter(Boolean);

      const first = chapters[0];
      const last = chapters[chapters.length - 1];
      const newestFirst = chapters.length > 1 && (
        first?._isNewest
        || (Number.isFinite(first?._sourceNumber)
          && Number.isFinite(last?._sourceNumber)
          && first._sourceNumber > last._sourceNumber)
      );
      if (newestFirst) chapters.reverse();

      return chapters.map((chapter, index) => ({
        chapter_number: index + 1,
        chapter_title: chapter.chapter_title,
        chapter_url: chapter.chapter_url,
        type: chapter.type
      }));
    },
    extractArgs: (url) => [url]
  },

  content: {
    readySelector: "body > div.container.pt-3.minh-100",
    type: "custom",
    selector: ".z_content",
    customExtract: async () => {
      // Click ngay khi container có trong DOM; retry ngắn nếu jQuery chưa kịp gắn handler.
      for (let attempt = 0; attempt < 100; attempt++) {
        if (document.querySelector("body > div.container.pt-3.minh-100 > div.z_content.pt-2.pb-10 > img")) break;
        const openButton = document.querySelector(".go-open-popup");
        if (openButton) {
          openButton.click();
          if (!document.querySelector(".go-open-popup-wrap")) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      let imageUrls = [];
      let stableCount = 0;
      let previousSignature = "";
      for (let attempt = 0; attempt < 240; attempt++) {
        const images = Array.from(document.querySelectorAll(
          "body > div.container.pt-3.minh-100 > div.z_content.pt-2.pb-10 > img"
        ));

        imageUrls = images.map((img) =>
          img.getAttribute("data-src")
          || img.getAttribute("data-lazy-src")
          || img.getAttribute("data-original")
          || img.currentSrc
          || img.getAttribute("src")
        ).filter(Boolean).map((src) => {
          try { return new URL(src, location.href).href; } catch { return null; }
        }).filter((src) => src && /^https?:\/\//i.test(src));

        imageUrls = [...new Set(imageUrls)];
        const signature = imageUrls.join("\n");
        stableCount = imageUrls.length > 0 && signature === previousSignature ? stableCount + 1 : 0;
        const loadingElement = document.querySelector(".premium-loading");
        const triggerStillVisible = !!document.querySelector(".go-open-popup-wrap");

        // AJAX của trang xóa .premium-loading sau khi tải xong toàn bộ ảnh.
        if (imageUrls.length > 0 && !loadingElement && !triggerStillVisible) break;
        // Fallback nếu website đổi cách đánh dấu hoàn tất: chờ danh sách ổn định 10 giây.
        if (imageUrls.length > 0 && !triggerStillVisible && stableCount >= 20) break;
        previousSignature = signature;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return imageUrls.length ? { imageUrls } : null;
    }
  },

  parsePreview(html, url)        { return parsePreview(html, url, this.preview); },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};
