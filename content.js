// File này tự động inject vào mọi trang (theo manifest)
// Có quyền truy cập document, window của trang đó

// Lắng nghe message từ popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    const data = {
      title: document.title,
      url: window.location.href,
      description: document.querySelector('meta[name="description"]')
                          ?.getAttribute("content") || "N/A",
      h1List: [...document.querySelectorAll("h1")]
                .map(el => el.innerText.trim()),
      links: [...document.querySelectorAll("a[href]")]
              .map(a => ({ text: a.innerText.trim(), href: a.href }))
              .filter(l => l.text && l.href.startsWith("http"))
              .slice(0, 20) // giới hạn 20 links
    };

    sendResponse({ success: true, data });
  }

  // Ví dụ inject UI vào trang
  if (request.action === "highlight") {
    document.querySelectorAll("h1, h2").forEach(el => {
      el.style.outline = "2px solid red";
    });
    sendResponse({ success: true });
  }

  return true; // Bắt buộc nếu sendResponse async
});