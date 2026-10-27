// recall — long-term memory for Claude Code, stored in a local SQLite database.
//
// Storage: ~/.claude/recall/recall.db  (table: memories)
// Access:  the sqlite3 CLI via $.process.run (no shell, no injection)
//
// Capture is on-demand:
//   - Claude saves via the save_memory tool (when you say "remember this",
//     or when Claude spots something durable and you give a nod).
//   - You manage memories with the /recall command.
//   - /recall dashboard opens a live pane of your memories.

const VALID_TYPES = ['user', 'preference', 'project', 'decision', 'fact', 'reference']

// The dashboard pane's id, used to open it and to recognize it when drawing.
const PANE = 'recall'

// Which dashboard tab is open: 'top' | 'recent' | 'types'
let paneTab = 'top'

const SCHEMA_SQL =
  "CREATE TABLE IF NOT EXISTS memories (" +
  " id INTEGER PRIMARY KEY AUTOINCREMENT," +
  " type TEXT NOT NULL," +
  " title TEXT NOT NULL," +
  " content TEXT NOT NULL," +
  " tags TEXT," +
  " importance INTEGER NOT NULL DEFAULT 3," +
  " project_ref TEXT," +
  " source TEXT," +
  " created_at TEXT NOT NULL DEFAULT (datetime('now'))," +
  " updated_at TEXT NOT NULL DEFAULT (datetime('now'))," +
  " status TEXT NOT NULL DEFAULT 'active'" +
  ");" +
  "CREATE INDEX IF NOT EXISTS idx_memories_status_type ON memories(status, type);"

// Set once per session/reload by ensureDb, then used by every handler.
let DB_PATH = null

