/**
 * OCR สแกนโฉนดที่ดิน
 *
 * Primary  : Gemini Vision API (gemini-2.5-flash) — ไม่ต้องติดตั้งอะไรเพิ่ม ใช้ GEMINI_API_KEY
 * Fallback : Tesseract CLI (ต้องติดตั้ง tesseract-ocr-tha บนเครื่อง)
 *
 * ติดตั้ง Thai lang (ใช้เฉพาะเมื่อ fallback):
 *   Ubuntu/Linux : sudo apt-get install tesseract-ocr-tha
 *   Mac          : brew install tesseract-lang
 *   Windows      : ติ๊ก Thai ตอนติดตั้ง Tesseract (https://github.com/UB-Mannheim/tesseract/wiki)
 */

'use strict';

const { exec }  = require('child_process');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const https     = require('https');

// ============================================================
// ดึง GEMINI_API_KEY จาก process.env (โหลดจาก .env โดย server)
// ============================================================
function getGeminiKey() {
  return process.env.GEMINI_API_KEY || null;
}

// ============================================================
// ลบคำนำหน้า ตำบล/อำเภอ/จังหวัด ออก
// (กัน Gemini ตอบ "จังหวัดเชียงใหม่" แทน "เชียงใหม่")
// ============================================================
function stripLocationPrefix(val, type) {
  if (!val || typeof val !== 'string') return val;
  var s = val.trim();
  if (type === 'province') {
    s = s.replace(/^จังหวัด/, '').replace(/^จ\./, '').trim();
  } else if (type === 'amphoe') {
    s = s.replace(/^อำเภอ/, '').replace(/^เขต/, '').replace(/^อ\./, '').trim();
  } else if (type === 'tambon') {
    s = s.replace(/^ตำบล/, '').replace(/^แขวง/, '').replace(/^ต\./, '').trim();
  }
  return s || val;
}

// ============================================================
// GEMINI VISION — ส่งรูปเป็น base64 ให้ Gemini อ่านโฉนด
// ============================================================
function scanWithGemini(imagePath, callback) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return callback(new Error('No GEMINI_API_KEY'), null);
  }

  // อ่านรูปเป็น base64
  let imageBase64, mimeType;
  try {
    const buf = fs.readFileSync(imagePath);
    imageBase64 = buf.toString('base64');

    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
    mimeType = mimeMap[ext] || 'image/jpeg';
  } catch (e) {
    return callback(e, null);
  }

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการอ่านเอกสารราชการไทย โดยเฉพาะโฉนดที่ดิน น.ส.3 น.ส.3ก น.ส.4 น.ส.4จ และเอกสารสิทธิ์ที่ดินทุกประเภท

กรุณาอ่านรูปภาพนี้อย่างละเอียดแล้วดึงข้อมูลออกมา ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

== กฎสำคัญ ==
1. ถ้าพบข้อมูล ให้ใส่เสมอ แม้อ่านได้ไม่ครบหรือไม่ชัดเจน
2. ค่าทุกอย่างต้องเป็นตัวหนังสือล้วน ไม่มีคำนำหน้า เช่น:
   - เห็น "จังหวัดเชียงใหม่" → ตอบ "เชียงใหม่"
   - เห็น "อำเภอเมือง" → ตอบ "เมือง"
   - เห็น "ตำบลสุเทพ" → ตอบ "สุเทพ"
3. ค้นหาอำเภอและจังหวัดจากส่วน "ที่ตั้งที่ดิน" หรือ "สถานที่ตั้ง" หรือบรรทัดที่มีคำว่า ตำบล อำเภอ จังหวัด
4. ถ้าเอกสารเป็นภาษาไทยทั้งหมดให้อ่านอย่างละเอียด

