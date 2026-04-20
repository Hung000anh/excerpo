const SourceUukanshu = {
  name: "uukanshu",
  pattern: /uukanshu\.cc\/book\/\d+/,
  chapterListSelector: ".list li a",
  chapterTitleSelector: ".title h1",
  chapterContentSelector: ".content",
  parsePreview: (html, url) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
      bookName: doc.querySelector('.book-info h1')?.textContent.trim(),
      authorName: doc.querySelector('.book-info .author')?.textContent.replace('作者：', '').trim(),
      coverImage: doc.querySelector('.book-img img')?.src,
      description: doc.querySelector('.intro')?.textContent.trim(),
      sourceBookCode: url.match(/book\/(\d+)/)?.[1],
      url
    };
  }
};
