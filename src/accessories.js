import './style.css';
import shopLogoImg from './logo.png';

// --- LOGO FORCE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('shopLogo');
    if (logo) logo.src = shopLogoImg;
});

import Papa from 'papaparse';

import confetti from 'canvas-confetti';
import { SHEET_CSV_URL, GAS_URL, SHOP_NAME, SHOP_VERSION, buildLineUrl, getImgbbUploadUrl } from './config.js';

let products = []; // Keyed by Name
let cart = [];
let currentCategory = "All";
let currentLineUrl = "";

// --- AI: SMART STRAIN CLASSIFIER ---
const STRAIN_DB = {
    sativa: ["haze", "sour diesel", "durban", "jack herer", "green crack", "ghost train", "strawberry cough", "thai", "acapulco", "amnesia", "clem", "tangie"],
    indica: ["kush", "cake", "cookie", "northern lights", "purple", "berry", "grape", "afghan", "bubba", "granddaddy", "godfather", "white widow", "gorb", "runtz"],
    hybrid: ["gorilla", "glue", "wedding", "sherbert", "gelato", "z-", "lemon cherry", "skunk", "cheese", "blue dream", "mac", "ak-47", "girl scout"],
    accessories: ["bong", "grinder", "blender", "lighter", "บ้อง", "เครื่องบด", "เครื่องปั่น", "ไกเดอร์", "ไฟแช็ค", "หลุม"],
    rolling: ["paper", "roll", "raw", "ocb", "filter", "tips", "กระดาษ", "มวน", "ก้นกรอง", "พันลำ"]
};

function classifyStrain(name) {
    const n = name.toLowerCase();
    if (STRAIN_DB.sativa.some(s => n.includes(s))) return "Sativa";
    if (STRAIN_DB.indica.some(i => n.includes(i))) return "Indica";
    if (STRAIN_DB.hybrid.some(h => n.includes(h))) return "Hybrid";
    if (STRAIN_DB.accessories.some(a => n.includes(a))) return "Accessories";
    if (STRAIN_DB.rolling.some(r => n.includes(r))) return "Rolling";
    
    return "Other"; // Default for unknown strains
}

// --- CUSTOM UI: TOAST ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Secret Admin Access
let logoClickCount = 0;
let logoClickTimeout;
function handleLogoClick() {
    logoClickCount++;
    clearTimeout(logoClickTimeout);
    if (logoClickCount >= 5) { window.location.href = "admin.html"; logoClickCount = 0; }
    logoClickTimeout = setTimeout(() => { logoClickCount = 0; }, 2000);
}

function loadProductsFromSheet(callback) {
    if (!SHEET_CSV_URL) {
        console.warn("[CATHAZE] SHEET_CSV_URL ยังไม่ได้ตั้งค่าใน config.js");
        const grid = document.getElementById("productList");
        if (grid) grid.innerHTML = `<div class="col-span-2 text-center text-slate-400 py-10">⚙️ กรุณาตั้งค่า Google Sheets ในหน้า Admin ก่อน</div>`;
        return;
    }
    Papa.parse(SHEET_CSV_URL, {
        download: true, header: true,
        complete: function(results) {
            const data = results.data;
            const grouped = {};
            
            data.forEach(item => {
                if(!item.name) return;
                if(!grouped[item.name]) {
                    let tags = [];
                    if (item.tags) tags = item.tags.split(',').map(t => t.trim()).filter(t => t !== '');
                    grouped[item.name] = {
                        name: item.name,
                        note: item.note || '',
                        image: item.image || '',
                        tags: tags,
                        status: (item.status || '').trim().toLowerCase(),
                        variants: [],
                        selectedVariantIdx: 0,
                        totalSold: 0,
                        aiType: item["หมวดหมู่"] || classifyStrain(item.name)
                    };
                }
                
                const stock = parseInt(item.stock) || 0;
                const sold = parseInt(item.sold_count) || 0;
                
                grouped[item.name].variants.push({
                    size: item.size || 'Standard',
                    price: parseFloat(item.price) || 0,
                    stock: stock,
                    sold: sold
                });
                grouped[item.name].totalSold += sold;
            });

            products = Object.values(grouped);
            if (callback) callback();
        }
    });
}

