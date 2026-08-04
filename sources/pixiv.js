function _getPixivPreloadData(doc, url) {
  try {
    const meta = doc.querySelector('meta#meta-preload-data');
    if (!meta) return null;
    const content = meta.getAttribute('content');
    if (!content) return null;
    const data = JSON.parse(content);

    const oneshotMatch = url.match(/id=(\d+)/);
    if (oneshotMatch && data.novel && data.novel[oneshotMatch[1]]) {
      const n = data.novel[oneshotMatch[1]];
      const author = n.userName || (data.user && n.userId && data.user[n.userId]?.name) || null;
      return {
        bookName: n.title || null,
        authorName: author,
        description: n.caption ? n.caption.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : null,
        coverImage: n.coverUrl || n.userImageUrl || null
      };
    }

    const seriesMatch = url.match(/series\/(\d+)/);
    if (seriesMatch && data.series && data.series[seriesMatch[1]]) {
      const s = data.series[seriesMatch[1]];
      const author = s.userName || (data.user && s.userId && data.user[s.userId]?.name) || null;
      return {
        bookName: s.title || null,
        authorName: author,
        description: s.caption ? s.caption.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : null,
        coverImage: s.coverUrl || null
      };
    }
  } catch (e) {
    // Fallback
  }
  return null;
}

const SourcePixiv = {
  name: "pixiv",
  pattern: /pixiv\.net\/novel\/(series\/\d+|show\.php\?id=\d+)/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: {
        custom: (doc, url) => {
          const preload = _getPixivPreloadData(doc, url);
          if (preload && preload.bookName) return preload.bookName;

          // DOM <h1>
          const h1 = doc.querySelector('h1')?.textContent?.trim();
          if (h1 && h1.length > 0 && h1 !== "pixiv") return h1;

          // Parse <title>
          let titleText = doc.querySelector('title')?.textContent || "";
          titleText = titleText.replace(/\s*-\s*(?:Novel|Series)\s+by.*$/i, '')
                               .replace(/\s*-\s*pixiv.*$/i, '');

          const match = titleText.match(/「([^」]+)」/);
          if (match) {
            titleText = match[1];
          } else {
            titleText = titleText.replace(/^(?:#\S+\s*|\[[^\]]+\]\s*)*/g, '');
          }
          return titleText.trim();
        }
      },
      authorName: {
        custom: (doc, url) => {
          const preload = _getPixivPreloadData(doc, url);
          if (preload && preload.authorName) return preload.authorName;

          const titleText = doc.querySelector('title')?.textContent || "";
          const byMatch = titleText.match(/(?:Novel|Series)\s+by\s+([^-]+)/i);
          if (byMatch) return byMatch[1].trim();

          const slashMatch = titleText.match(/「[^」]+」\/「([^」]+)」/);
          if (slashMatch) return slashMatch[1].trim();

          const authorEl = doc.querySelector('aside section h2 a')
                        || doc.querySelector('aside a[href*="/users/"]')
                        || doc.querySelector('h2 a[href*="/users/"]')
                        || doc.querySelector('main a[href*="/users/"]');
          if (authorEl) return authorEl.textContent.trim();

          return "";
        }
      },
      coverImage: {
        custom: (doc, url) => {
          const preload = _getPixivPreloadData(doc, url);
          if (preload && preload.coverImage) return preload.coverImage;

          return doc.querySelector('.bgswnE img')?.getAttribute('src')
            || doc.querySelector('img[src*="novel-cover-master"]')?.getAttribute('src')
            || doc.querySelector('a[href*="novel-cover-master"] img')?.getAttribute('src')
            || doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
            || doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
            || null;
        }
      },
      description: {
        custom: (doc, url) => {
          const preload = _getPixivPreloadData(doc, url);
          if (preload && preload.description) return preload.description;

          const exp = doc.querySelector('p[id^="expandable-paragraph"]')?.textContent?.trim()
                   || doc.querySelector('.sc-381905cd-1')?.textContent?.trim()
                   || doc.querySelector('.sc-5ff2e68e-5')?.textContent?.trim();
          if (exp) return exp;

          return "";
        }
      },
      sourceBookCode: {
        custom: (doc, url) => {
          const match = url.match(/(?:series\/|id=)(\d+)/);
          return match ? match[1] : "";
        }
      }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "custom",
    custom: async (url, progressCb) => {
      const seriesMatch = url.match(/series\/(\d+)/);
      const oneshotMatch = url.match(/id=(\d+)/);

      if (oneshotMatch) {
        const novelId = oneshotMatch[1];
        progressCb(`Đang lấy thông tin chương oneshot (ID: ${novelId})...`);
        let title = "Chương 1";
        try {
          const res = await fetch(`https://www.pixiv.net/ajax/novel/${novelId}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.body?.title) {
              title = data.body.title.replace(/\s+/g, ' ').trim();
            }
          }
        } catch (e) {
          // Fallback
        }

        return [{
          chapter_number: 1,
          chapter_title: title,
          chapter_url: `https://www.pixiv.net/novel/show.php?id=${novelId}`,
          type: "normal"
        }];
      }

      if (seriesMatch) {
        const seriesId = seriesMatch[1];
        const chapters = [];
        let lastOrder = 0;
        let hasMore = true;

        while (hasMore) {
          progressCb(`Đang tải danh sách chương (offset order ${lastOrder})...`);
          const apiUrl = `https://www.pixiv.net/ajax/novel/series_content/${seriesId}?limit=30&last_order=${lastOrder}&order_by=asc&lang=en`;
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error(`Lỗi tải API danh sách chương: HTTP ${res.status}`);
          const data = await res.json();
          if (data.error) throw new Error(`Lỗi từ API Pixiv: ${data.message}`);

          const novels = data.body?.thumbnails?.novel || [];
          if (novels.length === 0) {
            hasMore = false;
            break;
          }

          novels.forEach((novel) => {
            chapters.push({
              chapter_number: chapters.length + 1,
              chapter_title: novel.title.replace(/\s+/g, ' ').trim(),
              chapter_url: `https://www.pixiv.net/novel/show.php?id=${novel.id}`,
              type: "normal"
            });
          });

          if (novels.length < 30) {
            hasMore = false;
          } else {
            lastOrder = novels[novels.length - 1].seriesContentOrder;
          }
        }

        return chapters;
      }

      throw new Error("Không thể nhận diện URL Pixiv (cần dạng series/ID hoặc show.php?id=ID).");
    }
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: "main",
    type:          "custom",
    selector:      "body",
    customExtract: async () => {
      const idMatch = location.href.match(/id=(\d+)/);
      if (!idMatch) return null;
      const id = idMatch[1];
      try {
        const res = await fetch(`https://www.pixiv.net/ajax/novel/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.body && data.body.content) {
          const rawPs = data.body.content.split('\n').map(p => p.trim());
          const ps = [];
          for (let p of rawPs) {
            if (!p) continue;
            if (p === '[pagebreak]') {
              ps.push('　＊＊＊＊＊');
              continue;
            }
            p = p.replace(/\[chapter:(.*?)\]/g, '$1')
                 .replace(/\[pixivimage:\d+(?:-\d+)?\]/g, '')
                 .replace(/\[uploadedimage:\d+\]/g, '')
                 .replace(/\[jump:\d+\]/g, '')
                 .replace(/\[\[rb:([^>]+)\s*=>\s*([^\]]+)\]\]/g, '$1($2)')
                 .trim();
            if (p) ps.push(p);
          }
          return { paragraphs: ps };
        }
        return null;
      } catch (err) {
        return null;
      }
    }
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url)        { return parsePreview(html, url, this.preview); },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};
