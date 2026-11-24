# ระบบติดตามและวิเคราะห์งานสนับสนุนเครือข่าย รพ.สต. (Lab & ทะเบียนเบิกยา)

Interactive Analytics Dashboard สำหรับติดตามและประมวลผลข้อมูลการสนับสนุน 2 ระบบ:
1. **รายการสนับสนุนส่งสิ่งส่งตรวจทางห้องปฏิบัติการ (Lab Support)**
2. **ทะเบียนเบิกยาที่ไม่มีใช้ใน รพ.สต. (Drug Support)**

---

## 1. การตั้งค่า Google Apps Script (คงความเป็นส่วนตัวของ Google Sheets)

1. เข้าสู่บัญชี Google ที่เป็นเจ้าของไฟล์ Google Sheets ทั้ง 2 ไฟล์ แล้วเปิด [Google Apps Script](https://script.google.com)
2. สร้างโปรเจกต์ใหม่ แล้วคัดลอกโค้ดทั้งหมดจาก [`apps-script/Code.gs`](apps-script/Code.gs) ไปวางแทนที่โค้ดเดิม
3. ไปที่ **Project Settings (รูปเฟือง)** → **Script Properties** → กด **Add script property**:
   - **Property:** `APPS_SCRIPT_API_KEY`
   - **Value:** กำหนดรหัสลับที่คาดเดายาก (เช่น สร้างตัวอักษรสุ่ม 32 ตัวขึ้นไป)
4. กด **Deploy** → **New deployment** → เลือกประเภท **Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
5. คัดลอก **Web app URL** (`https://script.google.com/macros/s/.../exec`) เก็บไว้ใช้ในขั้นตอนถัดไป

### การรองรับปีงบประมาณถัดไป (1 ต.ค. – 30 ก.ย.)
- หากบันทึกข้อมูลต่อเนื่องในชีทเดิม: ระบบเว็บแอปจะแยก **ปีงบประมาณ พ.ศ.** ให้อัตโนมัติจากคอลัมน์ `วันที่ดำเนินการ`
- หากขึ้นปีงบประมาณใหม่แล้วสร้างไฟล์ Google Sheets แยก: เพียงเพิ่มข้อมูล `spreadsheetId` และ `gid` ของปีงบประมาณใหม่ในตัวแปร `FISCAL_YEAR_SOURCES` ภายใน `apps-script/Code.gs` แล้วกด **Deploy → Manage deployments → แก้ไขเป็น New version** โดยไม่ต้องแก้โค้ดหน้าเว็บ

---

## 2. การตั้งค่า Username / Password และขึ้นระบบ GitHub Pages (Public Repo)

เพื่อความปลอดภัยเมื่อใช้ Public Repository **ห้ามใส่รหัสผ่านลงในโค้ด** ให้ตั้งค่าผ่าน GitHub Repository Settings เท่านั้น:

1. เปิด Repository บน GitHub → ไปที่ **Settings** → **Pages** → เลือก Source เป็น **GitHub Actions**
2. ไปที่ **Settings** → **Secrets and variables** → **Actions** → กด **New repository secret** เพื่อเพิ่มค่าทั้ง 4 รายการ:
   - `APP_USERNAME` : ชื่อผู้ใช้สำหรับเข้าสู่ระบบหน้าเว็บ
   - `APP_PASSWORD` : รหัสผ่านสำหรับเข้าสู่ระบบหน้าเว็บ
   - `APPS_SCRIPT_URL` : Web App URL ที่ได้จาก Google Apps Script
   - `APPS_SCRIPT_API_KEY` : รหัสลับที่ตั้งไว้ใน Script Properties ของ Apps Script
3. เมื่อ push โค้ดขึ้นสาขา `main` (หรือกด **Run workflow** ในแท็บ Actions) ระบบจะนำ `APP_USERNAME` และ `APP_PASSWORD` มาแปลงเป็น **Salted SHA-256 Hash** ระหว่าง Build โดยไม่มีรหัสผ่านจริงหลุดเข้าไปในไฟล์ Build หรือซอร์สโค้ด

---

## 3. การรันทดสอบในเครื่อง (Local Development)

```bash
npm install
npm test
npm run dev
```

*(ในโหมด Development หากยังไม่ได้สร้างไฟล์ `.env.local` สามารถทดลองเข้าสู่ระบบด้วยชุดข้อมูลตัวอย่างในเครื่องได้)*
