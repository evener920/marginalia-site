# 抖音收藏 → 本站视频 批量搬运

抖音的「收藏」是登录态私有数据，服务端接口有反爬墙（实测 `/aweme/favorite/`
返回 `Blocked by ArgusSecurityPlugin`），**无法从外部脚本直接抓取**。

但可以用「浏览器书签小工具」在你自己的登录态里把收藏链接导出成文本，
再用本脚本一次性生成所有视频条目。

## 第一步：导出你的抖音收藏链接

### 1. 进入收藏页
电脑浏览器打开并登录 **抖音网页版（douyin.com）**，通过 UI 进入**你的收藏**：
右上角头像 → 个人主页 → 「收藏」标签，看到一排视频网格即可。
（收藏特别多时页面是「无限滚动」，下面书签会自动滚到底加载。）

### 方式 A：Tampermonkey 用户脚本（推荐，最省事）

1. 安装扩展 **Tampermonkey**（油猴）：从浏览器官方商店装（Chrome / Edge / Firefox 插件商店搜 "Tampermonkey"，认准蓝黑图标官方版）。
2. 打开本仓库的 `tools/export_douyin_favorites.user.js`，
   - 用浏览器打开该文件 → Tampermonkey 会弹出「是否安装」→ 点安装；或
   - 把文件内容复制，在 Tampermonkey 里「新建脚本」粘贴保存。
3. 回到抖音收藏页，右下角会出现红色「**导出抖音收藏**」按钮，点一下即自动滚动收集并下载 `douyin-favorites.txt`。

> 该脚本只在 `douyin.com` 页面注入一个按钮，不读取你的密码、不联网上传，纯本地导出，账号安全。

### 方式 B：书签小工具（不想装扩展时用）

书签名称随意（如「导出抖音收藏」），**网址/URL 一栏粘这段**（它是 `javascript:` 开头的一整行）：

```
javascript:(async()=>{const ids=new Set();const grab=()=>{document.querySelectorAll('a[href*="/video/"]').forEach(a=>{const m=a.href.match(/video\/(\d+)/);if(m)ids.add('https://www.douyin.com/video/'+m[1]);});};for(let i=0;i<300;i++){grab();const sc=document.scrollingElement||document.body;sc.scrollTop=sc.scrollHeight;await new Promise(r=>setTimeout(r,800));if(sc.scrollTop+window.innerHeight>=sc.scrollHeight-200&&i>5)break;}grab();const blob=new Blob([...ids].join('\n'),{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='douyin-favorites.txt';a.click();alert('已导出 '+ids.size+' 个视频链接');})();
```

> **添加书签的常见坑（必看）**
> - **`javascript:` 会被浏览器吃掉**：Chrome 在书签 URL 框粘贴 `javascript:...` 时，常把前缀 `javascript:` 自动删掉，导致点书签无效。
>   解决：先在 URL 框手打 `javascript:`（含冒号），再把后面整段代码粘到它**后面**；或者先粘进「名称」框再剪切到 URL 框。
> - **要放在书签栏上**：部分浏览器只允许书签栏上的书签以 bookmarklet 方式运行，收藏菜单里的可能被拦截。
> - 存好后，在收藏页点一下该书签即可运行。

### 3. 点书签，导出
在收藏页**点一下这个书签** → 它会自动向下滚动、收集所有 `www.douyin.com/video/<id>` 链接，
最后弹窗「已导出 N 个视频链接」并下载 `douyin-favorites.txt`。

- 若弹窗数量是 **0**：说明当前页不是收藏网格（或视频卡片链接格式不同）。把页面里任意一个视频链接的真实样子发我，我调选择器。
- 若数量**偏少**：页面可能没滚到底。手动向下滚一下加载更多，再点一次书签（脚本去重，重复不影响）。
- 收藏极多时分两三次跑即可，最终合并到一个 txt。

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
