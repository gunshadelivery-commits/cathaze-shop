import './style.css';
import Papa from 'papaparse';
import Chart from 'chart.js/auto';
import shopLogoImg from './logo.png';

// --- LOGO FORCE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('shopLogo');
    if (logo) logo.src = shopLogoImg;
});

import { ADMIN_PASSWORD, ORDERS_CSV_URL, SHEET_CSV_URL as PRODUCTS_CSV_URL, GAS_URL, SHOP_NAME, SHOP_VERSION, checkConfigStatus, getImgbbUploadUrl } from './config.js';

let rawOrders = [];
let rawProducts = [];
let salesChart = null;
let isEditMode = false;
let originalVariants = [];
let oldProductName = "";
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
const MAX_PAGES = 5;

// --- DYNAMIC EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('shopLogo');
    if (logo) logo.src = shopLogoImg;
    
    if (localStorage.getItem('adminAuth') === 'true') {
        try { showDashboard(); } catch (e) { console.error(e); }
    }

    const catSelect = document.getElementById('pCategory');
    if(catSelect) {
        catSelect.addEventListener('change', (e) => {
            const isAcc = e.target.value === 'Accessories';
            document.querySelectorAll('.variant-row').forEach(row => {
                const sizeLabel = row.querySelector('label');
                const sizeInput = row.querySelector('.v-size');
                const sizeUnit = row.querySelector('span.absolute');
                if(isAcc) {
                    if(sizeLabel) sizeLabel.innerText = "รุ่น/แบบ";
                    if(sizeInput) { sizeInput.type = "text"; sizeInput.placeholder = "Standard"; sizeInput.value = sizeInput.value.replace('G', ''); }
                    if(sizeUnit) sizeUnit.innerText = "";
                } else {
                    if(sizeLabel) sizeLabel.innerText = "ขนาด";
                    if(sizeInput) { sizeInput.type = "number"; sizeInput.placeholder = "G"; }
                    if(sizeUnit) sizeUnit.innerText = "G";
                }
            });
        });
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function customConfirm(title, message, icon = '⚠️') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').innerText = title;
        document.getElementById('confirmMsg').innerText = message;
        document.getElementById('confirmIcon').innerText = icon;
        modal.classList.remove('hidden');
        const cleanup = (val) => { modal.classList.add('hidden'); document.getElementById('confirmOk').removeEventListener('click', okHandler); document.getElementById('confirmCancel').removeEventListener('click', cancelHandler); resolve(val); };
        const okHandler = () => cleanup(true);
        const cancelHandler = () => cleanup(false);
        document.getElementById('confirmOk').addEventListener('click', okHandler);
        document.getElementById('confirmCancel').addEventListener('click', cancelHandler);
    });
}

function addVariant(size = "", price = "", stock = 0, sold = 0, type = "herb") {
    let sizePlaceholder = type === 'accessory' ? "Standard" : "G";
    let sizeUnit = type === 'accessory' ? "" : "G";
    let sizeInputType = type === 'accessory' ? "text" : "number";
    const cleanSize = size.toString().replace('G', '');
    
    const row = document.createElement('div');
    row.className = 'variant-row flex items-center gap-2 animate-in fade-in slide-in-from-top-1 bg-slate-50 p-3 rounded-2xl border border-slate-100';
    row.innerHTML = `<div class="w-20"><label class="text-[10px] text-slate-400 font-bold uppercase">ขนาด/รุ่น</label><div class="relative mt-1"><input type="${sizeInputType}" step="0.1" placeholder="${sizePlaceholder}" value="${cleanSize}" class="v-size w-full border rounded-lg pl-2 pr-5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"><span class="absolute right-1.5 top-1.5 text-slate-400 text-[10px] font-bold">${sizeUnit}</span></div></div><div class="w-16"><label class="text-[10px] text-slate-400 font-bold uppercase">ราคา</label><input type="number" placeholder="฿" value="${price}" class="v-price w-full border rounded-lg px-2 py-1.5 mt-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"></div><div class="w-16"><label class="text-[10px] text-slate-400 font-bold uppercase">คลัง</label><input type="number" placeholder="ชิ้น" value="${stock}" class="v-stock w-full border rounded-lg px-2 py-1.5 mt-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"></div><div class="w-16"><label class="text-[10px] text-slate-400 font-bold uppercase">ขายแล้ว</label><input type="number" placeholder="ชิ้น" value="${sold}" class="v-sold w-full border rounded-lg px-2 py-1.5 mt-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"></div><button type="button" onclick="removeVariant(this)" class="mt-4 p-1 text-red-300 hover:text-red-500"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>`;
    document.getElementById('variantContainer').appendChild(row);
}
function removeVariant(btn) {
    const rows = document.querySelectorAll('.variant-row');
    if (rows.length > 1) btn.closest('.variant-row').remove();
    else alert("ต้องมีอย่างน้อยหนึ่งตัวเลือกราคา");
}

