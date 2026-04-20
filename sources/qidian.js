const SourceQidian = {
  name: "qidian",
  pattern: /qidian\.com\/book\/\d+/,
  chapterListSelector: ".catalog-content ul li a",
  chapterTitleSelector: ".j_chapterName",
  chapterContentSelector: ".read-content.j_readContent",
  parsePreview: (html, url) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
      bookName: doc.querySelector('.book-info h1 em')?.textContent.trim(),
      authorName: doc.querySelector('.book-info h1 span a')?.textContent.trim(),
      coverImage: doc.querySelector('.book-img img')?.src,
      description: doc.querySelector('.book-intro p')?.textContent.trim(),
      sourceBookCode: url.match(/book\/(\d+)/)?.[1],
      url
    };
  }
};
