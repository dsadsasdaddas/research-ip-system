const path = require('path')
const { search } = require(path.resolve(__dirname, '..', 'native', 'search-engine', 'index.node'))

const DOC_COUNT = 10000
const TARGET_ID = 7777
const MAX_SEARCH_MS = 1000

const docs = []

for (let i = 1; i <= DOC_COUNT; i += 1) {
  if (i === TARGET_ID) {
    docs.push({
      id: TARGET_ID,
      type: 'paper',
      title: '基于深度学习的科研成果智能管理方法研究',
      content: '深度学习 科研成果 管理 计算机学报 王悦',
    })
    continue
  }

  docs.push({
    id: i,
    type: i % 3 === 0 ? 'patent' : i % 3 === 1 ? 'paper' : 'copyright',
    title: `科研成果测试数据 ${i}`,
    content: `知识产权 管理系统 专利 论文 软著 转化 费用 提醒 审计 部门 ${i}`,
  })
}

const docsJson = JSON.stringify(docs)

const start = process.hrtime.bigint()
const results = JSON.parse(search(docsJson, '深度学习'))
const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000

if (!Array.isArray(results) || results.length === 0 || results[0].id !== TARGET_ID) {
  throw new Error(`Rust search bridge failed: ${JSON.stringify(results.slice(0, 5))}`)
}

if (elapsedMs > MAX_SEARCH_MS) {
  throw new Error(`Rust search too slow: ${elapsedMs.toFixed(2)}ms > ${MAX_SEARCH_MS}ms for ${DOC_COUNT} docs`)
}

console.log('Rust search bridge OK')
console.log(`Rust search performance OK: ${elapsedMs.toFixed(2)}ms <= ${MAX_SEARCH_MS}ms for ${DOC_COUNT} docs`)
console.log(JSON.stringify(results.slice(0, 5), null, 2))