function compressImage(file, maxWidth = 1000, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' })); }, 'image/webp', quality);
            };
        };
        reader.onerror = reject;
    });
}

function switchTab(tabId) {
    document.querySelectorAll('main').forEach(m => m.classList.add('hidden'));
    const viewEl = document.getElementById('view-' + tabId);
    if (viewEl) viewEl.classList.remove('hidden');
    document.querySelectorAll('header button').forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-emerald-600'));
    const activeBtn = document.getElementById('tab-' + tabId);
    if (activeBtn) activeBtn.classList.add('bg-white', 'shadow-sm', 'text-emerald-600');
    if (tabId === 'products') loadProducts();
    else if (tabId === 'settings') renderSettings();
    else loadData();
}

function checkPass() {
    if (document.getElementById('passInput').value === ADMIN_PASSWORD) {
        localStorage.setItem('adminAuth', 'true');
        showToast("เข้าสู่ระบบเรียบร้อย", "success");
        showDashboard();
    } else {
        document.getElementById('errorMsg').classList.remove('hidden');
        showToast("รหัสผ่านผิด!", "error");
    }
}
function showDashboard() {
    const loginOverlay = document.getElementById('loginOverlay');
    if(loginOverlay) loginOverlay.classList.add('hidden');
    const dashboard = document.getElementById('dashboard');
    if(dashboard) dashboard.classList.remove('hidden');
    switchTab('overview');
}
function logout() { localStorage.removeItem('adminAuth'); location.reload(); }

function loadData() {
    if (!ORDERS_CSV_URL) { document.getElementById('monthlyTotal').textContent = "⚙️ ยังไม่ได้ตั้งค่า"; return; }
    Papa.parse(ORDERS_CSV_URL + "&t=" + Date.now(), {
        download: true, header: true, skipEmptyLines: true,
        complete: (results) => { 
            rawOrders = results.data.filter(order => order["วันที่-เวลา"] && order["ชื่อลูกค้า"]); 
            processSales(); 
        }
    });
}

function processSales() {
    const now = new Date();
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date(); oneMonthAgo.setDate(now.getDate() - 30);
    let totalLife = 0, totalMonth = 0, totalWeek = 0, countMonth = 0, countWeek = 0;
    const productCounts = {}, dailyStats = {};
    rawOrders.forEach(order => {
        const orderDate = new Date(order["วันที่-เวลา"]);
        const total = parseFloat(order["ยอดรวม"]) || 0;
        if (order["สถานะ"] === "ชำระเงินแล้ว") {
            totalLife += total;
            if (orderDate >= oneMonthAgo) { totalMonth += total; countMonth++; }
            if (orderDate >= oneWeekAgo) { totalWeek += total; countWeek++; }
            const dKey = orderDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            if (orderDate >= (new Date().setDate(now.getDate() - 14))) dailyStats[dKey] = (dailyStats[dKey] || 0) + total;
            if (order["รายการสินค้า"]) {
                order["รายการสินค้า"].split(',').forEach(it => { const n = it.split('(')[0].trim(); productCounts[n] = (productCounts[n] || 0) + 1; });
            }
        }
    });

    document.getElementById('monthlyTotal').textContent = totalMonth.toLocaleString() + " ฿";
    document.getElementById('monthlyCount').textContent = `${countMonth} รายการ`;
    document.getElementById('weeklyTotal').textContent = totalWeek.toLocaleString() + " ฿";
    document.getElementById('weeklyCount').textContent = `${countWeek} รายการ`;
    document.getElementById('avgOrder').textContent = (countMonth > 0 ? (totalMonth / countMonth).toFixed(2) : 0) + " ฿";
    document.getElementById('totalLifetime').textContent = `รวมทั้งหมด ${totalLife.toLocaleString()} ฿`;
    renderChart(dailyStats); renderTop(productCounts); renderOrdersTable();
}

