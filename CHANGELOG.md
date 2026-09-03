# Changelog

All notable changes to the **Excerpo** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning (`MAJOR.FEAT.FIX`).

---

## [Unreleased]

### Added
- Add support for the `alicesw.tw` source, including metadata, cover images, chapter lists, and chapter content extraction.

---

## [1.26.4] - 2026-08-04

### Added
- Add support for custom content extractor (`customExtract`) directly in modular source configuration files.

### Changed
- Decouple and encapsulate custom HTML scraping logic for Hetushu and Pixiv from `source-utils.js` into their respective source files.
- Return Noveldex extractor to standard layout inside `source-utils.js` for robust performance.

### Fixed
- Improve Noveldex chapter content extraction, sanitizing hidden zero-width spaces, and filtering redundant UI comment elements.

---

## [1.26.3] - 2026-08-03

### Added
- Add release workflow skill (`.claude/skills/release`) to automate version management, PRs, and Issues via GitHub CLI (`gh`).
- Add comprehensive `CHANGELOG.md` file in English.

### Changed
- Sync version badge (`1.26.3`) across all README files (`README.md`, `README_EN.md`, `README_ZH.md`).
- Update project guidelines in `CLAUDE.md`.

---

## [1.26.2] - 2026-08-01

### Fixed
- Fix selectors for Syosetu (`ncode.syosetu.com`) and Hameln (`syosetu.org`) (#70).

---

## [1.26.1] - 2026-07-31

### Fixed
- Handle chapter pagination for `69shuba.tw` (#69).

---

## [1.26.0] - 2026-07-29

### Added
- Add support for Pixiv oneshot works and enhance metadata extraction (#67).
- Add support for `69shuba.tw` source (#66).

---

## [1.25.0] - 2026-07-28

### Added
- Add support for `czbooks.net` source and fix layout issues (#65).

---

## [1.24.0] - 2026-07-27

### Added
- Add extractors for Noveldex, Cardboard Translation, NovelLight, and ScribbleHub (#64).

---

## [1.23.1] - 2026-07-25

### Security & Fixed
- Add URL validation in `popup.js` to prevent SSRF vulnerabilities (#62).

---

## [1.23.0] - 2026-07-24

### Fixed
- Fix `uukanshu` 403 Forbidden error using background tab scraping strategy (#60).

---

## [1.22.0] - 2026-07-18

### Added
- Support full i18n internationalization across extension UI and source parsing (#58).

---

## [1.21.0] - 2026-07-14

### Added
- Add support for LNMTL, ChiReads, MeiNovel, NovelGo, and WBNovel sources (#57).

---

## [1.20.0] - 2026-07-11

### Added
- Add Chinese source support for `ihuaben.com` (#56).

---

## [1.19.0] - 2026-07-10

### Added
- Add support for Brazilian sources `centralnovel.com` and `phoenixnovels.com.br` (#54).
- Add support for Russian source `ranobelib.me` (#52).

---

## [1.17.0] - 2026-07-08

### Added
- Add support for `shuhaige.net`, `powanjuan.cc`, and `fenrirscans.com` sources (#48).
- Add support for `fictionpress.com` and `foxaholic.com` sources (#46).
- Add support for `novellunar.com` source (#42).
- Support both span-based and raw text DOM structures on `jjwxc.net` (#40).

### Fixed
- Resolve `bookName` selector issue on `novellunar.com` (#44).

---

## [1.13.0] - 2026-07-06

### Added
- Implement `.epub` export format support (#38).

---

## [1.12.0] - 2026-06-29

### Added
- Add support for `sto55.com`, `sto9.org`, `twkan.com`, and `ttkan.co` sources (#36).

---

## [1.8.0] - 2026-06-28

### Added
- Add PO18 Taiwan source support (#33, #34).

---

## [1.7.0] - 2026-06-26

### Added
- Add support for AO3, Xbiquge, Shubaow, and 23qb with popup UX improvements (#30).

---

## [1.3.0] - 2026-06-24

### Added
- Add support for `syosetu.org` (Hameln) source (#29).
- Add support for `xbanxia.cc` and `69shumi.net` sources (#27).

---

## [1.1.0] - 2026-06-19

### Added
- Implement parallel OCR pool & support for `hetushu.com` (#25).
- Add support for `book.qq.com` source (#23).
- Add support for `ixdzs8.com` source (#20).
- Add support for `pixiv.net` novel series (#18).
- Add support for `ncode.syosetu.com` (#16).
- Add support for `kakuyomu.jp` (#14).

---

## [1.0.0] - 2026-06-12

### Added
- Initial release under **Excerpo** rebrand (#2).
- Support for automatic chapter content retry mechanism (#4).
- Add initial source definitions for `69shuba` (#6) and `novel543` (#8).
