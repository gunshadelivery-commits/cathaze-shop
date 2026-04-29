# CATHAZE SHOP - ระบบสั่งซื้อสินค้าออนไลน์

ระบบสั่งซื้อสินค้าออนไลน์สำหรับร้าน CATHAZE SHOP เชื่อมต่อกับ LINE OA

## ฟีเจอร์หลัก (v2.0.0)
- ⚡ **Extreme Convenience Checkout**: สั่งซื้อรวดเร็ว ใช้แค่เบอร์โทรและปักหมุดตำแหน่ง
- 📍 **Smart Location Pinning**: ปุ่มดึงพิกัด GPS ปัจจุบันเพื่อความแม่นยำในการจัดส่ง
- 🚀 **Image Optimization**: บีบอัดรูปภาพอัตโนมัติ (Retina + WebP)
- 📊 **Admin Dashboard**: ระบบสรุปยอดขาย กราฟรายวัน และจัดการสต็อกแบบ Real-time
- ⚙️ **Easy Config**: ตั้งค่าการเชื่อมต่อ API ต่างๆ ได้ง่ายผ่าน `src/config.js`

## การตั้งค่าเริ่มต้น
1. แก้ไข `src/config.js` ใส่ API Keys และ URLs ที่จำเป็น
2. `npm install` เพื่อติดตั้ง dependencies
3. `npm run dev` เพื่อรันในโหมด development
4. `npm run build` เพื่อ build สำหรับ production

## การเชื่อมต่อที่ต้องตั้งค่า
| บริการ | คำอธิบาย | วิธีหา |
|--------|----------|--------|
| Google Sheets | ฐานข้อมูลสินค้า/ออเดอร์ | Publish to web > CSV |
| Google Apps Script | Backend API | Deploy as Web App |
| LINE OA | แจ้งเตือนออเดอร์ | LINE Official Account Manager |
| ImgBB | อัปโหลดรูปภาพ | api.imgbb.com |