function renderChart(dataMap) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const labels = [], values = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }); labels.push(k); values.push(dataMap[k] || 0); }
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ data: values, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

function renderTop(counts) {
    const list = document.getElementById('topProductsList'); list.innerHTML = "";
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([name, count]) => {
        list.innerHTML += `<div class="flex justify-between p-3 bg-slate-50 rounded-xl border"><span>${name}</span><span class="font-bold text-emerald-600">${count}</span></div>`;
    });
}

function renderOrdersTable() {
    const body = document.getElementById('orderTableBody'); 
    if(!body) return;
    body.innerHTML = "";
    const reversedOrders = [...rawOrders];
    const totalPages = Math.ceil(reversedOrders.length / ITEMS_PER_PAGE);
    if(currentPage > Math.min(totalPages, MAX_PAGES)) currentPage = 1;
    if(totalPages === 0) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentOrders = reversedOrders.slice(startIndex, endIndex);

    currentOrders.forEach(order => {
        const isConfirmed = order["สถานะ"] === "ชำระเงินแล้ว";
        const displayIdentity = order["เบอร์โทร"] || order["ชื่อลูกค้า"] || "N/A";
        const mapLink = order["ลิงก์แผนที่"] || "";
        const addressText = order["ที่อยู่"] || "";
        const dateStr = order["วันที่-เวลา"] ? order["วันที่-เวลา"].split('GMT')[0].trim() : "N/A";

        body.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                <td class="px-6 py-4 w-[180px] text-[11px] font-mono text-slate-400 whitespace-nowrap">${dateStr}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-700 text-sm">${displayIdentity}</span>
                        <div class="flex items-center gap-1">
                            <span class="text-[10px] text-slate-400 truncate max-w-[200px]">${addressText}</span>
                            ${mapLink ? `<a href="${mapLink}" target="_blank" class="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 hover:bg-white transition flex items-center gap-0.5">📍 แผนที่</a>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 w-[120px] font-bold text-slate-700 font-mono text-sm text-right">${parseFloat(order["ยอดรวม"] || 0).toLocaleString()} ฿</td>
                <td class="px-6 py-4 w-[120px] text-center">
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight ${isConfirmed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}">
                        ${order["สถานะ"] || "รอดำเนินการ"}
                    </span>
                </td>
                <td class="px-6 py-4 w-[160px] text-right">
                    <div class="flex justify-end gap-2">
                        <a href="${order["ลิงก์สลิป"]}" target="_blank" 
                           class="flex items-center gap-1 px-2.5 py-1.5 bg-white text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition active:scale-95 shadow-sm">
                            ดูสลิป
                        </a>
                        ${!isConfirmed ? `
                        <button id="btnConfirm-${order["เบอร์โทร"]}" onclick="updateConfirm('${(order["ชื่อลูกค้า"] || "").replace(/'/g, "\\'")}', '${order["ลิงก์สลิป"]}', this.id)" 
                                class="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition active:scale-95 shadow-md shadow-emerald-100">
                            รับยอด
                        </button>` : ''}
                    </div>
                </td>
            </tr>`;
    });
    updatePaginationUI(totalPages);
}

