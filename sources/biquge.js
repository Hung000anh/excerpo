const SourceBiquge = {
  name: "biquge",
  pattern: /biquge\.tw\/book\/\d+/,
  chapterListSelector: "#list dd a",
  chapterTitleSelector: ".bookname h1",
  chapterContentSelector: "#content",
  parsePreview: (html, url) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
      bookName: doc.querySelector('#info h1')?.textContent.trim(),
      authorName: doc.querySelector('#info p')?.textContent.replace('作    者：', '').trim(),
      coverImage: doc.querySelector('#fmimg img')?.src,
      description: doc.querySelector('#intro')?.textContent.trim(),
      sourceBookCode: url.match(/book\/(\d+)/)?.[1],
      url
    };
  }
};
