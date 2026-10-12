import { searchWiki, readWikiPage } from '../src/tools/wiki.js';
import assert from 'node:assert';

// 关键词命中
const hit = searchWiki(['奶嘴']);
assert.ok(hit.length === 1 && hit[0].slug === 'pacifier-use', '关键词命中失败');

// 多关键词排序（急疹文档命中2个词应排前）
const multi = searchWiki(['疹子', '发烧出疹']);
assert.ok(multi[0].slug === 'roseola', '多关键词排序失败');

// 月龄过滤：急疹适用 [6,36]，60 月龄应被过滤
assert.ok(searchWiki(['急疹'], 60).length === 0, '月龄过滤失败');
assert.ok(searchWiki(['急疹'], 12).length === 1, '月龄命中失败');

// 无命中
assert.ok(searchWiki(['量子力学']).length === 0, '无命中应返回空');

// 新增文档命中：刷牙/乳牙/牙膏等同义词都应命中 tooth-brushing
for (const kw of ['刷牙', '乳牙', '含氟牙膏', '蛀牙']) {
  const r = searchWiki([kw]);
  assert.ok(r.length >= 1 && r[0].slug === 'tooth-brushing', `关键词 ${kw} 未命中 tooth-brushing`);
}
// 月龄过滤：tooth-brushing 适用 [4,96]，2 月龄应被过滤
assert.ok(searchWiki(['刷牙'], 2).length === 0, 'tooth-brushing 月龄过滤失败');
assert.ok(searchWiki(['刷牙'], 12).length === 1, 'tooth-brushing 月龄命中失败');

// read 存在与不存在
assert.ok(readWikiPage('roseola')?.title.includes('幼儿急疹'), 'read 失败');
assert.ok(readWikiPage('not-exist') === undefined, '不存在的 slug 应返回 undefined');

// 0-12 月龄观察指南应逐月覆盖，且只命中对应月龄页面
for (let month = 0; month <= 12; month += 1) {
  const slug = `infant-${month}-month`;
  const page = readWikiPage(slug);
  assert.ok(page, `${month} 月龄指南未加载`);
  assert.equal(page.minMonth, month, `${slug} minMonth 错误`);
  assert.equal(page.maxMonth, month, `${slug} maxMonth 错误`);

  const results = searchWiki([`${month}月龄宝宝`], month);
  assert.ok(
    results.some((result) => result.slug === slug),
    `${month} 月龄检索未命中 ${slug}`,
  );
}

const newbornGuide = readWikiPage('infant-0-month');
for (const week of ['第1周', '第2周', '第3周', '第4周']) {
  assert.ok(
    newbornGuide?.headings.includes(week),
    `0 月龄指南缺少 ${week}`,
  );
}

// 4-12 月龄玩具指南应支持关键词检索和月龄过滤
const toyGuide = readWikiPage('toys-4-12-months');
assert.ok(toyGuide?.title.includes('玩具推荐'), '玩具指南未加载');
assert.ok(
  searchWiki(['玩具推荐'], 4).some((result) => result.slug === 'toys-4-12-months'),
  '4 月龄未命中玩具指南',
);
assert.ok(
  searchWiki(['一岁玩具'], 12).some((result) => result.slug === 'toys-4-12-months'),
  '12 月龄未命中玩具指南',
);
assert.ok(
  !searchWiki(['玩具推荐'], 3).some((result) => result.slug === 'toys-4-12-months'),
  '3 月龄不应命中玩具指南',
);

console.log('wiki tools: all assertions passed');
