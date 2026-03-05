// รันด้วย: node check-gemini-models.js
const https = require('https')
const fs = require('fs')

// อ่าน .env เองโดยไม่ต้องใช้ dotenv
const env = fs.readFileSync('./server/.env', 'utf8')
const match = env.match(/GEMINI_API_KEY=(.+)/)
const apiKey = match ? match[1].trim() : ''
if (!apiKey) { console.error('ไม่พบ GEMINI_API_KEY ใน server/.env'); process.exit(1) }

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${apiKey}`,
  method: 'GET'
}

https.get(options, (res) => {
  let raw = ''
  res.on('data', c => raw += c)
  res.on('end', () => {
    const data = JSON.parse(raw)
    if (data.error) { console.error('Error:', data.error.message); return }
    console.log('\n✅ Models ที่ใช้ generateContent ได้:\n')
    ;(data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .forEach(m => console.log(' -', m.name))
  })
}).on('error', e => console.error('Request error:', e.message))
