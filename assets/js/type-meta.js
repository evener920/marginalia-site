/* 全站内容类型元数据 —— 搜索(search.js) 与归档(archive.js) 共用，单一来源。
 * 新增栏目时：1) 在 _includes/archive_items.html 加一个 for 块；
 *             2) 在此 META 补一条 {label, cls}，并加入 ORDER 即可。 */
window.MG_TYPES = {
  META: {
    'note':     { label: '批注',     cls: 'note' },
    'ai-hot':   { label: 'AI Hot',  cls: 'hot' },
    'video':    { label: '视频',     cls: 'video' },
    'doc':      { label: '文档',     cls: 'doc' },
    'shujian':  { label: '书笺',     cls: 'shujian' },
    'poetry':   { label: '诗词',     cls: 'poetry' },
    'songs':    { label: '歌本',     cls: 'songs' },
    'dushu':    { label: '读书',     cls: 'dushu' },
    'game':     { label: '游戏',     cls: 'game' },
    'showcase': { label: 'Showcase', cls: 'show' },
    'app':      { label: 'App',      cls: 'app' }
  },
  ORDER: ['note', 'ai-hot', 'video', 'doc', 'shujian', 'poetry', 'songs', 'dushu', 'game', 'showcase', 'app']
};
