/**
 * Google Apps Script Web App API สำหรับดึงข้อมูลจาก Google Sheets 2 แหล่ง (Private)
 * 1. รายการสนับสนุนส่งสิ่งส่งตรวจทางห้องปฏิบัติการ (Lab Support)
 * 2. ทะเบียนเบิกยาที่ไม่มีใช้ใน รพ.สต. (Drug Support)
 *
 * วิธีตั้งค่า:
 * 1. นำโค้ดนี้ไปวางใน Google Apps Script (https://script.google.com)
 * 2. ไปที่ Project Settings -> Script Properties เพิ่ม property ชื่อ APPS_SCRIPT_API_KEY (กำหนดรหัสลับยาวๆ เอง)
 * 3. กด Deploy -> New deployment -> Web app -> Execute as: Me -> Who has access: Anyone
 * 4. นำ Web App URL และ API Key ไปใส่ใน GitHub Secrets: APPS_SCRIPT_URL และ APPS_SCRIPT_API_KEY
 */

const FISCAL_YEAR_SOURCES = [
  {
    label: 'ปีงบประมาณ 2570 (หลัก)',
    fiscalYearHint: '2570',
    lab: {
      spreadsheetId: '1UKlPpsSqf66T27HBVT0OLkQODOAet5IOQ9U1dtJu_AE',
      gid: 1888082617,
    },
    drug: {
      spreadsheetId: '1QjCVyUXvjxmjHwwf1RRPPHEH1schsBsHGhSsAJXQpII',
      gid: 19318404,
    },
  },
  // เมื่อขึ้นปีงบประมาณใหม่ หากสร้างไฟล์ Google Sheet แยก สามารถเพิ่ม block ใหม่ด้านล่างนี้ได้เลย:
  // {
  //   label: 'ปีงบประมาณ 2571',
  //   fiscalYearHint: '2571',
  //   lab: { spreadsheetId: 'SPREADSHEET_ID_LAB_2571', gid: 0 },
  //   drug: { spreadsheetId: 'SPREADSHEET_ID_DRUG_2571', gid: 0 },
  // },
];

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(rawBody);
    const expectedKey = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_API_KEY') || '';

    if (!expectedKey || !payload || payload.apiKey !== expectedKey) {
      return jsonResponse({ ok: false, error: 'Unauthorized request' });
    }

    const labRows = [];
    const drugRows = [];
    const sources = [];

    FISCAL_YEAR_SOURCES.forEach(function (src) {
      const labResult = src.lab ? readSheetByGid(src.lab.spreadsheetId, src.lab.gid, src.fiscalYearHint) : [];
      const drugResult = src.drug ? readSheetByGid(src.drug.spreadsheetId, src.drug.gid, src.fiscalYearHint) : [];

      labResult.forEach(function (r) {
        labRows.push(r);
      });
      drugResult.forEach(function (r) {
        drugRows.push(r);
      });

      sources.push({
        label: src.label,
        labCount: labResult.length,
        drugCount: drugResult.length,
      });
    });

    const fetchedAt = Utilities.formatDate(new Date(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ss'+07:00'");

    return jsonResponse({
      ok: true,
      fetchedAt: fetchedAt,
      sources: sources,
      labRows: labRows,
      drugRows: drugRows,
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err && err.message ? err.message : 'Unexpected server error',
    });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    status: 'Primary Care Support API ready (use POST with apiKey)',
  });
}

function readSheetByGid(spreadsheetId, targetGid, fiscalYearHint) {
  if (!spreadsheetId) return [];
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheets = ss.getSheets();
  let targetSheet = null;

  for (let i = 0; i < sheets.length; i++) {
    if (Number(sheets[i].getSheetId()) === Number(targetGid)) {
      targetSheet = sheets[i];
      break;
    }
  }
  if (!targetSheet && sheets.length > 0) {
    targetSheet = sheets[0];
  }
  if (!targetSheet) return [];

  const values = targetSheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function (h) {
    return String(h || '').replace(/\s+/g, ' ').trim();
  });

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const rowArr = values[r];
    const hasAnyValue = rowArr.some(function (cell) {
      return cell !== '' && cell !== null && cell !== undefined;
    });
    if (!hasAnyValue) continue;

    const obj = { _sourceFiscalHint: fiscalYearHint || '' };
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      const cell = rowArr[c];
      if (Object.prototype.toString.call(cell) === '[object Date]' && !isNaN(cell.getTime())) {
        if (key.indexOf('ประทับเวลา') !== -1) {
          obj[key] = Utilities.formatDate(cell, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
        } else {
          obj[key] = Utilities.formatDate(cell, 'Asia/Bangkok', 'yyyy-MM-dd');
        }
      } else {
        obj[key] = cell === null || cell === undefined ? '' : String(cell).trim();
      }
    }
    rows.push(obj);
  }
  return rows;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
