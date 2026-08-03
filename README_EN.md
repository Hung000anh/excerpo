<div align="center">

# <img src="icons/icon48.png" height="36" align="center" alt="Excerpo Icon" /> Excerpo
**Automated multi-platform text/novel extractor and downloader tool**

[![Version](https://img.shields.io/badge/version-1.26.3-blue.svg)](#)
[![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%20%7C%20Cốc%20Cốc%20%7C%20Brave%20%7C%20Opera%20%7C%20Vivaldi-brightgreen.svg)](#)
[![OS](https://img.shields.io/badge/OS-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#)
[![License](https://img.shields.io/badge/license-Personal%20Use-red.svg)](#)

---
[Tiếng Việt](README.md) | [English](README_EN.md) | [简体中文](README_ZH.md)
---

</div>

## 🌟 Introduction
**Excerpo** (Latin for "extract", "gather") is a powerful browser extension specifically designed to automatically collect text and novel contents from leading reading websites.

The primary purpose of this tool is to serve personal offline storage, language processing technical research, and automatic translation support.

## 📷 Screenshots

| 🎯 Main Interface (Crawl Data) | ⚡ Chapter List (Background Download) |
| :---: | :---: |
| <img src="images/anhcao.png" width="400" alt="Crawl interface"> | <img src="images/image.png" width="400" alt="Chapter list"> |
| **⏳ Background Queue (Progress Management)** | **⚙️ Settings Panel (Formats & Folders)** |
| <img src="images/z7927269022338_77ce97ec5bec0ea8be67eb4816ea4a4b.jpg" width="400" alt="Queue list"> | <img src="images/z7927269071829_85bef00b8acf6c77b2f30d36422cfd45.jpg" width="400" alt="Settings"> |
| **☕ Support Development (Donate)** | **⚠️ Terms & Disclaimer** |
| <img src="images/image copy 3.png" width="400" alt="Donate"> | <img src="images/z7927269122181_8c444270eec616307d21d0df4c4ab569.jpg" width="400" alt="Terms"> |


## 🚀 Features
* **Multi-platform:** Supports scanning and downloading from a wide range of online reading platforms grouped by country:
  - <img src="https://flagcdn.com/w20/cn.png" width="16" alt="CN"> **China (Simplified):** `17k`, `22biqu`, `23qb`, `52shuku`, `69shuba`, `69shumi`, `biquge`, `xbiquge`, `bookqq`, `fanqienovel`, `hetushu`, `ihuaben`, `ixdzs8`, `jjwxc`, `novel543`, `powanjuan`, `qidian`, `shubaow`, `shuhaige`, `uukanshu`, `xbanxia`.
  - <img src="https://flagcdn.com/w20/tw.png" width="16" alt="TW"> **Taiwan (Traditional):** `69shuba.tw`, `czbooks`, `po18`, `sto9`, `sto55`, `ttkan`, `twkan`.
  - <img src="https://flagcdn.com/w20/jp.png" width="16" alt="JP"> **Japan:** `kakuyomu`, `pixiv`, `syosetu`, `syosetu.org`.
  - <img src="https://flagcdn.com/w20/us.png" width="16" alt="US"> **US / Global:** `ao3`, `cardboardtranslation`, `fictionpress`, `foxaholic`, `freewebnovel`, `lnmtl`, `noveldex`, `novelight`, `novellunar`, `royalroad`, `scribblehub`.
  - <img src="https://flagcdn.com/w20/tr.png" width="16" alt="TR"> **Turkey:** `fenrirscans`.
  - <img src="https://flagcdn.com/w20/ru.png" width="16" alt="RU"> **Russia:** `ranobelib`.
  - <img src="https://flagcdn.com/w20/br.png" width="16" alt="BR"> **Brazil:** `centralnovel`, `phoenixnovels`.
  - <img src="https://flagcdn.com/w20/id.png" width="16" alt="ID"> **Indonesia:** `meionovel`, `novelgo`, `wbnovel`.
  - <img src="https://flagcdn.com/w20/fr.png" width="16" alt="FR"> **France:** `chireads`.
* **Auto-Bypass Rate Limit & Captcha:** Integrated background OCR (Tesseract.js) to read captchas during data crawling, alongside a smart delay algorithm to avoid IP blocking.
* **Background Multithreaded Download:** Operates independently via Service Worker in the background. You can browse websites normally or close tabs; the tool will patiently download thousands of chapters without failure.
* **Flexible File & Format Customization:** Allows extracting to standard text format `.txt`, Word documents `.docx`, or lightweight `.epub` e-books. Fully supports dynamic filename patterns using keys like `{index}` (chapter index number) and `{title}` (chapter title) (e.g. `chuong-{index}_{title}` -> `chuong-1_Khai_thien`, or `Chapter {index} - {title}` -> `Chapter 1 - Khai thien`).

## ⚙️ Installation Guide
Since this is a developer version, you can easily install this utility via **Developer Mode** on your browser.
1. Click the green `Code` button -> **Download ZIP** and extract the folder on your computer.
   <br><img src="images/image1.png" width="400" alt="Download ZIP illustration">
2. Open the browser and visit the Extension Management page (or click one of the links below):
   * Chrome: `chrome://extensions/`
   * Edge: `edge://extensions/`
   * Coc Coc: `coccoc://extensions/`
   <br><img src="images/image3.png" width="400" alt="Extension management page">
3. Turn on **Developer mode** in the top-right corner.
   <br><img src="images/image2.png" width="400" alt="Turn on Developer Mode">
4. Select **Load unpacked** and choose the extracted Excerpo folder.
   <br><img src="images/image4.png" width="400" alt="Load unpacked extension">
5. Click on the extension icon and select to pin the Excerpo extension.
   <br><img src="images/image6.png" width="400" alt="Pin Excerpo extension">
6. Enjoy! Good luck!
   <br><img src="images/image7.png" width="400" alt="Enjoy">

## ⚠️ Recommended Browser Settings (Important)
To allow the tool to automatically save thousands of files without hanging your browser with download dialogs:
* Go to `chrome://settings/downloads`.
* Select the root folder to save files (Excerpo will automatically create a subfolder with the book title inside this root folder).
* **TURN OFF** the option: *"Ask where to save each file before downloading"*.

<div align="center">
  <img src="images/image5.png" width="800" alt="Settings to disable download dialog">
</div>

## 📖 How to Use

1. **Paste Novel Link**: Go to the source site, copy the novel details page URL. Paste it into the input box on Excerpo and click **Submit**.
<div align="center">
  <img src="images/z7927269071833_b959820cf9183640c0d4d359a7e89863.jpg" width="500" alt="Novel Preview and Get Chapters">
</div>

2. **Get Chapter List**: After the extension scans the novel metadata, click **Get chapter list** to fetch and show all chapters.
<div align="center">
  <img src="images/image copy.png" width="500" alt="Novel Preview and Get Chapters">
</div>

3. **Start Background Download**: Select chapters you want to download (or use **Quick select** box by typing range, e.g. `1-50, 60-70`), and then click **Download selected chapters (Background)**.
<div align="center">
  <img src="images/image copy 2.png" width="500" alt="Novel Preview and Get Chapters">
</div>

4. **Manage Queue**: Track the progress of multithreaded downloads for each chapter in the **Queue** tab (📋). You can stop or cancel the job at any time.

## 💖 Thanks to our Donors
Sincere thanks for the contributions and support from you to help the project continue to develop!

| Donor Name | Amount | Date of Donation |
| :--- | :---: | :---: |
| N*** T*** H*** G**** | 100,000 VND | 24/07/2026 03:27:00 |
| H*** T**** | 50,000 VND | 24/07/2026 16:48:01 |

## 👨‍💻 Code Contributors
We sincerely appreciate the amazing code contributions to improve this extension:
| Avatar | Name | GitHub |
| :---: | :--- | :--- |
| <img src="https://avatars.githubusercontent.com/u/151985750?v=4" width="30" style="border-radius: 50%;"> | HuskyDG | [@vincentng295](https://github.com/vincentng295) |
| <img src="https://avatars.githubusercontent.com/u/64477572?v=4" width="30" style="border-radius: 50%;"> | Trương Hải Anh Thắng | [@arata1592003](https://github.com/arata1592003) |
| <img src="https://avatars.githubusercontent.com/u/667857?v=4" width="30" style="border-radius: 50%;"> | Anupam Mediratta | [@anupamme](https://github.com/anupamme) |

## ⚖️ Terms & Disclaimer
Excerpo is provided **for free for personal use**. To sustain development costs, when you click the "Submit" button to start downloading, the tool will automatically open a hidden ad tab under the background (which automatically closes after a few seconds). Thank you for your support and understanding!

Users bear full legal responsibility for publicly sharing downloaded data.
> If you need to download locked (VIP) chapters, please **purchase the chapters** on the original website to support the author. This tool only extracts contents that your browser has reading permissions for.

---
*Developed by [Hung000anh](https://github.com/Hung000anh) - ☕ Thank you for your companionship!*
