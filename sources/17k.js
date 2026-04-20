const Source17k = {
    name: "17k",
    maxWorkers: 1,
    pattern: /17k\.com\/book\/\d+/,
    chapterListSelector: ".Volume dd a",
    chapterTitleSelector: ".readAreaBox.content h1",
    chapterContentSelector: ".readAreaBox.content .p",
    parsePreview: (html, url) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return {
            bookName: doc.querySelector('.info h1')?.textContent.trim() || doc.querySelector('.BookInfo h1')?.textContent.trim(),
            authorName: doc.querySelector('.author a.name')?.textContent.trim() || doc.querySelector('.AuthorInfo .name')?.textContent.trim(),
            coverImage: doc.querySelector('.cover img')?.src || doc.querySelector('.BookInfo img')?.src,
            description: doc.querySelector('.intro')?.textContent.trim(),
            sourceBookCode: url.match(/book\/(\d+)/)?.[1],
            url: url
        };
    },
    fetchChapters: async (url, progressCallback) => {
        const bookId = url.match(/book\/(\d+)/)?.[1];
        if (!bookId) throw new Error("Không tìm thấy Book ID");

        const listUrl = `https://www.17k.com/list/${bookId}.html`;
        progressCallback("Đang chuyển sang trang danh sách chương...");

        const tab = await chrome.tabs.create({ url: listUrl, active: false });

        try {
            // Đợi trang load
            let found = false;
            const selector = ".Volume dd a"; // Dùng selector chi tiết hơn
            for (let i = 0; i < 20; i++) {
                const [{ result: count }] = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: "MAIN",
                    args: [selector],
                    func: (sel) => document.querySelectorAll(sel).length
                });
                if (count > 0) { found = true; break; }
                await new Promise(r => setTimeout(r, 500));
            }

            if (!found) throw new Error("Không tìm thấy danh sách chương trên trang danh lục");

            const [{ result: chapters }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: "MAIN",
                args: [selector],
                func: (sel) => {
                    const elements = [...document.querySelectorAll(sel)];
                    return elements.map((el, i) => {
                        const span = el.querySelector('span');
                        const isVip = span?.classList.contains('vip');
                        const title = span?.textContent?.trim() || el.textContent?.replace(/\s+/g, ' ').trim() || `Chương ${i + 1}`;
                        const href = el.getAttribute('href') || '';

                        // Xử lý link tuyệt đối nếu href là tương đối
                        let fullUrl = el.href;
                        if (href.startsWith('/')) {
                            fullUrl = `https://www.17k.com${href}`;
                        }

                        return {
                            chapter_number: i + 1,
                            chapter_title: title,
                            chapter_url: fullUrl,
                            type: isVip ? "vip" : "normal",
                        };
                    }).filter(c =>
                        c.chapter_url &&
                        c.chapter_url.includes('/chapter/') &&
                        !c.chapter_url.includes('javascript:') &&
                        !c.chapter_title.includes('登录')
                    );
                }
            });

            return chapters;
        } finally {
            chrome.tabs.remove(tab.id).catch(() => { });
        }
    }
};