export function register(on) {
  on('session.start', async ($, e, next) => {
    try {
      await ensureDb($)
    } catch (err) {
      await $.ui.log('recall: db init failed — ' + errText(err))
    }
    try {
      await $.tool.register({
        name: 'save_memory',
        description:
          'Save a durable long-term memory about the user or project to the recall database. ' +
          'Use when the user asks to remember something, or when you spot a lasting fact, ' +
          'preference, decision, or reference worth keeping (confirm with the user first). ' +
          'Do not save secrets, transient chatter, or anything derivable from the codebase.',
        isDeferred: false,
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: VALID_TYPES, description: 'Category of memory' },
            title: { type: 'string', description: 'Short label for quick scanning' },
            content: { type: 'string', description: 'The memory itself' },
            tags: { type: 'string', description: 'Comma-separated keywords (optional)' },
            importance: { type: 'integer', minimum: 1, maximum: 5, description: '1 (minor) to 5 (critical)' },
            project_ref: { type: 'string', description: 'Optional project this relates to' }
          },
          required: ['type', 'title', 'content']
        }
      })
      await $.tool.register({
        name: 'search_memory',
        description:
          'Search the recall long-term memory database for what you know about the user or a project. ' +
          'Use before answering when prior preferences, decisions, or context would help.',
        isDeferred: false,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Text to match against title, content, and tags' }
          },
          required: ['query']
        }
      })
      await $.command.register({
        name: 'recall',
        description: 'Save and manage long-term memories',
        argumentHint: '<save|search|list|show|update|archive|dashboard> ...'
      })
    } catch (err) {
      await $.ui.log('recall: register failed — ' + errText(err))
    }
    try {
      if (DB_PATH) {
        const c = await $.process.run(['sqlite3', DB_PATH, "SELECT count(*) FROM memories WHERE status='active';"])
        await $.ui.log('recall: ' + (c.stdout || '0').trim() + ' memories available')
      }
    } catch (err) {
      // non-fatal
    }
    return next(e)
  })

  // Claude-callable: save a structured memory.
  on('tool.call', { tool: 'mcp__recall__save_memory' }, async ($, e) => {
    try {
      return { result: await toolSave($, e) }
    } catch (err) {
      return { result: 'recall: save failed — ' + errText(err) }
    }
  })

  // Claude-callable: search memories.
  on('tool.call', { tool: 'mcp__recall__search_memory' }, async ($, e) => {
    try {
      return { result: await toolSearch($, e) }
    } catch (err) {
      return { result: 'recall: search failed — ' + errText(err) }
    }
  })

  // User-callable: /recall <subcommand> ...
  on('command.run', { command: 'recall' }, async ($, e) => {
    const args = (e.args || '').trim()
    const sp = args.indexOf(' ')
    const sub = (sp === -1 ? args : args.slice(0, sp)).toLowerCase()
    const rest = sp === -1 ? '' : args.slice(sp + 1).trim()
    try {
      if (sub === 'dashboard' || sub === 'board' || sub === 'panel') {
        await $.ui.open({ id: PANE, title: 'recall', focus: true, closeOnEscape: true })
        return {}
      }
      if (sub === 'save') return { text: await cmdSave($, rest) }
      if (sub === 'search') return { text: await cmdSearch($, rest) }
      if (sub === 'list') return { text: await cmdList($, rest) }
      if (sub === 'show') return { text: await cmdShow($, rest) }
      if (sub === 'archive') return { text: await cmdArchive($, rest) }
      if (sub === 'update') return { text: await cmdUpdate($, rest) }
      return { text: recallHelp() }
    } catch (err) {
      return { text: 'recall: error — ' + errText(err) }
    }
  })

  // The dashboard pane: Top / Recent / Types tabs over the memories table.
  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const redraw = () => $.ui.invalidate('ui.render')
    const impColor = (n) => n >= 5 ? 'red' : n >= 4 ? 'yellow' : n >= 3 ? 'green' : n >= 2 ? 'blue' : 'gray'
    const dots = (n) => '●'.repeat(Math.max(1, Math.min(5, n || 1)))

    // Total active memories, shown in the header.
    let total = 0
    if (DB_PATH) {
      try {
        const c = await $.process.run(['sqlite3', DB_PATH, "SELECT count(*) FROM memories WHERE status='active';"])
        total = parseInt((c.stdout || '0').trim(), 10) || 0
      } catch (err) {
        // non-fatal
      }
    }

    const tabButton = (name, label, hotkey) =>
      Button({
        key: 'rtab-' + name,
        label: (paneTab === name ? '▸ ' : '  ') + label,
        hotkey,
        plain: true,
        dimColor: paneTab !== name,
        onPress: () => { paneTab = name; redraw() }
      })

    let body = [Text({ children: ['database not ready'], dimColor: true })]
    if (DB_PATH) {
      try {
        if (paneTab === 'types') {
          const r = await $.process.run(['sqlite3', '-json', DB_PATH,
            "SELECT type, count(*) as n FROM memories WHERE status='active' GROUP BY type ORDER BY n DESC;"])
          const rows = parseRows(r.stdout)
          let max = 1
          for (let i = 0; i < rows.length; i++) { if (rows[i].n > max) max = rows[i].n }
          body = rows.length
            ? rows.map(function (row) {
                return Box({
                  flexDirection: 'row',
                  columnGap: 1,
                  children: [
                    Text({ children: [row.type.padEnd(11)], dimColor: true }),
                    Text({ children: ['█'.repeat(Math.max(1, Math.round((row.n / max) * 12)))], color: 'cyan' }),
                    Text({ children: [' ' + row.n] })
                  ]
                })
              })
            : [Text({ children: ['No memories yet.'], dimColor: true })]
        } else {
          const order = paneTab === 'recent' ? 'updated_at DESC' : 'importance DESC, updated_at DESC'
          const r = await $.process.run(['sqlite3', '-json', DB_PATH,
            "SELECT id,type,title,importance FROM memories WHERE status='active' ORDER BY " + order + ' LIMIT 15;'])
          const rows = parseRows(r.stdout)
          body = rows.length
            ? rows.map(function (m) {
                return Box({
                  flexDirection: 'row',
                  columnGap: 1,
                  children: [
                    Text({ children: [dots(m.importance).padEnd(5)], color: impColor(m.importance) }),
                    Text({ children: [('[' + m.type + ']').padEnd(12)], dimColor: true }),
                    Text({ children: [m.title], wrap: 'truncate-end' })
                  ]
                })
              })
            : [Text({ children: ['No memories yet. Save one with /recall save'], dimColor: true })]
        }
      } catch (err) {
        body = [Text({ children: ['recall: ' + errText(err)], color: 'red' })]
      }
    }

    return Box({
      flexDirection: 'column',
      padding: 1,
      children: [
        Box({
          flexDirection: 'row',
          columnGap: 1,
          children: [
            Text({ children: ['recall'], bold: true, color: 'cyan' }),
            Text({ children: ['· ' + total + ' memories'], dimColor: true })
          ]
        }),
        Text({ children: ['────────────────────────────'], dimColor: true }),
        Box({
          flexDirection: 'row',
          columnGap: 3,
          children: [tabButton('top', 'Top', '1'), tabButton('recent', 'Recent', '2'), tabButton('types', 'Types', '3')]
        }),
        Text({ children: [' '] }),
        ...body,
        Text({ children: [' '] }),
        Box({
          flexDirection: 'row',
          columnGap: 2,
          children: [
            Button({ key: 'refresh', label: 'Refresh', hotkey: 'r', onPress: () => redraw() }),
            Text({ children: ['1 Top · 2 Recent · 3 Types'], dimColor: true })
          ]
        })
      ]
    })
  })
}