function updatePaginationUI(totalPages) {
    const actualTotalPages = Math.min(totalPages, MAX_PAGES);
    const indicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if(indicator) indicator.innerText = `หน้า ${currentPage} / ${actualTotalPages || 1} (ดูย้อนหลังสูงสุด ${MAX_PAGES} หน้า)`;
    if(prevBtn) prevBtn.disabled = currentPage <= 1;
    if(nextBtn) nextBtn.disabled = currentPage >= actualTotalPages;
}

window.changePage = function(delta) {
    currentPage += delta;
    renderOrdersTable();
};

async function updateConfirm(name, slip, btnId) {
    if (!(await customConfirm("ยืนยันออเดอร์", `ต้องการยืนยันการรับเงินของคุณ ${name} ใช่หรือไม่?`, "💰"))) return;
    showToast("กำลังอัปเดตสถานะ...", "success");
    
    // Disable button to prevent double click
    const btn = document.getElementById(btnId);
    if(btn) { btn.disabled = true; btn.textContent = "กำลังอัปเดต..."; }

    await fetch(GAS_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "updateStatus", name, slipUrl: slip, status: "ชำระเงินแล้ว" }) 
    });
    
    showToast("อัปเดตเรียบร้อย กรุณารอข้อมูลอัปเดตสักครู่", "success");
    setTimeout(loadData, 2000);
}

function loadProducts() {
    if (!PRODUCTS_CSV_URL) { document.getElementById('productTableBody').innerHTML = `<tr><td colspan="9" class="text-center py-10 text-slate-400">⚙️ กรุณาตั้งค่า Google Sheets ใน config.js</td></tr>`; return; }
    Papa.parse(PRODUCTS_CSV_URL + "&t=" + Date.now(), {
        download: true, header: true, skipEmptyLines: true,
        complete: (results) => { rawProducts = results.data; renderProductsTable(); }
    });
}

function renderProductsTable() {
    const body = document.getElementById('productTableBody'); body.innerHTML = "";
    const grouped = {};
    rawProducts.forEach(p => {
        if (!p.name) return;
        if (!grouped[p.name]) grouped[p.name] = { ...p, sizes: [], minPrice: Infinity, totalStock: 0, totalSold: 0 };
        grouped[p.name].sizes.push(p.size);
        grouped[p.name].minPrice = Math.min(grouped[p.name].minPrice, parseFloat(p.price) || 0);
        grouped[p.name].totalStock += (parseInt(p.stock) || 0);
        grouped[p.name].totalSold += (parseInt(p.sold_count) || 0);
    });
    Object.values(grouped).forEach(p => {
        const outOfStock = p.totalStock <= 0 || ['หมด', '0', 'sold out'].includes(p.status?.toLowerCase());
        body.innerHTML += `<tr><td class="px-6 py-3"><img src="${p.image}" class="w-10 h-10 object-cover rounded-lg bg-slate-100" onerror="this.src='https://via.placeholder.com/40?text=🛍️'"></td><td class="px-6 py-3 font-bold">${p.name}</td><td class="px-6 py-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">${p.category || 'N/A'}</span></td><td class="px-6 py-3 text-slate-500 text-xs">${p.sizes.join(', ')}</td><td class="px-6 py-3 font-bold text-emerald-600">${p.minPrice.toLocaleString()} ฿ +</td><td class="px-6 py-3 font-bold ${p.totalStock < 5 ? 'text-red-500' : 'text-slate-600'}">${p.totalStock}</td><td class="px-6 py-3 text-slate-400 font-bold">${p.totalSold}</td><td class="px-6 py-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${outOfStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">${outOfStock ? 'หมด' : 'มีของ'}</span></td><td class="px-6 py-3 text-right"><button onclick="editProduct('${p.name.replace(/'/g, "\\'")}')" class="p-2 text-slate-400 hover:text-emerald-600 transition">✏️</button><button onclick="deleteFullProduct('${p.name.replace(/'/g, "\\'")}')" class="p-2 text-slate-400 hover:text-red-500 transition">🗑️</button></td></tr>`;
    });
}

