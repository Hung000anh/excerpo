const SourceScribbleHub = {
  name: "scribblehub",
  pattern: /(?:www\.)?scribblehub\.com\/series\/\d+\//,

  preview: {
    fields: {
      bookName: {
        selector: 'div.fic_title[property="name"]'
      },
      authorName: {
        custom: (doc) => {
          return doc.querySelector('span[property="name"] a span.auth_name_fic')?.textContent.trim()
            || doc.querySelector('span[property="name"] a')?.textContent.trim()
            || null;
        }
      },
      coverImage: {
        selector: 'div.novel-cover img[property="image"], img.thumbnail.inline-block[data-type="cover"]',
        attr: ["src", "data-src"]
      },
      description: {
        selector: 'div.wi_fic_desc[property="description"]'
      },
      sourceBookCode: {
        urlPattern: /series\/(\d+)/
      }
    }
  },

  chapters: {
    method: "custom",
    custom: async (url, progressCallback) => {
      const bookId = url.match(/series\/(\d+)/)?.[1];
      if (!bookId) throw new Error('Không tìm được bookId ScribbleHub');

      const chapters = [];
      const seen = new Set();
      let page = 1;
      const tab = await chrome.tabs.create({ url, active: false });

      try {
        while (true) {
          progressCallback(`Đang lấy danh sách chương: trang ${page}`);
          const [{ result: pageItems }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            args: [page, bookId],
            func: async (page, bookId) => {
              const form = new URLSearchParams();
              form.append('action', 'wi_getreleases_pagination');
              form.append('pagenum', String(page));
              form.append('mypostid', bookId);

              const resp = await fetch('/wp-admin/admin-ajax.php', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                  'X-Requested-With': 'XMLHttpRequest',
                  'Accept': '*/*'
                },
                body: form.toString(),
                credentials: 'same-origin'
              });

              if (!resp.ok) throw new Error(`HTTP ${resp.status} khi lấy chương ScribbleHub`);
              const html = await resp.text();
              const doc = new DOMParser().parseFromString(html, 'text/html');
              return Array.from(doc.querySelectorAll('ol.toc_ol li.toc_w')).map((li) => {
                const anchor = li.querySelector('a.toc_a');
                const href = anchor?.href || null;
                const title = anchor?.textContent.trim() || '';
                const match = title.match(/Chapter\s+(\d+)/i);
                const orderAttr = li.getAttribute('order');
                const order = orderAttr ? Number(orderAttr) : null;
                return {
                  chapter_number: match ? Number(match[1]) : null,
                  chapter_title: title,
                  chapter_url: href,
                  order,
                  type: 'normal'
                };
              }).filter(ch => ch.chapter_url);
            }
          });

          if (!pageItems || !pageItems.length) break;

          for (const ch of pageItems) {
            if (!seen.has(ch.chapter_url)) {
              seen.add(ch.chapter_url);
              chapters.push(ch);
            }
          }

          if (pageItems.length < 15) break;
          page += 1;
        }
      } finally {
        chrome.tabs.remove(tab.id).catch(() => {});
      }

      chapters.sort((a, b) => {
        if (a.order != null && b.order != null) {
          return a.order - b.order;
        }
        if (a.chapter_number != null && b.chapter_number != null) {
          return a.chapter_number - b.chapter_number;
        }
        return a.chapter_title.localeCompare(b.chapter_title, undefined, { numeric: true, sensitivity: 'base' });
      });

      chapters.forEach((ch, index) => {
        ch.chapter_number = index + 1;
      });

      return chapters;
    }
  },

  content: {
    readySelector: '.chp_raw',
    type: 'paragraphs',
    selector: '.chp_raw',
    remove: ['script', 'style', 'iframe', '.ads', '.advertisement', '.chp_extra'],
    lineFilter: '^\\s*$'
  },

  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },

  fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};