{
  "deed_number": "เลขที่โฉนด / น.ส. / เลขที่เอกสาร",
  "volume": "เล่มที่ (ตัวเลขเท่านั้น)",
  "page": "หน้า (ตัวเลขเท่านั้น)",
  "map_sheet": "ระวาง",
  "tambon": "ชื่อตำบลหรือแขวง ไม่มีคำว่า ตำบล/แขวง เช่น สุเทพ หรือ บางรัก",
  "amphoe": "ชื่ออำเภอหรือเขต ไม่มีคำว่า อำเภอ/เขต เช่น เมือง หรือ บางรัก",
  "province": "ชื่อจังหวัด ไม่มีคำว่า จังหวัด เช่น เชียงใหม่ หรือ กรุงเทพมหานคร",
  "land_area": "เนื้อที่รวม เช่น 2 ไร่ 1 งาน 50 ตารางวา",
  "deed_type": "ประเภทเอกสาร เช่น โฉนดที่ดิน หรือ น.ส.3ก หรือ น.ส.4จ",
  "parcel_number": "เลขที่ดิน",
  "survey_number": "เลขระวางหรือแผนที่"
}

ถ้าภาพนี้ไม่ใช่เอกสารที่ดินใดๆ เลย (เช่น รูปถ่ายบุคคล ของกิน หรือวิวทิวทัศน์) ให้ตอบ: {"not_deed": true}`;

  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    }
  });

  const model  = 'gemini-2.5-flash';
  const reqOpt = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(reqOpt, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);

        // ตรวจ error จาก Gemini
        if (parsed.error) {
          console.log('[OCR-Gemini] API error:', parsed.error.message);
          return callback(new Error(parsed.error.message), null);
        }

        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) return callback(new Error('Empty Gemini response'), null);

        // parse JSON ที่ Gemini ตอบกลับ
        let deedJson;
        try {
          // อาจมี ```json ... ``` wrapper
          const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          deedJson = JSON.parse(cleaned);
        } catch (e) {
          console.log('[OCR-Gemini] JSON parse error:', e.message, '| raw:', text.substring(0, 200));
          return callback(new Error('Cannot parse Gemini JSON'), null);
        }

        // ไม่ใช่โฉนด
        if (deedJson.not_deed) {
          console.log('[OCR-Gemini] Not a deed image');
          return callback(null, null);
        }

        // ทำความสะอาดค่า null / empty
        Object.keys(deedJson).forEach(k => {
          if (deedJson[k] === null || deedJson[k] === '' || deedJson[k] === 'null') {
            delete deedJson[k];
          }
        });

        // ลบคำนำหน้าที่ Gemini อาจใส่มาแม้จะบอกไม่ให้ใส่
        if (deedJson.province) deedJson.province = stripLocationPrefix(deedJson.province, 'province');
        if (deedJson.amphoe)   deedJson.amphoe   = stripLocationPrefix(deedJson.amphoe,   'amphoe');
        if (deedJson.tambon)   deedJson.tambon   = stripLocationPrefix(deedJson.tambon,   'tambon');

        if (Object.keys(deedJson).length === 0) return callback(null, null);

        console.log('[OCR-Gemini] Extracted deed data:', JSON.stringify(deedJson));
        callback(null, deedJson);

      } catch (e) {
        callback(e, null);
      }
    });
  });

  req.on('error', (e) => {
    console.log('[OCR-Gemini] Request error:', e.message);
    callback(e, null);
  });
  req.write(body);
  req.end();
}

// ============================================================
// TESSERACT FALLBACK — รัน Tesseract CLI บนเครื่อง
// ============================================================
function scanWithTesseract(imagePath, callback) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return callback(null, null);
  }

  const tmpOut  = path.join(os.tmpdir(), 'deed_ocr_' + Date.now());
  const cmdTha  = `tesseract "${imagePath}" "${tmpOut}" -l tha+eng --psm 6 2>&1`;
  const cmdEng  = `tesseract "${imagePath}" "${tmpOut}" -l eng --psm 6 2>&1`;
  const outFile = tmpOut + '.txt';

  const finalize = (text) => {
    const deedData = parseDeedText(text);
    try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile); } catch (_) {}
    callback(null, deedData);
  };

  exec(cmdTha, (err, stdout, stderr) => {
    const combined = (stdout || '') + (stderr || '');
    if (err || combined.includes('Failed loading language')) {
      console.log('[OCR-Tesseract] Thai lang not available, falling back to English only');
      exec(cmdEng, () => finalize(readFile(outFile)));
    } else {
      finalize(readFile(outFile));
    }
  });
}

function readFile(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : '';
  } catch (_) { return ''; }
}

// ============================================================
// Parse ข้อมูลโฉนดจากข้อความ OCR (ใช้กับ Tesseract fallback)
// ============================================================
function parseDeedText(text) {
  if (!text || text.length < 10) return null;

  const result = {};
  console.log('[OCR-Tesseract] Raw text:\n' + text.substring(0, 500));

  const deedNumMatch = text.match(/(?:เลขที่|โฉนดเลขที่|ที่ดินเลขที่|เลขท[ี่])\s*:?\s*(\d+)/);
  if (deedNumMatch) result.deed_number = deedNumMatch[1];

  const volumeMatch = text.match(/(?:เล่ม|เล่มท[ี่])\s*:?\s*(\d+)/);
  if (volumeMatch) result.volume = volumeMatch[1];

  const pageMatch = text.match(/(?:หน้า|หน้าท[ี่])\s*:?\s*(\d+)/);
  if (pageMatch) result.page = pageMatch[1];

  const mapMatch = text.match(/ระวาง\s*:?\s*([\d\w-]+)/);
  if (mapMatch) result.map_sheet = mapMatch[1];

  // ตำบล/แขวง — ยอมให้มี space กลางคำได้ (OCR บางครั้งแทรก space)
  // ดึงสูงสุด 15 char หลัง keyword แล้ว strip space ออก
  const tambonMatch = text.match(/(?:ตำบล|แขวง)\s*([\u0E00-\u0E7F][\u0E00-\u0E7F\s]{0,20})/);
  if (tambonMatch) {
    // ตัด space ส่วนเกินออก แล้วหยุดที่ keyword ถัดไป
    var tName = tambonMatch[1].replace(/\s+/g, '').replace(/(?:อำเภอ|เขต|จังหวัด|ตำบล|แขวง).*$/, '');
    if (tName) result.tambon = tName;
  }

  // อำเภอ/เขต
  const amphoeMatch = text.match(/(?:อำเภอ|เขต)\s*([\u0E00-\u0E7F][\u0E00-\u0E7F\s]{0,20})/);
  if (amphoeMatch) {
    var aName = amphoeMatch[1].replace(/\s+/g, '').replace(/(?:จังหวัด|ตำบล|แขวง|อำเภอ|เขต).*$/, '');
    if (aName) result.amphoe = aName;
  }

  // จังหวัด — ลอง match กับรายชื่อจังหวัดทั้งหมด 77 จังหวัด
  // รวม normalized text (ไม่มี space) เผื่อ OCR แทรก space กลางชื่อ
  const textNoSpace = text.replace(/\s+/g, '');
  const PROVINCES = [
    'กรุงเทพมหานคร','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร',
    'นครปฐม','พระนครศรีอยุธยา','สระบุรี','ชลบุรี','ระยอง','จันทบุรี','ตราด',
    'ฉะเชิงเทรา','ปราจีนบุรี','นครนายก','สระแก้ว','เชียงใหม่','เชียงราย','ลำปาง','ลำพูน',
    'แม่ฮ่องสอน','พะเยา','น่าน','แพร่','อุตรดิตถ์','ตาก','สุโขทัย','กำแพงเพชร','พิษณุโลก',
    'เพชรบูรณ์','พิจิตร','นครสวรรค์','อุทัยธานี','ชัยนาท','สิงห์บุรี','อ่างทอง','ลพบุรี',
    'นครราชสีมา','ชัยภูมิ','บุรีรัมย์','สุรินทร์','ศรีสะเกษ','อุบลราชธานี','ยโสธร',
    'อำนาจเจริญ','มุกดาหาร','นครพนม','สกลนคร','กาฬสินธุ์','ขอนแก่น','มหาสารคาม','ร้อยเอ็ด',
    'เลย','หนองบัวลำภู','หนองคาย','อุดรธานี','บึงกาฬ','นราธิวาส','ปัตตานี','ยะลา','สงขลา',
    'สตูล','ตรัง','พัทลุง','นครศรีธรรมราช','กระบี่','ภูเก็ต','พังงา','ระนอง','ชุมพร',
    'สุราษฎร์ธานี','ประจวบคีรีขันธ์','เพชรบุรี','ราชบุรี','สุพรรณบุรี','กาญจนบุรี'
  ];
  // ค้นหาใน text ปกติก่อน ถ้าไม่เจอค้นใน text ที่ลบ space แล้ว
  var foundProv = null;
  for (const prov of PROVINCES) {
    if (text.includes(prov)) { foundProv = prov; break; }
  }
  if (!foundProv) {
    for (const prov of PROVINCES) {
      if (textNoSpace.includes(prov)) { foundProv = prov; break; }
    }
  }
  if (foundProv) result.province = foundProv;

  const areaMatch = text.match(/(\d+)\s*(?:ไร่|ร่)|(\d+)\s*งาน|(\d+(?:\.\d+)?)\s*(?:ตารางวา|ตร\.?วา)/g);
  if (areaMatch) result.land_area = areaMatch.join(' ').trim();

  return Object.keys(result).length === 0 ? null : result;
}

// ============================================================
// สร้าง admin_note จากข้อมูลโฉนด
// ============================================================
function buildDeedNote(deedData) {
  if (!deedData) return null;
  const parts = [];
  if (deedData.deed_type)    parts.push(deedData.deed_type);
  if (deedData.deed_number)  parts.push(`เลขที่ ${deedData.deed_number}`);
  if (deedData.parcel_number) parts.push(`เลขที่ดิน ${deedData.parcel_number}`);
  if (deedData.volume)       parts.push(`เล่ม ${deedData.volume}`);
  if (deedData.page)         parts.push(`หน้า ${deedData.page}`);
  if (deedData.map_sheet)    parts.push(`ระวาง ${deedData.map_sheet}`);
  if (deedData.tambon)       parts.push(`ต.${deedData.tambon}`);
  if (deedData.amphoe)       parts.push(`อ.${deedData.amphoe}`);
  if (deedData.province)     parts.push(`จ.${deedData.province}`);
  if (deedData.land_area)    parts.push(`เนื้อที่ ${deedData.land_area}`);
  return parts.length > 0 ? `[OCR โฉนด] ${parts.join(' | ')}` : null;
}

// ============================================================
// Main export: ลอง Gemini ก่อน ถ้าไม่ได้ → Tesseract
// ============================================================
function scanDeedImage(imagePath, callback) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return callback(null, null);
  }

  const apiKey = getGeminiKey();

  if (apiKey) {
    // --- Primary: Gemini Vision ---
    console.log('[OCR] Trying Gemini Vision for:', path.basename(imagePath));
    scanWithGemini(imagePath, (err, deedData) => {
      if (!err && deedData) {
        const note = buildDeedNote(deedData);
        return callback(null, { ...deedData, admin_note: note });
      }

      // Gemini ล้มเหลว → fallback Tesseract
      console.log('[OCR] Gemini failed, falling back to Tesseract:', err?.message || 'no data');
      runTesseractFallback(imagePath, callback);
    });
  } else {
    // ไม่มี API Key → ใช้ Tesseract ตรงเลย
    console.log('[OCR] No GEMINI_API_KEY, using Tesseract');
    runTesseractFallback(imagePath, callback);
  }
}

function runTesseractFallback(imagePath, callback) {
  scanWithTesseract(imagePath, (err, deedData) => {
    if (err || !deedData) {
      console.log('[OCR] Tesseract also failed or no deed data found');
      return callback(null, null);
    }
    const note = buildDeedNote(deedData);
    callback(null, { ...deedData, admin_note: note });
  });
}

// ============================================================
// Export สำหรับใช้กับ Facebook (ดาวน์โหลดรูปจาก URL ก่อน OCR)
// ============================================================
function downloadAndScanDeed(imageUrl, callback) {
  if (!imageUrl) return callback(null, null);

  const tmpFile = path.join(os.tmpdir(), 'fb_deed_' + Date.now() + '.jpg');
  const file    = fs.createWriteStream(tmpFile);

  const doCleanup = () => {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
  };

  const request = imageUrl.startsWith('https') ? https : require('http');
  request.get(imageUrl, (res) => {
    if (res.statusCode !== 200) {
      file.close();
      doCleanup();
      return callback(new Error('Download failed: ' + res.statusCode), null);
    }

    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        scanDeedImage(tmpFile, (err, deedData) => {
          doCleanup();
          callback(err, deedData);
        });
      });
    });
  }).on('error', (e) => {
    file.close();
    doCleanup();
    callback(e, null);
  });
}

module.exports = { scanDeedImage, downloadAndScanDeed };