function toggleProductModal(show, mode = 'add', type = 'herb') {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalTitle');
    const btn = document.getElementById('saveProductBtn');
    isEditMode = mode === 'edit';
    
    if (show && mode === 'add') {
        const catSelect = document.getElementById('pCategory');
        if (type === 'accessory' && catSelect) {
            catSelect.value = 'Accessories';
        } else if (catSelect) {
            catSelect.value = 'Hybrid';
        }
    }

    title.innerText = isEditMode ? "แก้ไขสินค้า" : (type === 'accessory' ? "เพิ่มอุปกรณ์ใหม่" : "เพิ่มสมุนไพรใหม่");
    btn.innerText = isEditMode ? "บันทึกการแก้ไข" : "บันทึกและขึ้นขายทันที";
    
    if (!show) { 
        document.getElementById('productForm').reset(); 
        document.getElementById('variantContainer').innerHTML = ""; 
        addVariant('', '', 0, 0, 'herb'); 
    } else if (mode === 'add') {
        document.getElementById('variantContainer').innerHTML = ""; 
        addVariant('', '', 0, 0, type);
    }
    
    modal.classList.toggle('hidden', !show);
    
    // Trigger category change manually to update UI
    if (show) {
        const catSelect = document.getElementById('pCategory');
        if (catSelect) catSelect.dispatchEvent(new Event('change'));
    }
}

function editProduct(name) {
    const variants = rawProducts.filter(p => p.name === name);
    if (variants.length === 0) return;
    const base = variants[0];
    oldProductName = name;
    originalVariants = variants.map(v => ({ size: v.size, price: v.price }));
    document.getElementById('pName').value = base.name;
    document.getElementById('pCategory').value = base.category || "Hybrid";
    document.getElementById('pNote').value = base.note || "";
    document.getElementById('pTags').value = base.tags || "";
    document.getElementById('productForm').dataset.existingImage = base.image || "";
    const container = document.getElementById('variantContainer'); container.innerHTML = "";
    variants.forEach(v => addVariant(v.size, v.price, v.stock, v.sold_count));
    toggleProductModal(true, 'edit');
}

async function deleteFullProduct(name) {
    if (!(await customConfirm("ลบสินค้า", `คุณแน่ใจใช่ไหมที่จะลบ "${name}" ออกจากระบบถาวร?`, "🗑️"))) return;
    showToast("กำลังลบข้อมูล...", "success");
    const variants = rawProducts.filter(p => p.name === name);
    for (let v of variants) { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "deleteProduct", name: v.name.trim(), size: v.size.toString().trim() }) }); 
    }
    showToast("ลบสินค้าเรียบร้อยแล้ว", "success");
    setTimeout(loadProducts, 2000);
}

