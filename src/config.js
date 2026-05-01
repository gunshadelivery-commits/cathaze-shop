// ============================================================
// CATHAZE SHOP - Central Configuration
// ============================================================
// แก้ไขค่าต่างๆ ในไฟล์นี้เพียงไฟล์เดียว เพื่อเชื่อมต่อกับระบบภายนอก
// ไม่ต้องไปแก้ไขไฟล์อื่นๆ เลย
// ============================================================

// --- ข้อมูลร้าน (Shop Branding) ---
export const SHOP_NAME = "CATHAZE SHOP";
export const SHOP_VERSION = "2.0.0";
export const SHOP_TAGLINE = "สินค้าคุณภาพ ส่งตรงถึงมือคุณ";
export const SHOP_DESCRIPTION = "ระบบสั่งซื้อสินค้าออนไลน์";

// --- Google Sheets CSV URL ---
// วิธีหา: เปิด Google Sheets > File > Share > Publish to web > CSV
// หรือใช้ URL format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv
export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1K3ISAk-bpZv8csZyNy-H4Gl5XIVkmDJvHSJD1Wd2wo4/gviz/tq?tqx=out:csv";

// --- Google Sheets Orders CSV URL ---
// URL สำหรับดึงข้อมูล Orders (ต้องระบุ gid ของ sheet "Orders")
// format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={ORDERS_SHEET_GID}
export const ORDERS_CSV_URL = "https://docs.google.com/spreadsheets/d/1K3ISAk-bpZv8csZyNy-H4Gl5XIVkmDJvHSJD1Wd2wo4/export?format=csv&gid=314414074";

// --- Google Apps Script (GAS) Web App URL ---
// วิธีหา: ใน Google Apps Script Editor > Deploy > New Deployment > Web App > Copy URL
export const GAS_URL = "https://script.google.com/macros/s/AKfycbxQ9K6Lpp4yQfseIlIHmz1A0vfunEhWoWtKklZGdfxc38GHKpuiJBD_a8VZCbhYAPI6GQ/exec";

// --- LINE OA ID ---
// LINE Official Account ID ของร้าน (เช่น @xxxxx)
// ใช้สำหรับส่งข้อความแจ้งออเดอร์ไปยัง LINE OA
export const LINE_OA_ID = "@854imzgo";

// --- ImgBB API Key ---
// ใช้สำหรับอัปโหลดรูปภาพสินค้าและสลิปโอนเงิน
// สมัครฟรีได้ที่: https://api.imgbb.com/
export const IMGBB_API_KEY = "1e0a95b20996f7ce4237b7d798998840";

// --- Admin Password ---
// รหัสผ่านสำหรับเข้าหน้า Admin Panel
export const ADMIN_PASSWORD = "cathaze888";

// --- GitHub Pages Base Path ---
// ชื่อ repository สำหรับ deploy บน GitHub Pages
// ถ้า deploy ที่ root ให้ใส่ "/"
export const BASE_PATH = "/cathaze-shop/";

// ============================================================
// ฟังก์ชันช่วยเหลือ (Helper Functions)
// ============================================================

/**
 * สร้าง LINE OA Message URL
 * @param {string} message - ข้อความที่จะส่ง
 * @returns {string} LINE URL scheme
 */
export function buildLineUrl(message) {
    if (LINE_OA_ID) {
        // Use direct OA message scheme to avoid the "Share with" picker
        const encodedId = encodeURIComponent(LINE_OA_ID);
        return `https://line.me/R/oaMessage/${encodedId}/?${encodeURIComponent(message)}`;
    }
    // Fallback to share scheme if no OA ID is provided
    return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
}

/**
 * สร้าง ImgBB Upload URL
 * @returns {string} ImgBB API endpoint with key
 */
export function getImgbbUploadUrl() {
    if (!IMGBB_API_KEY) {
        console.warn("[CONFIG] IMGBB_API_KEY ยังไม่ได้ตั้งค่า!");
        return "";
    }
    return `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
}

/**
 * ตรวจสอบว่า config พร้อมใช้งานหรือยัง
 * @returns {object} สถานะของแต่ละ config
 */
export function checkConfigStatus() {
    return {
        shopName: { label: "ชื่อร้าน", value: SHOP_NAME, ok: !!SHOP_NAME },
        sheetCsv: { label: "Google Sheets (Products)", value: SHEET_CSV_URL ? "✅ เชื่อมต่อแล้ว" : "❌ ยังไม่ได้ตั้งค่า", ok: !!SHEET_CSV_URL },
        ordersCsv: { label: "Google Sheets (Orders)", value: ORDERS_CSV_URL ? "✅ เชื่อมต่อแล้ว" : "❌ ยังไม่ได้ตั้งค่า", ok: !!ORDERS_CSV_URL },
        gasUrl: { label: "Google Apps Script", value: GAS_URL ? "✅ เชื่อมต่อแล้ว" : "❌ ยังไม่ได้ตั้งค่า", ok: !!GAS_URL },
        lineOa: { label: "LINE OA", value: LINE_OA_ID || "❌ ยังไม่ได้ตั้งค่า", ok: !!LINE_OA_ID },
        imgbb: { label: "ImgBB API", value: IMGBB_API_KEY ? "✅ เชื่อมต่อแล้ว" : "❌ ยังไม่ได้ตั้งค่า", ok: !!IMGBB_API_KEY },
    };
}
