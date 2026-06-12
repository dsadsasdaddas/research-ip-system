/**
 * 字段级审计日志回放工具 —— 灾后数据重建 / RPO 兜底(对应 docs/DISASTER_RECOVERY.md 第 4、5 节)
 * ----------------------------------------------------------------------------
 * 场景:数据库损坏后,从「最近一次全量备份」恢复,再把「备份之后到故障时刻」之间的字段级
 *      audit_log 逐条重放为核心成果表(paper/patent/copyright/transform)的 INSERT/UPDATE/DELETE,
 *      把有效 RPO 从「全量备份周期(默认 24h)」压到「分钟级」。
 *
 * 数据来源:audit_log 表中 operate_type IS NOT NULL 的行(AuditChangeSubscriber 写入,
 *          见 src/common/subscribers/audit-change.subscriber.ts;§6.2 字段级列)。
 *   - update  → UPDATE <table> SET new_value... WHERE id = record_id
 *   - delete  → DELETE FROM <table> WHERE id = record_id
 *   - create  → INSERT ... ON DUPLICATE KEY UPDATE(幂等,可反复回放)
 *
 * 安全:
 *   - 默认 **DRY-RUN**:只打印重建 SQL,不写库。加 --apply 才真正执行。
 *   - 表名走**严格白名单**(逻辑名 === 物理表名);列名正则校验后反引号包裹;值用 mysql.escape。
 *     audit_log.table_name / JSON key 均不可注入。
 *
 * 用法:
 *   node scripts/replay-audit.js                                  # 全量 dry-run
 *   node scripts/replay-audit.js --from 2026-06-12T02:00:00        # 只回放某时刻之后
 *   node scripts/replay-audit.js --table paper,patent              # 只回放指定表
 *   node scripts/replay-audit.js --from ... --to ... --apply       # 实写(谨慎!)
 *
 * 读取 backend/.env 的 DB_* 环境变量连接库。
 */
'use strict'

// 加载 .env(cwd 应为 backend/)
try {
  require('dotenv').config()
} catch (_) {
  /* dotenv 不可用时退化为纯环境变量 */
}

const mysql = require('mysql2/promise')

// 逻辑表名 === 物理表名(见 AuditChangeSubscriber.WATCHED + 各 @Entity('paper'|'patent'|...))
const TABLE_WHITELIST = new Set(['paper', 'patent', 'copyright', 'transform'])
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function ident(name) {
  if (!IDENT_RE.test(String(name))) throw new Error(`非法标识符(列/表名): ${name}`)
  return '`' + name + '`'
}

function lit(value) {
  // mysql.escape 会正确处理 null/数字/字符串/Buffer/Date
  return mysql.escape(value)
}

/** 把一条字段级审计日志编译成一条 SQL(或 null 表示跳过)。 */
function buildStatement(row) {
  const tbl = row.table_name
  if (!TABLE_WHITELIST.has(tbl)) return null // 非白名单:聚焦核心成果表,拒绝越界写
  const id = row.record_id
  const op = row.operate_type
  const table = ident(tbl)

  if (op === 'delete') {
    return { sql: `DELETE FROM ${table} WHERE ${ident('id')} = ${lit(id)};`, kind: 'delete' }
  }

  if (op === 'update') {
    const nv = row.new_value
    if (!nv || typeof nv !== 'object') return null
    const cols = Object.keys(nv).filter((k) => IDENT_RE.test(k))
    if (!cols.length) return null
    const sets = cols.map((k) => `${ident(k)} = ${lit(nv[k])}`).join(', ')
    return { sql: `UPDATE ${table} SET ${sets} WHERE ${ident('id')} = ${lit(id)};`, kind: 'update' }
  }

  if (op === 'create' || op === 'insert') {
    const nv = row.new_value
    if (!nv || typeof nv !== 'object') return null
    const cols = Object.keys(nv).filter((k) => IDENT_RE.test(k))
    if (!cols.length) return null
    const colList = cols.map(ident).join(', ')
    const valList = cols.map((k) => lit(nv[k])).join(', ')
    const onDup = cols.map((k) => `${ident(k)} = ${lit(nv[k])}`).join(', ')
    // ON DUPLICATE KEY UPDATE 让回放幂等:可安全反复执行
    return {
      sql: `INSERT INTO ${table} (${colList}) VALUES (${valList}) ON DUPLICATE KEY UPDATE ${onDup};`,
      kind: 'create',
    }
  }

  return null // 未知 operate_type,跳过
}