async function saveProduct() {
    const btn = document.getElementById('saveProductBtn');
    const fileInput = document.getElementById('pImage');
    const name = document.getElementById('pName').value;
    const category = document.getElementById('pCategory').value;
    const note = document.getElementById('pNote').value;
    const tags = document.getElementById('pTags').value;
    const variantRows = document.querySelectorAll('.variant-row');
    const isHerb = ["Indica", "Sativa", "Hybrid"].includes(category);
    const variants = Array.from(variantRows).map(row => {
        let sizeVal = row.querySelector('.v-size').value;
        if (!sizeVal && !isHerb) sizeVal = "Standard";
        if (sizeVal && !sizeVal.toString().endsWith('G') && isHerb) sizeVal += 'G';
        return { size: sizeVal, price: row.querySelector('.v-price').value, stock: row.querySelector('.v-stock').value || 0, sold: row.querySelector('.v-sold').value || 0 };
    }).filter(v => v.size && v.price && (isHerb ? v.size !== 'G' : true));
    if (!name || variants.length === 0) return alert("กรุณากรอกข้อมูลที่สำคัญให้ครบ");
    btn.disabled = true;
    btn.innerHTML = isEditMode ? "กำลังบันทึก..." : "กำลังอัปโหลดรูป...";
    let imageUrl = document.getElementById('productForm').dataset.existingImage || "";
    const imgbbUrl = getImgbbUploadUrl();
    if (fileInput.files.length > 0 && imgbbUrl) {
        try {
            btn.innerHTML = "กำลังบีบอัดรูปภาพ...";
            const optimizedImg = await compressImage(fileInput.files[0]);
            btn.innerHTML = "กำลังอัปโหลดรูปภาพ...";
            const formData = new FormData(); formData.append('image', optimizedImg);
            const imgRes = await fetch(imgbbUrl, { method: 'POST', body: formData });
            const imgData = await imgRes.json();
            if (imgData.success) imageUrl = imgData.data.url;
        } catch (e) { console.error("Img Upload Fail", e); showToast("อัปโหลดรูปภาพล้มเหลว", "error"); }
    }
    try {
        if (isEditMode) {
            const toUpdate = [], toAdd = [];
            variants.forEach((v, idx) => { if (idx < originalVariants.length) toUpdate.push({ variant: v, oldSize: originalVariants[idx].size }); else toAdd.push(v); });
            const toDelete = originalVariants.slice(variants.length);

            for (let item of toUpdate) {
                await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "updateProduct", oldName: oldProductName.trim(), oldSize: item.oldSize.toString().trim(), name: name.trim(), category, note, tags, image: imageUrl, size: item.variant.size.toString().trim(), price: item.variant.price, stock: item.variant.stock, sold_count: item.variant.sold, status: parseInt(item.variant.stock) > 0 ? "มีของ" : "หมด" }) });
            }
            for (let v of toAdd) {
                await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "addProduct", name: name.trim(), category, note, tags, image: imageUrl, size: v.size.toString().trim(), price: v.price, stock: v.stock, sold_count: v.sold, status: parseInt(v.stock) > 0 ? "มีของ" : "หมด" }) });
            }
            for (let oldV of toDelete) {
                await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "deleteProduct", name: oldProductName.trim(), size: oldV.size.toString().trim() }) });
            }
        } else {
            for (let variant of variants) {
                await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "addProduct", name: name.trim(), category, note, tags, image: imageUrl, size: variant.size.toString().trim(), price: variant.price, stock: variant.stock, sold_count: variant.sold, status: parseInt(variant.stock) > 0 ? "มีของ" : "หมด" }) });
            }
        }
        showToast(isEditMode ? "แก้ไขข้อมูลสำเร็จ!" : "เพิ่มสินค้าสำเร็จ!", "success");
        toggleProductModal(false); 
        setTimeout(loadProducts, 2000);
    } catch (err) {
        console.error("Save Error:", err);
        showToast("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = isEditMode ? "บันทึกการแก้ไข" : "บันทึกและขึ้นขายทันที";
    }
}

// --- SETTINGS TAB: Render Config Status ---
function renderSettings() {
    const container = document.getElementById('settingsContent');
    if (!container) return;
    const status = checkConfigStatus();
    let html = '';
    Object.entries(status).forEach(([key, item]) => {
        const statusIcon = item.ok ? '✅' : '⚠️';
        const statusColor = item.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700';
        html += `<div class="p-4 rounded-2xl border ${statusColor} flex justify-between items-center"><div><p class="font-bold text-sm">${statusIcon} ${item.label}</p><p class="text-xs opacity-70 mt-1">${item.value}</p></div></div>`;
    });
    container.innerHTML = html;
}

// === EXPOSE GLOBALS ===
window.checkPass = checkPass;
window.logout = logout;
window.switchTab = switchTab;
window.loadData = loadData;
window.updateConfirm = updateConfirm;
window.toggleProductModal = toggleProductModal;
window.editProduct = editProduct;
window.deleteFullProduct = deleteFullProduct;
window.saveProduct = saveProduct;
window.addVariant = addVariant;
window.removeVariant = removeVariant;
