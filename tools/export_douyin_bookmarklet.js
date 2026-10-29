// 抖音收藏导出书签（Marginalia 用）——「以前的办法」原始版本
//
// 用法：
//   1. 在浏览器里新建一个书签，把下面这整行（以 javascript: 开头）粘进「网址/URL」框，保存。
//   2. 打开并登录抖音收藏页：
//        https://www.douyin.com/user/self?showTab=favorite_collection
//   3. 点一下这个书签 → 它会自动滚动到底收集全部视频链接，并下载 douyin-favorites.txt。
//
// 注意：抖音是 SPA，请等页面视频加载出来再点书签；收藏很多时点一次可能只抓到当前已渲染的，
//       可多点一次直到 alert 数量不再增加。
// 下载到的 douyin-favorites.txt 交给 import_douyin.py 即可（自动跳过已存在的）。

javascript:%28function%28%29%7Bvar%20ids%3Dnew%20Set%28%29%3Bfunction%20grab%28%29%7Bdocument.querySelectorAll%28%27a%5Bhref%2A%3D%22%2Fvideo%2F%22%5D%27%29.forEach%28function%28a%29%7Bvar%20m%3Da.href.match%28%2Fvideo%5C%2F%28%5Cd%2B%29%2F%29%3Bif%28m%29ids.add%28%27https%3A%2F%2Fwww.douyin.com%2Fvideo%2F%27%2Bm%5B1%5D%29%3B%7D%29%3B%7Dasync%20function%20run%28%29%7Bfor%28var%20i%3D0%3Bi%3C300%3Bi%2B%2B%29%7Bgrab%28%29%3Bvar%20sc%3Ddocument.scrollingElement%7C%7Cdocument.body%3Bsc.scrollTop%3Dsc.scrollHeight%3Bawait%20new%20Promise%28function%28r%29%7BsetTimeout%28r%2C800%29%3B%7D%29%3Bif%28sc.scrollTop%2Bwindow.innerHeight%3E%3Dsc.scrollHeight-200%26%26i%3E5%29break%3B%7Dgrab%28%29%3Bvar%20b%3Dnew%20Blob%28%5BArray.from%28ids%29.join%28%27%5Cn%27%29%5D%2C%7Btype%3A%27text%2Fplain%27%7D%29%3Bvar%20a%3Ddocument.createElement%28%27a%27%29%3Ba.href%3DURL.createObjectURL%28b%29%3Ba.download%3D%27douyin-favorites.txt%27%3Ba.click%28%29%3Balert%28%27%E5%B7%B2%E5%AF%BC%E5%87%BA%20%27%2Bids.size%2B%27%20%E4%B8%AA%E8%A7%86%E9%A2%91%E9%93%BE%E6%8E%A5%27%29%3B%7Drun%28%29%3B%7D%29%28%29%3B