// --- Setup -----------------------------------------------------------------

async function ensureDb($) {
  const home = await $.env.get('HOME')
  const dir = home + '/.claude/recall'
  DB_PATH = dir + '/recall.db'
  await $.process.run(['mkdir', '-p', dir])
  await $.process.run(['sqlite3', DB_PATH, SCHEMA_SQL])
}

// --- Tool handlers (Claude-callable) ---------------------------------------

async function toolSave($, e) {
  if (!DB_PATH) return 'recall: database not ready'
  const type = VALID_TYPES.includes(e.type) ? e.type : 'fact'
  let imp = parseInt(e.importance, 10)
  if (!(imp >= 1 && imp <= 5)) imp = 3
  const title = ((e.title || '').trim() || (e.content || '').trim().slice(0, 60)).slice(0, 120)
  const content = (e.content || '').trim()
  if (!content) return 'recall: nothing to save (empty content)'

  const existingId = await findByTitle($, title)
  if (existingId !== null) {
    await $.process.run(['sqlite3', DB_PATH,
      "UPDATE memories SET type=" + sq(type) + ", content=" + sq(content) + ", tags=" + sq(e.tags) +
      ", importance=" + imp + ", project_ref=" + sq(e.project_ref) + ", updated_at=datetime('now')" +
      " WHERE id=" + existingId + ";"])
    await $.ui.invalidate('ui.render')
    return 'Updated memory #' + existingId + ' — ' + title
  }
  await $.process.run(['sqlite3', DB_PATH,
    "INSERT INTO memories (type,title,content,tags,importance,project_ref,source) VALUES (" +
    sq(type) + "," + sq(title) + "," + sq(content) + "," + sq(e.tags) + "," + imp + "," +
    sq(e.project_ref) + "," + sq('claude') + ");"])
  await $.ui.invalidate('ui.render')
  return 'Saved [' + type + '] ' + title
}

