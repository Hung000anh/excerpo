<div align="center">

# 📖 Excerpo
**Công cụ trích xuất và tải truyện/text tự động từ đa nền tảng**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)
[![Platform](https://img.shields.io/badge/platform-Chrome%20|%20Edge%20|%20Cốc%20Cốc-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/license-Personal%20Use-red.svg)](#)

</div>

## 🌟 Giới thiệu
**Excerpo** (tiếng Latin: "Trích xuất", "Gặt hái") là một tiện ích mở rộng (Browser Extension) mạnh mẽ, được thiết kế chuyên biệt để tự động thu thập văn bản, nội dung truyện chữ từ các trang web đọc truyện hàng đầu. 

Mục đích chính của công cụ là phục vụ cho nhu cầu lưu trữ offline cá nhân, nghiên cứu kỹ thuật xử lý ngôn ngữ và hỗ trợ dịch thuật tự động.

## 📷 Ảnh chụp màn hình

| 🎯 Giao diện chính (Cào dữ liệu) | ⏳ Hàng đợi tải ngầm (Quản lý tiến độ) |
| :---: | :---: |
| <img src="images/z7927269071833_b959820cf9183640c0d4d359a7e89863.jpg" width="400" alt="Giao diện Cào"> | <img src="images/z7927269022338_77ce97ec5bec0ea8be67eb4816ea4a4b.jpg" width="400" alt="Hàng đợi tải ngầm"> |
| **⚙️ Bảng Cài đặt (Định dạng & Thư mục)** | **⚠️ Điều khoản & Lưu ý sử dụng** |
| <img src="images/z7927269071829_85bef00b8acf6c77b2f30d36422cfd45.jpg" width="400" alt="Cài đặt"> | <img src="images/z7927269122181_8c444270eec616307d21d0df4c4ab569.jpg" width="400" alt="Lưu ý"> |

## 🚀 Tính năng nổi bật
* **Đa nền tảng:** Hỗ trợ quét và tải mượt mà từ nhiều website lớn như: `17k`, `qidian`, `jjwxc`, `biquge`, `52shuku`, `fanqienovel`, `uukanshu`...
* **Auto-Bypass Rate Limit & Captcha:** Tích hợp OCR (Tesseract.js) chạy ngầm để đọc và xử lý captcha khi cào dữ liệu, cũng như thuật toán delay thông minh tránh bị chặn IP.
* **Tải ngầm đa luồng:** Hoạt động độc lập bằng Service Worker dưới nền. Bạn có thể lướt web bình thường, tắt tab, tool vẫn kiên nhẫn tải hàng ngàn chương mà không lo đứt gãy.
* **Tuỳ biến File & Định dạng linh hoạt:** Cho phép trích xuất ra định dạng văn bản chuẩn `.txt` hoặc tệp Word `.docx` cực nhẹ. Hỗ trợ tự do cấu hình quy tắc đặt tên file (VD: `chuong-{index}_{title}`).

## ⚙️ Hướng dẫn cài đặt
Vì đây là phiên bản dành cho nhà phát triển, bạn có thể dễ dàng cài đặt tiện ích này thông qua chế độ **Developer Mode** của trình duyệt.
1. Nhấn nút màu xanh `Code` -> **Download ZIP** và giải nén thư mục ra máy tính.
2. Mở trình duyệt, truy cập vào trang Quản lý tiện ích:
   * Chrome: `chrome://extensions/`
   * Edge: `edge://extensions/`
   * Cốc Cốc: `coccoc://extensions/`
3. Bật **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
4. Chọn **Tải tiện ích đã giải nén (Load unpacked)** và trỏ tới thư mục Excerpo bạn vừa giải nén.

## ⚠️ Khuyến nghị cài đặt Trình duyệt (Quan trọng)
Để công cụ có thể tự động lưu hàng ngàn tệp tin mà không bị treo máy bởi các hộp thoại hỏi vòng lặp:
* Đi tới `chrome://settings/downloads`.
* Chọn thư mục gốc để lưu tệp tin (Excerpo sẽ tự động tạo thư mục con theo tên truyện bên trong thư mục gốc này).
* **TẮT** tuỳ chọn: *"Hỏi vị trí lưu từng tệp trước khi tải xuống"*.

<!-- BẠN THÊM LINK ẢNH MINH HỌA CÀI ĐẶT TRÌNH DUYỆT VÀO BÊN DƯỚI -->
![Cài đặt tắt hộp thoại download](https://via.placeholder.com/800x400.png?text=Hinh+Anh+Cai+Dat+Trinh+Duyet+(Thay+link+vao+day))

## ⚖️ Điều khoản & Miễn trừ trách nhiệm
Excerpo được xây dựng **100% phi thương mại** và không phục vụ mục đích phân phối lại tác phẩm có bản quyền. Người dùng chịu trách nhiệm hoàn toàn về các hành vi chia sẻ công cộng dữ liệu tải về.
> Nếu bạn muốn tải các chương truyện khóa (VIP), xin vui lòng **mua chương** để tôn trọng chất xám của tác giả gốc trên website trước. Công cụ này chỉ trích xuất những gì màn hình của bạn được cấp quyền hiển thị.

---
*Phát triển bởi [Hung000anh](https://github.com/Hung000anh) - ☕ Cảm ơn bạn đã đồng hành!*
