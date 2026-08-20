const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const express = require('express')
const qrcode = require('qrcode')
const path = require('path')

const app = express()
app.use(express.json({ limit: '50mb' }))

const API_KEY = 'metaads-evolution-key-2024'
const PORT = 8080
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

let qrCodeBase64 = null
let connectionStatus = 'disconnected'

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, 'auth') }),
  puppeteer: {
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  },
})

client.on('qr', async (qr) => {
  connectionStatus = 'qr_ready'
  qrCodeBase64 = await qrcode.toDataURL(qr)
  console.log('\n=== QR CODE GERADO - Escaneie com o WhatsApp ===')
  console.log('Acesse: http://localhost:8080/qr-page para ver o QR Code')
  console.log('================================================\n')
})

client.on('ready', () => {
  qrCodeBase64 = null
  connectionStatus = 'connected'
  console.log('WhatsApp conectado e pronto!')
})

client.on('disconnected', () => {
  connectionStatus = 'disconnected'
  console.log('WhatsApp desconectado. Reinicie o servidor.')
})

// Middleware de autenticação
app.use((req, res, next) => {
  const open = ['/status', '/qr', '/qr-page', '/']
  if (open.some(p => req.path.startsWith(p))) return next()
  if (req.headers['apikey'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' })
  next()
})

// Página HTML com QR Code para escanear
app.get('/qr-page', (req, res) => {
  if (connectionStatus === 'connected') {
    return res.send('<html><body style="font-family:Arial;text-align:center;padding:40px;background:#f0f2f5"><h2 style="color:#1877F2">WhatsApp conectado!</h2><p>O servidor esta pronto para enviar relatórios.</p></body></html>')
  }
  if (!qrCodeBase64) {
    return res.send('<html><head><meta http-equiv="refresh" content="3"></head><body style="font-family:Arial;text-align:center;padding:40px;background:#f0f2f5"><h2>Gerando QR Code...</h2><p>Aguarde, a página irá atualizar automaticamente.</p></body></html>')
  }
  res.send(`<html><body style="font-family:Arial;text-align:center;padding:40px;background:#f0f2f5">
    <h2 style="color:#1877F2">Escaneie com seu WhatsApp</h2>
    <img src="${qrCodeBase64}" style="width:280px;border:8px solid white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)"/>
    <p style="color:#65676B">WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
    <meta http-equiv="refresh" content="30">
  </body></html>`)
})

app.get('/status', (req, res) => res.json({ status: connectionStatus, connected: connectionStatus === 'connected' }))

app.get('/qr', (req, res) => {
  if (qrCodeBase64) return res.json({ base64: qrCodeBase64, status: 'awaiting_scan' })
  res.json({ status: connectionStatus })
})

// Enviar texto — compatível com Evolution API
app.post('/message/sendText/:instance', async (req, res) => {
  if (connectionStatus !== 'connected') return res.status(503).json({ error: 'WhatsApp não conectado' })
  const { number, text } = req.body
  try {
    const chatId = `${number}@c.us`
    await client.sendMessage(chatId, text)
    res.json({ status: 'sent', number })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Enviar PDF — compatível com Evolution API
app.post('/message/sendMedia/:instance', async (req, res) => {
  if (connectionStatus !== 'connected') return res.status(503).json({ error: 'WhatsApp não conectado' })
  const { number, media, fileName, caption, mimetype } = req.body
  try {
    const chatId = `${number}@c.us`
    const mediaObj = new MessageMedia(mimetype || 'application/pdf', media, fileName || 'relatorio.pdf')
    await client.sendMessage(chatId, mediaObj, { caption: caption || '' })
    res.json({ status: 'sent', number })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Etiquetas / leads (requer WhatsApp Business) ──────────────────────────
// Usadas por etiquetar_leads.py. Etiquetas só existem em contas Business:
// em conta pessoal a whatsapp-web.js lança erro, devolvido aqui como 409.

function exigirConexao(res) {
  if (connectionStatus !== 'connected') {
    res.status(503).json({ error: 'WhatsApp não conectado' })
    return false
  }
  return true
}

function erroEtiqueta(res, e) {
  const msg = String(e && e.message || e)
  console.error('[labels]', msg)
  res.status(409).json({
    error: msg,
    hint: 'Etiquetas só estão disponíveis em contas WhatsApp Business.',
  })
}

const serializarEtiqueta = (l) => ({ id: l.id, name: l.name, hexColor: l.hexColor })

// Lista todas as etiquetas da conta
app.get('/labels/:instance', async (req, res) => {
  if (!exigirConexao(res)) return
  try {
    const labels = await client.getLabels()
    res.json(labels.map(serializarEtiqueta))
  } catch (e) {
    erroEtiqueta(res, e)
  }
})

// Lista as conversas mais recentes, já com as etiquetas de cada uma
app.get('/chats/:instance', async (req, res) => {
  if (!exigirConexao(res)) return
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 500)
  const incluirGrupos = req.query.includeGroups === 'true'
  try {
    const chats = (await client.getChats())
      .filter(c => c.id._serialized !== 'status@broadcast')
      .filter(c => incluirGrupos || !c.isGroup)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit)

    const saida = []
    for (const chat of chats) {
      let labels = []
      try {
        labels = (await client.getChatLabels(chat.id._serialized)).map(serializarEtiqueta)
      } catch (e) {
        // conta sem suporte a etiquetas: segue sem elas
      }
      saida.push({
        chatId: chat.id._serialized,
        name: chat.name || chat.id.user,
        number: chat.id.user,
        isGroup: chat.isGroup,
        timestamp: chat.timestamp || 0,
        unreadCount: chat.unreadCount || 0,
        labels,
      })
    }
    res.json(saida)
  } catch (e) {
    erroEtiqueta(res, e)
  }
})

// Histórico de mensagens de uma conversa
app.get('/chat/messages/:instance', async (req, res) => {
  if (!exigirConexao(res)) return
  const { chatId } = req.query
  if (!chatId) return res.status(400).json({ error: 'chatId é obrigatório' })
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 200)
  try {
    const chat = await client.getChatById(chatId)
    const mensagens = await chat.fetchMessages({ limit })
    res.json(mensagens.map(m => ({
      fromMe: m.fromMe,
      body: m.body || '',
      type: m.type,
      timestamp: m.timestamp,
      hasMedia: m.hasMedia,
    })))
  } catch (e) {
    erroEtiqueta(res, e)
  }
})

// Adiciona/remove etiquetas de uma conversa.
// Body: { chatId, add: [labelId], remove: [labelId] }
// O conjunto final é calculado a partir das etiquetas atuais, então qualquer
// etiqueta não citada em add/remove é preservada.
app.post('/label/handle/:instance', async (req, res) => {
  if (!exigirConexao(res)) return
  const { chatId, add = [], remove = [] } = req.body || {}
  if (!chatId) return res.status(400).json({ error: 'chatId é obrigatório' })
  try {
    const chat = await client.getChatById(chatId)
    const atuais = (await client.getChatLabels(chatId)).map(l => String(l.id))

    const remover = new Set(remove.map(String))
    const finais = new Set(atuais.filter(id => !remover.has(id)))
    add.map(String).forEach(id => finais.add(id))

    const ids = [...finais]
    await chat.changeLabels(ids)
    res.json({ status: 'ok', chatId, before: atuais, after: ids })
  } catch (e) {
    erroEtiqueta(res, e)
  }
})

// Compatibilidade Evolution API
app.get('/instance/fetchInstances', (req, res) => {
  res.json([{ instance: { instanceName: 'meu-whatsapp', state: connectionStatus === 'connected' ? 'open' : 'close' } }])
})
app.get('/instance/connect/:instance', (req, res) => {
  res.json(qrCodeBase64 ? { base64: qrCodeBase64 } : { status: connectionStatus })
})
app.post('/instance/create', (req, res) => {
  res.json({ instance: { instanceName: req.body.instanceName || 'meu-whatsapp', status: 'created' } })
})
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Meta Ads WhatsApp', connectionStatus }))

app.listen(PORT, () => {
  console.log(`\nServidor rodando em http://localhost:${PORT}`)
  console.log('Inicializando WhatsApp (pode demorar 20-30 segundos)...\n')
  client.initialize()
})