async function toolSearch($, e) {
  if (!DB_PATH) return 'recall: database not ready'
  const query = (e.query || '').trim()
  if (!query) return 'recall: empty query'
  const like = "'%" + query.replace(/'/g, "''") + "%'"
  const r = await $.process.run(['sqlite3', '-json', DB_PATH,
    "SELECT id,type,title,content,tags,importance FROM memories WHERE status='active' AND (" +
    "title LIKE " + like + " OR content LIKE " + like + " OR tags LIKE " + like + ") " +
    "ORDER BY importance DESC, updated_at DESC LIMIT 20;"])
  const rows = parseRows(r.stdout)
  if (!rows.length) return 'No memories found for "' + query + '".'
  return rows.map(function (m) {
    return '#' + m.id + ' [' + m.type + '] (imp ' + m.importance + ') ' + m.title +
      '\n  ' + m.content + (m.tags ? '\n  tags: ' + m.tags : '')
  }).join('\n')
}

// --- Command handlers (user-callable) --------------------------------------

async function cmdSave($, rest) {
  if (!DB_PATH) return 'recall: database not ready'
  if (!rest) return 'Usage: /recall save [type=..] [importance=1-5] [title=..] [tags=a,b] [project=..] <content>'
  const f = parseSave(rest)
  if (!f.content) return 'recall: nothing to save (empty content)'
  const type = VALID_TYPES.includes(f.type) ? f.type : 'fact'
  let imp = parseInt(f.importance, 10)
  if (!(imp >= 1 && imp <= 5)) imp = 3
  const title = (f.title || f.content.slice(0, 60)).slice(0, 120)

  const existingId = await findByTitle($, title)
  if (existingId !== null) {
    await $.process.run(['sqlite3', DB_PATH,
      "UPDATE memories SET type=" + sq(type) + ", content=" + sq(f.content) + ", tags=" + sq(f.tags) +
      ", importance=" + imp + ", project_ref=" + sq(f.project_ref) + ", updated_at=datetime('now')" +
      " WHERE id=" + existingId + ";"])
    await $.ui.invalidate('ui.render')
    return 'recall: updated memory #' + existingId + ' — ' + title
  }
  await $.process.run(['sqlite3', DB_PATH,
    "INSERT INTO memories (type,title,content,tags,importance,project_ref,source) VALUES (" +
    sq(type) + "," + sq(title) + "," + sq(f.content) + "," + sq(f.tags) + "," + imp + "," +
    sq(f.project_ref) + "," + sq('manual') + ");"])
  await $.ui.invalidate('ui.render')
  return 'recall: saved [' + type + '] ' + title
}

async function cmdSearch($, rest) {
  if (!DB_PATH) return 'recall: database not ready'
  if (!rest) return 'Usage: /recall search <text>'
  const like = "'%" + rest.replace(/'/g, "''") + "%'"
  const r = await $.process.run(['sqlite3', '-json', DB_PATH,
    "SELECT id,type,title,importance,tags FROM memories WHERE status='active' AND (" +
    "title LIKE " + like + " OR content LIKE " + like + " OR tags LIKE " + like + ") " +
    "ORDER BY importance DESC, updated_at DESC LIMIT 20;"])
  return formatRows(r.stdout, 'Search: "' + rest + '"')
}

async function cmdList($, rest) {
  if (!DB_PATH) return 'recall: database not ready'
  let where = "status='active'"
  const t = rest.trim().toLowerCase()
  if (t && VALID_TYPES.includes(t)) where += " AND type='" + t + "'"
  const r = await $.process.run(['sqlite3', '-json', DB_PATH,
    "SELECT id,type,title,importance,tags FROM memories WHERE " + where +
    " ORDER BY importance DESC, updated_at DESC LIMIT 50;"])
  return formatRows(r.stdout, 'Memories' + (t ? ' [' + t + ']' : ''))
}

async function cmdShow($, rest) {
  if (!DB_PATH) return 'recall: database not ready'
  const id = parseInt(rest, 10)
  if (!(id > 0)) return 'Usage: /recall show <id>'
  const r = await $.process.run(['sqlite3', '-json', DB_PATH, "SELECT * FROM memories WHERE id=" + id + ";"])
  const rows = parseRows(r.stdout)
  if (!rows.length) return 'recall: no memory #' + id
  const m = rows[0]
  return [
    '#' + m.id + ' [' + m.type + ']  importance ' + m.importance + '  (' + m.status + ')',
    'Title:    ' + m.title,
    'Content:  ' + m.content,
    'Tags:     ' + (m.tags || '-'),
    'Project:  ' + (m.project_ref || '-'),
    'Created:  ' + m.created_at,
    'Updated:  ' + m.updated_at
  ].join('\n')
}

async function cmdArchive($, rest) {
  if (!DB_PATH) return 'recall: database not ready'
  const id = parseInt(rest, 10)
  if (!(id > 0)) return 'Usage: /recall archive <id>'
  await $.process.run(['sqlite3', DB_PATH,
    "UPDATE memories SET status='archived', updated_at=datetime('now') WHERE id=" + id + ";"])
  await $.ui.invalidate('ui.render')
  return 'recall: archived #' + id
}

async function cmdUpdate($, rest) {
  if (!DB_PATH) return 'recall: database not ready'
  const tokens = rest.trim().split(' ')
  const id = parseInt(tokens[0], 10)
  if (!(id > 0)) return 'Usage: /recall update <id> [type=..] [importance=..] [title=..] [tags=..] [content=..] [project=..]  (use _ for spaces in a value)'
  const sets = []
  for (let i = 1; i < tokens.length; i++) {
    const eq = tokens[i].indexOf('=')
    if (eq === -1) continue
    const k = tokens[i].slice(0, eq).toLowerCase()
    const v = tokens[i].slice(eq + 1).replace(/_/g, ' ')
    if (k === 'type' && VALID_TYPES.includes(v)) sets.push('type=' + sq(v))
    else if (k === 'importance') { const n = parseInt(v, 10); if (n >= 1 && n <= 5) sets.push('importance=' + n) }
    else if (k === 'title') sets.push('title=' + sq(v))
    else if (k === 'tags') sets.push('tags=' + sq(v))
    else if (k === 'content') sets.push('content=' + sq(v))
    else if (k === 'project') sets.push('project_ref=' + sq(v))
  }
  if (!sets.length) return 'recall: nothing to update. Use key=value (type, importance, title, tags, content, project).'
  sets.push("updated_at=datetime('now')")
  await $.process.run(['sqlite3', DB_PATH, "UPDATE memories SET " + sets.join(', ') + " WHERE id=" + id + ";"])
  await $.ui.invalidate('ui.render')
  return 'recall: updated #' + id
}

// --- Shared db helper (top-level, receives $) ------------------------------

async function findByTitle($, title) {
  const r = await $.process.run(['sqlite3', '-json', DB_PATH,
    "SELECT id FROM memories WHERE status='active' AND lower(title)=lower(" + sq(title) + ") LIMIT 1;"])
  const rows = parseRows(r.stdout)
  return rows.length ? rows[0].id : null
}

// --- Pure helpers (no $) ---------------------------------------------------

function sq(v) {
  if (v === null || v === undefined || v === '') return 'NULL'
  return "'" + String(v).replace(/'/g, "''") + "'"
}

function parseRows(stdout) {
  const out = (stdout || '').trim()
  if (!out) return []
  try { return JSON.parse(out) } catch (err) { return [] }
}

function formatRows(stdout, header) {
  const rows = parseRows(stdout)
  if (!rows.length) return header + '\nNo memories found.'
  const lines = rows.map(function (m) {
    return '#' + m.id + ' [' + m.type + '] (' + m.importance + ') ' + m.title + (m.tags ? '  {' + m.tags + '}' : '')
  })
  return header + '\n' + lines.join('\n')
}

function parseSave(rest) {
  const fields = { type: 'fact', importance: 3, title: null, tags: null, project_ref: null, content: '' }
  const tokens = rest.split(' ')
  let i = 0
  for (; i < tokens.length; i++) {
    const t = tokens[i]
    const eq = t.indexOf('=')
    if (eq === -1) break
    const k = t.slice(0, eq).toLowerCase()
    const v = t.slice(eq + 1).replace(/_/g, ' ')
    if (k === 'type') fields.type = v
    else if (k === 'importance') fields.importance = v
    else if (k === 'title') fields.title = v
    else if (k === 'tags') fields.tags = v
    else if (k === 'project') fields.project_ref = v
    else break
  }
  fields.content = tokens.slice(i).join(' ').trim()
  return fields
}

function recallHelp() {
  return [
    'recall — long-term memory',
    '/recall save [type=..] [importance=1-5] [title=..] [tags=a,b] [project=..] <content>',
    '/recall search <text>',
    '/recall list [type]',
    '/recall show <id>',
    '/recall update <id> key=value ...   (use _ for spaces in a value)',
    '/recall archive <id>',
    '/recall dashboard   (open the memory pane)',
    'types: ' + VALID_TYPES.join(', ')
  ].join('\n')
}

function errText(err) {
  return err && err.message ? err.message : String(err)
}