function renderProducts(filter = "") {
    const grid = document.getElementById("productList"); // Note ID for accessories.html
    if (!grid) return;
    grid.innerHTML = "";
    let q = "";
    if (typeof filter === "string") q = filter.toLowerCase();
    
    // Apply Filters: Search + Category + Accessories Only
    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q);
        const matchesCategory = currentCategory === "All" || p.aiType === currentCategory;
        const isAccessory = ["Accessories", "Rolling"].includes(p.aiType);
        return matchesSearch && matchesCategory && isAccessory;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center text-slate-400 py-10">ไม่พบสินค้าในหมวดหมู่นี้</div>`;
        return;
    }

    filtered.forEach((p) => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-3xl p-3 border border-slate-50 flex flex-col animate-in";
        const isOutOfStock = p.status === 'หมด' || p.status === 'sold out' || p.status === '0';
        const variant = p.variants[p.selectedVariantIdx];
        const isVariantOutOfStock = variant.stock <= 0;

        card.innerHTML = `
            <div class="aspect-square bg-slate-50 rounded-2xl mb-3 relative overflow-hidden">
                <img src="${p.image}" class="w-full h-full object-cover ${isOutOfStock || isVariantOutOfStock ? 'grayscale opacity-50' : ''}" onerror="this.outerHTML='<span class=\\'text-3xl flex items-center justify-center h-full\\'>🏺</span>';" />
                ${(isOutOfStock || isVariantOutOfStock) ? `<div class="absolute inset-0 flex items-center justify-center"><span class="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full">หมด</span></div>` : ''}
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-slate-800 text-sm line-clamp-1">${p.name}</h3>
                <p class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">${p.note}</p>
                <div class="mt-2 flex items-center justify-between">
                    <p class="font-black text-slate-900 text-sm">${variant.price.toLocaleString()} ฿</p>
                    <button onclick="window.addToCart('${p.name.replace(/'/g, "\\'")}', ${p.selectedVariantIdx})" ${isOutOfStock || isVariantOutOfStock ? 'disabled' : ''} class="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition active:scale-90 disabled:opacity-20">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function switchCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.category-tab').forEach(t => {
        t.classList.remove('category-tab-active');
        t.classList.add('category-tab-inactive');
    });
    const tabEl = document.getElementById('tab-' + cat);
    if(tabEl) {
        tabEl.classList.remove('category-tab-inactive');
        tabEl.classList.add('category-tab-active');
    }
    renderProducts();
}

// Reuse cart logic from main.js or slightly adapt
function addToCart(pName, vIdx) {
    const product = products.find(p => p.name === pName);
    if (!product) return;
    const variant = product.variants[vIdx];
    const existing = cart.find(item => item.name === product.name && item.size === variant.size);
    if (existing) existing.qty++;
    else cart.push({ name: product.name, size: variant.size, price: variant.price, qty: 1, image: product.image });
    updateCartUI();
    toggleCart(true);
}

function toggleCart(force = null) {
    const sidebar = document.getElementById("cartSidebar");
    const content = document.getElementById("cartContent");
    const isOpen = force !== null ? force : sidebar.classList.contains("hidden");
    if (isOpen) {
        sidebar.classList.remove("hidden");
        setTimeout(() => content.classList.remove("translate-y-full"), 10);
    } else {
        content.classList.add("translate-y-full");
        setTimeout(() => sidebar.classList.add("hidden"), 300);
    }
}

function updateCartUI() {
    const container = document.getElementById("cartItems");
    const badge = document.getElementById("cartCount");
    const totalEl = document.getElementById("cartTotal");
    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
    let total = 0;
    container.innerHTML = cart.length === 0 ? `<div class="text-center py-20 text-slate-400">รถเข็นว่างเปล่า</div>` : '';
    cart.forEach((item, idx) => {
        total += item.price * item.qty;
        container.innerHTML += `
            <div class="flex gap-4 items-center">
                <img src="${item.image}" class="w-16 h-16 object-cover rounded-2xl bg-slate-50">
                <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-sm">${item.name}</h4>
                    <p class="text-xs text-slate-900 font-black mt-1">${item.price.toLocaleString()} ฿</p>
                </div>
                <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
                    <button onclick="window.updateQty(${idx}, -1)" class="w-6 h-6 flex items-center justify-center font-bold">-</button>
                    <span class="text-xs font-bold w-4 text-center">${item.qty}</span>
                    <button onclick="window.updateQty(${idx}, 1)" class="w-6 h-6 flex items-center justify-center font-bold">+</button>
                </div>
            </div>`;
    });
    totalEl.textContent = total.toLocaleString() + " ฿";
}

function updateQty(idx, change) {
    cart[idx].qty += change;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    updateCartUI();
}

// --- NEW: Settings & Map Logic ---
let shopSettings = null;
let deliveryFee = 0;
let mapInstance = null;
let markerInstance = null;

async function loadSettings() {
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "getSettings" })
        });
        const json = await res.json();
        if (json.result === 'success' && json.data) {
            shopSettings = json.data;
        }
    } catch (e) {
        console.error("Failed to load settings");
    }
}

function goToCheckout() { 
    document.getElementById('checkoutModal').classList.remove('hidden'); 
    
    // Setup Map
    if(!mapInstance) {
        let lat = shopSettings && shopSettings.shopLat ? parseFloat(shopSettings.shopLat) : 13.7563;
        let lng = shopSettings && shopSettings.shopLng ? parseFloat(shopSettings.shopLng) : 100.5018;
        
        mapInstance = L.map('mapContainer').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance);
        
        mapInstance.on('click', function(e) {
            updatePinAndFee(e.latlng.lat, e.latlng.lng);
        });
    } else {
        setTimeout(() => mapInstance.invalidateSize(), 100);
    }
    
    updatePaymentUI();
}

function updatePinAndFee(lat, lng) {
    if(markerInstance) mapInstance.removeLayer(markerInstance);
    markerInstance = L.marker([lat, lng]).addTo(mapInstance);
    
    document.getElementById('custLat').value = lat;
    document.getElementById('custLng').value = lng;
    document.getElementById('custMap').value = `https://www.google.com/maps?q=${lat},${lng}`;
    
    // Calculate distance and fee
    if (shopSettings && shopSettings.shopLat && shopSettings.shopLng && shopSettings.deliveryRate) {
        let shopLat = parseFloat(shopSettings.shopLat);
        let shopLng = parseFloat(shopSettings.shopLng);
        let rate = parseFloat(shopSettings.deliveryRate);
        
        let distKm = getDistanceFromLatLonInKm(shopLat, shopLng, lat, lng);
        deliveryFee = Math.ceil(distKm * rate);
        document.getElementById('deliveryFeeText').innerText = deliveryFee + " ฿ (ระยะทาง " + distKm.toFixed(1) + " กม.)";
    } else {
        deliveryFee = 0;
        document.getElementById('deliveryFeeText').innerText = "0 ฿ (ไม่ได้ตั้งค่าพิกัดร้าน/ค่าส่ง)";
    }
    updatePaymentUI();
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) { return deg * (Math.PI/180); }

