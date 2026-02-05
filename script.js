
let data = [], scanLocked = false;
let currentTotalZoom = 1.0;
let videoTrack = null;

// وظيفة التنبيه البصري فقط (بدون صوت)
function notify(text, isError = false) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.backgroundColor = isError ? '#ff9500' : '#34c759';
    t.innerText = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function cleanIMEI(t) {
    let n = t.replace(/\D/g, '');
    return n.length === 15 ? n : null;
}

function addRow(imei, model) {
    data.push({ model, imei });
    const i = data.length - 1;
    // الترتيب في الصف: موديل (يسار) ثم IMEI ثم حذف (يمين)
    const row = `<tr id="r${i}">
        <td style="text-align: left;">${model}</td>
        <td>${imei}</td>
        <td style="text-align: right;"><button style="border:none;background:none;color:red;font-size:18px" onclick="del(${i})">❌</button></td>
    </tr>`;
    document.getElementById('tableBody').insertAdjacentHTML('afterbegin', row);
}

function del(i) {
    data.splice(i, 1);
    const el = document.getElementById('r' + i);
    if(el) el.remove();
}

const html5QrCode = new Html5Qrcode("reader");

async function applyHybridZoom(targetValue) {
    if (!videoTrack) return;
    const videoElement = document.querySelector('#reader video');
    try {
        const capabilities = videoTrack.getCapabilities();
        let hwZoom = 1.0;
        if (capabilities.zoom) {
            hwZoom = Math.min(targetValue, capabilities.zoom.max);
            await videoTrack.applyConstraints({ advanced: [{ zoom: hwZoom }] });
        }
        let cssScale = targetValue / hwZoom;
        if (videoElement) videoElement.style.transform = `scale(${cssScale})`;
        currentTotalZoom = targetValue;
        document.getElementById('zoom-indicator').innerText = `Zoom: ${currentTotalZoom.toFixed(1)}x`;
    } catch (e) { console.error(e); }
}

function changeZoom(amount) { applyHybridZoom(Math.min(Math.max(currentTotalZoom + amount, 1.0), 10.0)); }
function setZoom(val) { applyHybridZoom(val); }

// تشغيل المسح التلقائي
function startScanner() {
    html5QrCode.start(
        { facingMode: "environment" }, 
        { 
            fps: 30, 
            qrbox: { width: 300, height: 120 },
            formatsToSupport: [ Html5QrcodeSupportedFormats.CODE_128 ]
        },
        (decodedText) => {
            if (scanLocked) return;

            const model = document.getElementById('model').value;
            const imei = cleanIMEI(decodedText);

            if (!imei) return;

            // التنبيه قبل المسح إذا لم يتم اختيار الجهاز
            if (!model) {
                scanLocked = true;
                notify("⚠️ يرجى اختيار نوع الجهاز قبل البدء بالمسح", true);
                setTimeout(() => scanLocked = false, 3000);
                return;
            }

            if (data.some(d => d.imei === imei)) {
                scanLocked = true;
                notify("⚠️ هذا الـ IMEI مكرر", true);
                setTimeout(() => scanLocked = false, 2500);
                return;
            }

            scanLocked = true;
            addRow(imei, model);
            notify("✅ تم المسح بنجاح");
            setTimeout(() => scanLocked = false, 2000);
        }
    ).then(() => {
        const videoElement = document.querySelector('#reader video');
        if (videoElement && videoElement.srcObject) videoTrack = videoElement.srcObject.getVideoTracks()[0];
    });
}

startScanner();

function downloadCSV() {
    if (data.length === 0) return alert("الجدول فارغ!");
    let csv = '\uFEFFModel,IMEI\n';
    data.forEach(d => csv += `${d.model},${d.imei}\n`);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

function addManual() {
    let imei = prompt('ادخل IMEI (15 رقم)');
    if (imei && /^[0-9]{15}$/.test(imei)) {
        let model = document.getElementById('model').value;
        if (model) addRow(imei, model);
        else alert("⚠️ اختر الموديل أولاً");
    }
}
