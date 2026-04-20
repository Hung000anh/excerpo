const Source52shuku = {
  name: "52shuku",
  pattern: /52shuku\.net\/wenxue\/.*\.html/,
  chapterListSelector: ".list li a",
  chapterTitleSelector: "h1",
  chapterContentSelector: ".article-content",
  parsePreview: (html, url) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
      bookName: doc.querySelector('h1')?.textContent.trim(),
      authorName: doc.querySelector('.info a')?.textContent.trim(),
      coverImage: doc.querySelector('.content img')?.src,
      description: doc.querySelector('.content')?.textContent.trim().substring(0, 200),
      sourceBookCode: url.match(/([^\/]+)\.html$/)?.[1],
      url
    };
  }
};