function updatePaymentUI() {
    let subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    let finalTotal = subtotal + deliveryFee;
    
    const paymentBox = document.getElementById('paymentInfoBox');
    const details = document.getElementById('paymentDetails');
    const totalEl = document.getElementById('finalTotalPay');
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrImg = document.getElementById('promptpayQr');
    
    if (shopSettings && (shopSettings.accountNo || shopSettings.qrUrl)) {
        paymentBox.classList.remove('hidden');
        totalEl.innerText = `(รวมสุทธิ ${finalTotal.toLocaleString()} ฿)`;
        
        let html = '';
        if(shopSettings.bank) html += `<div>ธนาคาร: <b>${shopSettings.bank}</b></div>`;
        if(shopSettings.accountName) html += `<div>ชื่อบัญชี: <b>${shopSettings.accountName}</b></div>`;
        if(shopSettings.accountNo) html += `<div>เลขบัญชี: <b class="text-emerald-600">${shopSettings.accountNo}</b></div>`;
        
        details.innerHTML = html;
        
        if (shopSettings.qrUrl) {
            qrContainer.classList.remove('hidden');
            qrImg.src = shopSettings.qrUrl;
        } else {
            qrContainer.classList.add('hidden');
        }
    }
}

function closeCheckout() { document.getElementById('checkoutModal').classList.add('hidden'); }

