const SourceJjwxc = {
  name: "jjwxc",
  pattern: /jjwxc\.net\/onebook\.php\?novelid=\d+/,
  chapterListSelector: "#onebooktpl tr[itemprop='chapter'] a",
  chapterTitleSelector: "h2",
  chapterContentSelector: ".noveltext",
  parsePreview: (html, url) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
      bookName: doc.querySelector('h1 span[itemprop="name"]')?.textContent.trim(),
      authorName: doc.querySelector('span[itemprop="author"]')?.textContent.trim(),
      coverImage: doc.querySelector('.noveldefaultimage')?.src,
      description: doc.querySelector('#novelintro')?.textContent.trim(),
      sourceBookCode: url.match(/novelid=(\d+)/)?.[1],
      url
    };
  }
};
