#!/usr/bin/env python3
"""给镜像构建产物（_site_gh）里硬编码的根绝对路径统一加 baseurl 前缀。

背景：正文里有大量历史硬编码路径（ai-hot 晨报 ![](/assets/img/...)、
apps/showcases 的 src="/..."),它们在 jinzi.cyou 根部署下没问题，
但在 /marginalia/ 子路径下会 404。模板链接已由 relative_url 处理，
这里只兜底内容里的硬编码。

规则：
  - 只处理 href/src/poster/data-url/data-src/content 属性（双/单引号均可）
  - 只处理以单个 "/" 开头的路径（跳过 //、http(s):、data:、mailto: 等）
  - 已带 baseurl 前缀的跳过（relative_url 产出的不重复加）

用法：python3 scripts/fix-baseurl.py _site_gh /marginalia
"""
import os
import re
import sys

ATTR_RE = re.compile(
    r'(\b(?:href|src|poster|data-url|data-src|content)\s*=\s*["\'])(/[^"\'/\s][^"\']*)',
    re.IGNORECASE,
)


def fix(html, prefix):
    def repl(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith("//") or url.startswith(prefix + "/") or url == prefix:
            return m.group(0)
        return attr + prefix + url

    return ATTR_RE.sub(repl, html)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: fix-baseurl.py <site_dir> <prefix>")
    site_dir, prefix = sys.argv[1], sys.argv[2].rstrip("/")
    changed = 0
    for root, _dirs, files in os.walk(site_dir):
        for name in files:
            if not name.endswith(".html"):
                continue
            path = os.path.join(root, name)
            with open(path, encoding="utf-8") as f:
                original = f.read()
            fixed = fix(original, prefix)
            if fixed != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(fixed)
                changed += 1
    print(f"fix-baseurl: rewrote {changed} html files under {site_dir}")


if __name__ == "__main__":
    main()
