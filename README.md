<div align="center">

# <img src="icons/icon48.png" height="36" align="center" alt="Excerpo Icon" /> Excerpo
**Công cụ trích xuất và tải truyện/text tự động từ đa nền tảng**

[![Version](https://img.shields.io/badge/version-1.26.4-blue.svg)](#)
[![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%20%7C%20Cốc%20Cốc%20%7C%20Brave%20%7C%20Opera%20%7C%20Vivaldi-brightgreen.svg)](#)
[![OS](https://img.shields.io/badge/OS-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#)
[![License](https://img.shields.io/badge/license-Personal%20Use-red.svg)](#)

---
[Tiếng Việt](README.md) | [English](README_EN.md) | [简体中文](README_ZH.md)
---

</div>

## 🌟 Giới thiệu
**Excerpo** (tiếng Latin: "Trích xuất", "Gặt hái") là một tiện ích mở rộng (Browser Extension) mạnh mẽ, được thiết kế chuyên biệt để tự động thu thập văn bản, nội dung truyện chữ từ các trang web đọc truyện hàng đầu. 

Mục đích chính của công cụ là phục vụ cho nhu cầu lưu trữ offline cá nhân, nghiên cứu kỹ thuật xử lý ngôn ngữ và hỗ trợ dịch thuật tự động.

## 📷 Ảnh chụp màn hình

| 🎯 Giao diện chính (Cào dữ liệu) | ⚡ Danh sách chương (Tải ngầm) |
| :---: | :---: |
| <img src="images/anhcao.png" width="400" alt="Giao diện Cào"> | <img src="images/image.png" width="400" alt="Danh sách chương"> |
| **⏳ Hàng đợi tải ngầm (Quản lý tiến độ)** | **⚙️ Bảng Cài đặt (Định dạng & Thư mục)** |
| <img src="images/z7927269022338_77ce97ec5bec0ea8be67eb4816ea4a4b.jpg" width="400" alt="Hàng đợi tải ngầm"> | <img src="images/z7927269071829_85bef00b8acf6c77b2f30d36422cfd45.jpg" width="400" alt="Cài đặt"> |
| **☕ Hỗ trợ phát triển (Ủng hộ tác giả)** | **⚠️ Điều khoản & Lưu ý sử dụng** |
| <img src="images/z7927269040101_501b9119404e391aeb70baef882fed49.jpg" width="400" alt="Ủng hộ tác giả"> | <img src="images/z7927269122181_8c444270eec616307d21d0df4c4ab569.jpg" width="400" alt="Lưu ý"> |


## 🚀 Tính năng nổi bật
* **Đa nền tảng:** Hỗ trợ quét và tải mượt mà từ hàng loạt nền tảng đọc truyện trực tuyến, chia theo các quốc gia:
  - <img src="https://flagcdn.com/w20/cn.png" width="16" alt="CN"> **Trung Quốc (Giản thể):** `17k`, `22biqu`, `23qb`, `52shuku`, `69shuba`, `69shumi`, `biquge`, `xbiquge`, `bookqq`, `fanqienovel`, `hetushu`, `ihuaben`, `ixdzs8`, `jjwxc`, `novel543`, `powanjuan`, `qidian`, `shubaow`, `shuhaige`, `uukanshu`, `xbanxia`.
  - <img src="https://flagcdn.com/w20/tw.png" width="16" alt="TW"> **Đài Loan (Phồn thể):** `69shuba.tw`, `alicesw`, `czbooks`, `po18`, `sto9`, `sto55`, `ttkan`, `twkan`. Ví dụ AliceSW: `https://www.alicesw.tw/novel/53104.html`.
  - <img src="https://flagcdn.com/w20/jp.png" width="16" alt="JP"> **Nhật Bản:** `kakuyomu`, `pixiv`, `syosetu`, `syosetu.org`.
  - <img src="https://flagcdn.com/w20/us.png" width="16" alt="US"> **Âu Mỹ / Toàn cầu:** `ao3`, `cardboardtranslation`, `fictionpress`, `foxaholic`, `freewebnovel`, `lnmtl`, `noveldex`, `novelight`, `novellunar`, `royalroad`, `scribblehub`.
  - <img src="https://flagcdn.com/w20/tr.png" width="16" alt="TR"> **Thổ Nhĩ Kỳ:** `fenrirscans`.
  - <img src="https://flagcdn.com/w20/ru.png" width="16" alt="RU"> **Nga:** `ranobelib`.
  - <img src="https://flagcdn.com/w20/br.png" width="16" alt="BR"> **Brazil:** `centralnovel`, `phoenixnovels`.
  - <img src="https://flagcdn.com/w20/id.png" width="16" alt="ID"> **Indonesia:** `meionovel`, `novelgo`, `wbnovel`.
  - <img src="https://flagcdn.com/w20/fr.png" width="16" alt="FR"> **Pháp:** `chireads`.
* **Auto-Bypass Rate Limit & Captcha:** Tích hợp OCR (Tesseract.js) chạy ngầm để đọc và khi cào dữ liệu, cũng như thuật toán delay thông minh tránh bị chặn IP.
* **Tải ngầm đa luồng:** Hoạt động độc lập bằng Service Worker dưới nền. Bạn có thể lướt web bình thường, tắt tab, tool vẫn kiên nhẫn tải hàng ngàn chương mà không lo đứt gãy.
* **Tuỳ biến File & Định dạng linh hoạt:** Cho phép trích xuất ra định dạng văn bản chuẩn `.txt`, tệp Word `.docx` hoặc sách điện tử `.epub` cực nhẹ. Hỗ trợ tự do cấu hình quy tắc đặt tên file bằng các từ khóa động như `{index}` (số thứ tự chương) và `{title}` (tiêu đề chương) (Ví dụ: `chuong-{index}_{title}` -> `chuong-1_Khai_thien`, hoặc `Chương {index} - {title}` -> `Chương 1 - Khai thiên`).

## ⚙️ Hướng dẫn cài đặt
Vì đây là phiên bản dành cho nhà phát triển, bạn có thể dễ dàng cài đặt tiện ích này thông qua chế độ **Developer Mode** của trình duyệt.
1. Nhấn nút màu xanh `Code` -> **Download ZIP** và giải nén thư mục ra máy tính.
   <br><img src="images/image1.png" width="400" alt="Minh họa Download ZIP">
2. Mở trình duyệt, truy cập vào trang Quản lý tiện ích (hoặc nhấp vào 1 trong các link dưới):
   * Chrome: `chrome://extensions/`
   * Edge: `edge://extensions/`
   * Cốc Cốc: `coccoc://extensions/`
   <br><img src="images/image3.png" width="400" alt="Trang quản lý tiện ích">
3. Bật **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
   <br><img src="images/image2.png" width="400" alt="Bật Developer Mode">
4. Chọn **Tải tiện ích đã giải nén (Load unpacked)** và trỏ tới thư mục Excerpo bạn vừa giải nén.
   <br><img src="images/image4.png" width="400" alt="Tải tiện ích giải nén">
5. Chọn vào biểu tượng tiện ích mở rộng và chọn ghim tiện ích Excerpo.
   <br><img src="images/image6.png" width="400" alt="Ghim tiện ích Excerpo">
6. Trải nghiệm thôi. Chúc các bạn may mắn
   <br><img src="images/image7.png" width="400" alt="Trải nghiệm thôi">
## ⚠️ Khuyến nghị cài đặt Trình duyệt (Quan trọng)
Để công cụ có thể tự động lưu hàng ngàn tệp tin mà không bị treo máy bởi các hộp thoại hỏi vòng lặp:
* Đi tới `chrome://settings/downloads`.
* Chọn thư mục gốc để lưu tệp tin (Excerpo sẽ tự động tạo thư mục con theo tên truyện bên trong thư mục gốc này).
* **TẮT** tuỳ chọn: *"Hỏi vị trí lưu từng tệp trước khi tải xuống"*.

<div align="center">
  <img src="images/image5.png" width="800" alt="Cài đặt tắt hộp thoại download">
</div>

## 📖 Hướng dẫn sử dụng

1. **Dán link truyện**: Truy cập trang web đọc truyện nguồn, sao chép URL trang giới thiệu truyện. Dán link vào thanh nhập liệu trên Excerpo và nhấn **Gửi**.
<div align="center">
  <img src="images/z7927269071833_b959820cf9183640c0d4d359a7e89863.jpg" width="500" alt="Giao diện xem trước truyện và lấy chương">
</div>

2. **Lấy danh sách chương**: Sau khi tiện ích quét xong thông tin tác phẩm, nhấn nút **Lấy danh sách chapter** để hiển thị toàn bộ các chương.
<div align="center">
  <img src="images/image copy.png" width="500" alt="Giao diện xem trước truyện và lấy chương">
</div>

3. **Bắt đầu tải ngầm**: Tự do lựa chọn các chương muốn tải (hoặc dùng thanh **Chọn nhanh** bằng cách nhập dải số, ví dụ `1-50, 60-70`), sau đó nhấn nút **Tải các chương đã chọn (Chạy ngầm)**.
<div align="center">
  <img src="images/image copy 2.png" width="500" alt="Giao diện xem trước truyện và lấy chương">
</div>

4. **Quản lý hàng đợi**: Theo dõi tiến độ tải đa luồng của từng chương truyện tại tab **Hàng đợi** (📋). Bạn có thể bấm nút dừng hoặc huỷ bất cứ lúc nào.



## 💖 Cảm ơn những người ủng hộ (Donors)
Chân thành cảm ơn những đóng góp và ủng hộ từ các bạn để dự án tiếp tục phát triển!

| Tên người ủng hộ | Số tiền | Ngày ủng hộ |
| :--- | :---: | :---: |
| N*** T*** H*** G**** | 100,000 VNĐ | 24/07/2026 03:27:00 |
| H*** T**** | 50,000 VNĐ | 24/07/2026 16:48:01 |\
| N***** H*** T****| 50,000 VNĐ | 31/08/2026 10:48:00|\ 

## 👨‍💻 Người đóng góp mã nguồn (Contributors)
Cảm ơn những đóng góp tuyệt vời từ cộng đồng để giúp công cụ ngày càng hoàn thiện hơn:
| Avatar | Tên | GitHub |
| :---: | :--- | :--- |
| <img src="https://avatars.githubusercontent.com/u/151985750?v=4" width="30" style="border-radius: 50%;"> | HuskyDG | [@vincentng295](https://github.com/vincentng295) |
| <img src="https://avatars.githubusercontent.com/u/64477572?v=4" width="30" style="border-radius: 50%;"> | Trương Hải Anh Thắng | [@arata1592003](https://github.com/arata1592003) |
| <img src="https://avatars.githubusercontent.com/u/667857?v=4" width="30" style="border-radius: 50%;"> | Anupam Mediratta | [@anupamme](https://github.com/anupamme) |

## ⚖️ Điều khoản & Miễn trừ trách nhiệm
Excerpo được cung cấp **miễn phí cho mục đích sử dụng cá nhân**. Để duy trì chi phí phát triển, khi bạn nhấn nút "Gửi" để bắt đầu tải truyện, công cụ sẽ tự động nhảy sang một tab quảng cáo mới (tab này sẽ tự động đóng lại sau 60 giây). Rất mong sự thông cảm và ủng hộ từ các bạn!

Người dùng chịu trách nhiệm hoàn toàn về các hành vi chia sẻ công cộng dữ liệu tải về.
> Nếu bạn muốn tải các chương truyện khóa (VIP), xin vui lòng **mua chương** để tôn trọng chất xám của tác giả gốc trên website trước. Công cụ này chỉ trích xuất những gì màn hình của bạn được cấp quyền hiển thị.

---
*Phát triển bởi [Hung000anh](https://github.com/Hung000anh) - ☕ Cảm ơn bạn đã đồng hành!*