function parseArgs(argv) {
  const out = { apply: false, from: null, to: null, tables: [], help: false, limit: null }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--apply') out.apply = true
    else if (a === '--from') out.from = argv[++i]
    else if (a === '--to') out.to = argv[++i]
    else if (a === '--table') out.tables = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--limit') out.limit = Number(argv[++i])
    else if (a === '-h' || a === '--help') out.help = true
  }
  return out
}

function printHelp() {
  console.log(
    [
      '字段级审计日志回放工具(RPO 兜底)',
      '',
      '用法: node scripts/replay-audit.js [选项]',
      '选项:',
      '  --from <ISO>    只回放 operate_time >= 该时刻的变更',
      '  --to   <ISO>    只回放 operate_time <= 该时刻的变更',
      '  --table <a,b>   只回放指定表(逗号分隔),可选子集:' + [...TABLE_WHITELIST].join('/'),
      '  --limit <n>     最多回放前 n 条(调试用)',
      '  --apply         真正执行写库(默认 DRY-RUN 只打印 SQL)',
      '  -h, --help      显示帮助',
      '',
      '注:create 用 INSERT...ON DUPLICATE KEY UPDATE(幂等);update/delete 按原语义。',
      '    表名/列名经白名单+正则校验,值经 mysql.escape,防注入。',
    ].join('\n'),
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'research_db',
    multipleStatements: false,
  })

  try {
    const where = ['operate_type IS NOT NULL', 'table_name IS NOT NULL', 'record_id IS NOT NULL']
    const params = []
    if (args.from) {
      where.push('operate_time >= ?')
      params.push(args.from)
    }
    if (args.to) {
      where.push('operate_time <= ?')
      params.push(args.to)
    }
    if (args.tables.length) {
      const bad = args.tables.filter((t) => !TABLE_WHITELIST.has(t))
      if (bad.length) throw new Error(`--table 含非白名单表: ${bad.join(',')} (允许: ${[...TABLE_WHITELIST].join(',')})`)
      where.push(`table_name IN (${args.tables.map(() => '?').join(',')})`)
      params.push(...args.tables)
    }
    let sql = `SELECT id, operate_type, table_name, record_id, old_value, new_value, operate_time, create_time
               FROM audit_log WHERE ${where.join(' AND ')} ORDER BY operate_time ASC, id ASC`
    if (args.limit) sql += ` LIMIT ${Math.max(0, Math.floor(args.limit))}`

    const [rows] = await conn.execute(sql, params)

    const mode = args.apply ? 'APPLY(实写)' : 'DRY-RUN(只打印,不写库)'
    const range = [args.from ? `from ${args.from}` : '', args.to ? `to ${args.to}` : ''].filter(Boolean).join(' ')
    const tblFilter = args.tables.length ? ` table∈{${args.tables.join(',')}}` : ''
    console.log(`\n=== 审计回放 [${mode}] ===`)
    console.log(`匹配字段级审计日志 ${rows.length} 条  ${range} ${tblFilter}\n`)

    const stats = { create: 0, update: 0, delete: 0, skipped: 0, affected: 0 }

    for (const row of rows) {
      const built = buildStatement(row)
      if (!built) {
        stats.skipped += 1
        continue
      }
      stats[built.kind] += 1

      if (args.apply) {
        const [r] = await conn.query(built.sql)
        const affected = typeof r.affectedRows === 'number' ? r.affectedRows : 0
        stats.affected += affected
        console.log(`[apply:${built.kind}] audit_id=${row.id} ${row.table_name}#${row.record_id} affected=${affected}`)
      } else {
        console.log(`-- audit_log.id=${row.id}  op=${built.kind}  ${row.table_name}#${row.record_id}  @ ${row.operate_time || row.create_time}`)
        console.log(built.sql)
      }
    }

    console.log('\n--- 汇总 ---')
    console.log(`  create=${stats.create}  update=${stats.update}  delete=${stats.delete}  skipped=${stats.skipped}`)
    if (args.apply) console.log(`  实际影响行数=${stats.affected}`)
    console.log(args.apply ? '  回放完成。' : '  以上为 DRY-RUN;确认无误后加 --apply 实写。')
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('回放失败:', e.message)
  process.exit(1)
})
