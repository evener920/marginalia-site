# 抖音收藏 → 本站视频 批量搬运

抖音的「收藏」是登录态私有数据，服务端接口有反爬墙（实测 `/aweme/favorite/`
返回 `Blocked by ArgusSecurityPlugin`），**无法从外部脚本直接抓取**。

但可以用「浏览器书签小工具」在你自己的登录态里把收藏链接导出成文本，
再用本脚本一次性生成所有视频条目。

## 第一步：导出你的抖音收藏链接

1. 电脑浏览器打开并登录抖音网页版，进入**你的收藏页**
   （个人主页 → 收藏，或类似 `https://www.douyin.com/user/...?list_name=favorite`）。
2. 把下面这整段保存为一个**书签**（书签名称随便，比如「导出抖音收藏」），
   地址栏粘这段 `javascript:...`：

```js
javascript:(async () => {
  const ids = new Set();
  const grab = () => {
    document.querySelectorAll('a[href*="/video/"]').forEach(a => {
      const m = a.href.match(/video\/(\d+)/);
      if (m) ids.add('https://www.douyin.com/video/' + m[1]);
    });
  };
  for (let i = 0; i < 300; i++) {
    grab();
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 800));
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200 && i > 5) break;
  }
  grab();
  const blob = new Blob([[...ids].join('\n'), {type: 'text/plain'}]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'douyin-favorites.txt';
  a.click();
  alert('已导出 ' + ids.size + ' 个视频链接');
})();
```

3. 在收藏页**点一下这个书签**，它会自动滚动加载、收集所有视频链接，
   并下载 `douyin-favorites.txt`。
   - 若导出数量为 0，说明当前页面不是收藏网格页，换个页面再试；
     或把页面里视频链接的真实格式发我，我调一下选择器。
   - 抖音是虚拟滚动，跑完会自动停；收藏特别多时分两三次跑也行（去重靠下面的脚本）。

## 第二步：批量生成视频条目

把 `douyin-favorites.txt` 放到仓库根目录（或任意路径），运行：

```bash
# 先预览，不真正写文件
python3 tools/import_douyin.py douyin-favorites.txt --dry-run

# 确认无误后正式生成
python3 tools/import_douyin.py douyin-favorites.txt
```

脚本会为每条链接解析出数字视频 ID，在 `_videos/` 下生成
`YYYY-MM-DD-标题.md`，**已存在的文件自动跳过**（不会重复）。

清单也支持「标题 | 链接」格式，给视频起个好标题：

```
千古名篇解读 | https://v.douyin.com/xxxx/
https://www.douyin.com/video/123456
```

## 第三步：提交上线

```bash
git add _videos/ && git commit -m "feat: 批量导入抖音收藏视频" && git push
```

Cloudflare Pages 会自动重建。站点构建期已内置抖音短链/链接解析插件，
所以存数字 ID 或整条短链都能正常内嵌播放。