function previewSlip(input) {
    if (input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('slipPreview').src = e.target.result;
            document.getElementById('slipPreview').classList.remove('hidden');
            document.getElementById('slipPlaceholder').classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function getCurrentLocationMap(event) {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `⏳...`;
    
    if (!navigator.geolocation) {
        showToast("เบราว์เซอร์ไม่รองรับ", "error");
        btn.disabled = false; btn.innerHTML = originalText;
        return;
    }
    
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;
        mapInstance.setView([lat, lng], 15);
        updatePinAndFee(lat, lng);
        btn.disabled = false; btn.innerHTML = "✅ สำเร็จ!";
        setTimeout(() => btn.innerHTML = originalText, 2000);
    }, err => {
        showToast("ไม่สามารถดึงพิกัดได้", "error");
        btn.disabled = false; btn.innerHTML = originalText;
    });
}

async function submitOrder() {
    const btn = document.getElementById('submitOrderBtn');
    const phone = document.getElementById('custPhone').value;
    const map = document.getElementById('custMap').value;
    const slip = document.getElementById('custSlip').files[0];
    const imgbbUrl = getImgbbUploadUrl();

    if(!phone || !map || !slip) return alert("กรุณากรอกข้อมูลให้ครบ");
    if(!imgbbUrl) return alert("ระบบยังไม่ได้ตั้งค่า ImgBB API Key");
    if(!GAS_URL) return alert("ระบบยังไม่ได้ตั้งค่า Google Apps Script");

    btn.disabled = true;
    btn.textContent = "กำลังดำเนินการ...";
    try {
        const formData = new FormData(); formData.append('image', slip);
        const imgRes = await fetch(imgbbUrl, { method: 'POST', body: formData });
        const imgData = await imgRes.json();
        
        let orderItems = cart.map(i => `${i.name} x${i.qty}`).join(', ');
        if (deliveryFee > 0) orderItems += `, ค่าจัดส่ง: ${deliveryFee} ฿`;
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const finalTotal = subtotal + deliveryFee;
        
        await fetch(GAS_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify({
                action: "log", name: "AccCust (" + phone + ")", phone, address: "Map: " + map,
                mapUrl: map, items: orderItems, total: finalTotal, slipUrl: imgData.data.url, status: "รอดำเนินการ"
            })
        });
        const itemsDetail = cart.map(i => `- ${i.name.toUpperCase()} x${i.qty}`).join('\n');
        const lineMsg = `🌿 ออเดอร์อุปกรณ์! [${SHOP_NAME} v${SHOP_VERSION}]
📞 เบอร์: ${phone}
📍 พิกัดจัดส่ง: ${map}

🛒 รายการ:
${itemsDetail}
${deliveryFee > 0 ? `🚚 ค่าจัดส่ง: ${deliveryFee} ฿\n` : ''}💰 ยอดรวม: ${finalTotal.toLocaleString()} บาท

🖼️ สลิป: ${imgData.data.url}`;
        currentLineUrl = buildLineUrl(lineMsg);
        document.getElementById('finalOrderTotal').textContent = finalTotal.toLocaleString() + " ฿";
        document.getElementById('successModal').classList.remove('hidden');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        if (currentLineUrl) {
            setTimeout(() => { window.location.href = currentLineUrl; }, 3000);
        }
    } catch(e) { alert("เกิดข้อผิดพลาด"); btn.disabled = false; btn.textContent = "สั่งซื้ออีกครั้ง"; }
}

window.toggleCart = toggleCart;
window.switchCategory = switchCategory;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.goToCheckout = goToCheckout;
window.closeCheckout = closeCheckout;
window.previewSlip = previewSlip;
window.getCurrentLocationMap = getCurrentLocationMap;
window.submitOrder = submitOrder;
window.redirectToLine = () => { if (currentLineUrl) window.open(currentLineUrl, '_blank'); else window.location.reload(); };

document.addEventListener('DOMContentLoaded', () => { 
    loadProductsFromSheet(renderProducts); 
    loadSettings();
});
