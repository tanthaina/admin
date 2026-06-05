    async function loadAdminData() {
        const btn = document.getElementById('refreshAdminBtn');
        if (btn) { btn.disabled = true; btn.innerText = "⏳ กำลังโหลด..."; }
        currentViewDate = ""; document.getElementById('resetTodayBtn').style.display = "none"; document.getElementById('historyDateInput').value = "";
        document.getElementById('applyPenaltyBtn').style.display = "none";
        let today = new Date();
        document.getElementById('reportMonthInput').value = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
        document.getElementById('adminSearchInput').value = ""; // เคลียร์ช่องค้นหา
        document.getElementById('reportContentArea').style.display = "none";
        document.getElementById('vipContentArea').style.display = "none"; document.getElementById('vipSearchInput').value = "";
        document.getElementById('adminPanelTitle').innerText = "📊 สรุปยอด 12 ชม.ล่าสุด"; document.getElementById('adminListTitle').innerText = "👥 จัดการนักกีฬาทั้งหมด";
        document.getElementById('unpaidCardBox').style.display = "block";
        document.getElementById('walkInCard').style.display = "block";
        document.getElementById('monthlyReportCard').style.display = "block";
        document.getElementById('vipManageCard').style.display = "block";
        await renderAdminUI(getApiUrl(), { action: "getAdminData", uid: userUid }, true);
        if (btn) { btn.disabled = false; btn.innerText = "🔄 รีเฟรชข้อมูล"; }
    }

    async function fetchHistory() {
        let dateVal = document.getElementById('historyDateInput').value; 
        if(!dateVal) { showToast("กรุณาเลือกวันที่ก่อนครับ", "error"); return; }
        const btn = document.querySelector('button[onclick="fetchHistory()"]');
        if(btn) { btn.disabled = true; btn.innerText = "⏳..."; }
        currentViewDate = dateVal; let d = new Date(dateVal);
        let formattedDate = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        document.getElementById('adminPanelTitle').innerText = "📅 ประวัติยอดเงิน ณ วันที่ " + formattedDate;
        document.getElementById('adminListTitle').innerText = "👥 รายชื่อนักกีฬาเมื่อ " + formattedDate;
        document.getElementById('resetTodayBtn').style.display = "block"; document.getElementById('unpaidCardBox').style.display = "none"; document.getElementById('walkInCard').style.display = "none";
        document.getElementById('monthlyReportCard').style.display = "none";
        document.getElementById('vipManageCard').style.display = "none";
        await renderAdminUI(getApiUrl(), { action: "getHistoryData", uid: userUid, targetDate: dateVal }, false);
        if(btn) { btn.disabled = false; btn.innerText = "🔍 ค้นหา"; }
    }

    async function fetchMonthlyReport() {
        let mVal = document.getElementById('reportMonthInput').value;
        if(!mVal) { showToast("กรุณาเลือกเดือนก่อนครับ", "error"); return; }
        let btn = document.querySelector('button[onclick="fetchMonthlyReport()"]');
        btn.disabled = true; btn.innerText = "⏳...";
        try {
            let res = await fetch(getApiUrl(), { method: 'POST', body: JSON.stringify({ action: "getMonthlyReport", uid: userUid, targetMonth: mVal }) });
            let r = await res.json();
            if (r.status === "success") {
                document.getElementById('reportContentArea').style.display = 'block';
                document.getElementById('rep_total').innerText = r.stats.total.toLocaleString();
                document.getElementById('rep_daily').innerText = r.stats.daily.toLocaleString();
                document.getElementById('rep_vip').innerText = r.stats.vip.toLocaleString();
                document.getElementById('rep_pax').innerText = r.stats.pax.toLocaleString();
                document.getElementById('rep_unpaid').innerText = r.stats.unpaid.toLocaleString();
                
                // 🛡️ ป้องกันกราฟบั๊ก กรณีไม่มีเน็ตโหลด Chart.js หรือยอดเงินเป็น 0
                let chartBox = document.getElementById('chartContainerBox');
                if (r.stats.total > 0 && typeof Chart !== 'undefined') {
                    chartBox.style.display = 'block';
                    if (monthlyChartInstance) { monthlyChartInstance.destroy(); } // ลบกราฟเก่าทิ้งก่อนวาดใหม่
                    const ctx = document.getElementById('monthlyChart').getContext('2d');
                    monthlyChartInstance = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['ค่าสนามรายวัน', 'ค่าสมาชิก VIP'],
                            datasets: [{
                                data: [r.stats.daily, r.stats.vip],
                                backgroundColor: ['#3b82f6', '#f59e0b'],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom', labels: { font: { family: '-apple-system, sans-serif' } } },
                            tooltip: { callbacks: { label: function(context) { return ' ' + context.label + ': ' + context.raw.toLocaleString() + ' บาท'; } } } }
                        }
                    });
                } else {
                    chartBox.style.display = 'none'; // ซ่อนกราฟถ้ายอดเป็น 0 หรือไลบรารีไม่ทำงาน
                }
            } else { showToast(r.message, "error"); }
        } catch (e) {
            console.error("[REP_01] Fetch Report Error:", e);
            showToast("⚠️ โหลดข้อมูลล้มเหลว [REP_01]", "error");
        } finally { btn.disabled = false; btn.innerText = "🔍 ดึงยอด"; }
    }

    function copyMonthlyReport() {
        let mVal = document.getElementById('reportMonthInput').value;
        let [y, m] = mVal.split("-");
        let monthName = new Date(y, m - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        let total = document.getElementById('rep_total').innerText;
        let daily = document.getElementById('rep_daily').innerText;
        let vip = document.getElementById('rep_vip').innerText;
        let pax = document.getElementById('rep_pax').innerText;
        let unpaid = document.getElementById('rep_unpaid').innerText;
        let msg = `📈 *สรุปบัญชีชมรมแบดมินตันตากฟ้า*\nประจำเดือน: ${monthName}\n\n`;
        msg += `💰 *รายรับรวมทั้งเดือน: ${total} บาท*\n`;
        msg += `├ 🏸 ค่าสนามรายวัน: ${daily} บาท\n`;
        msg += `└ 👑 ค่าสมาชิก VIP: ${vip} บาท\n\n`;
        msg += `👥 จำนวนการใช้สนาม: ${pax} ครั้ง\n`;
        if (unpaid !== "0") msg += `🔴 ยอดหนี้ค้างชำระ: ${unpaid} บาท\n`;
        msg += `\n🙏 ขอบคุณสมาชิกทุกท่านที่ให้ความร่วมมือครับ`;
        navigator.clipboard.writeText(msg).then(() => { showToast("📋 คัดลอกรายงานสรุปสำเร็จ", "success"); }).catch(e => showToast("⚠️ อุปกรณ์ไม่รองรับการคัดลอกอัตโนมัติ", "error"));
    }

    async function renderAdminUI(url, bodyObj, isToday) {
        document.getElementById('ad_pax').innerText = "...";
        
        let skeletonHtml = `
            <div class="skeleton-row"><div class="skeleton skeleton-avatar" style="width:40px; height:40px;"></div><div style="flex: 1;"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div>
            <div class="skeleton-row"><div class="skeleton skeleton-avatar" style="width:40px; height:40px;"></div><div style="flex: 1;"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div>
            <div class="skeleton-row"><div class="skeleton skeleton-avatar" style="width:40px; height:40px;"></div><div style="flex: 1;"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div>
        `;
        document.getElementById('adminAllArea').innerHTML = skeletonHtml;
        if (isToday) document.getElementById('adminUnpaidArea').innerHTML = skeletonHtml;
        try {
            let res = await fetch(url, { method: 'POST', body: JSON.stringify(bodyObj) });
            let r = await res.json();
            if (r.status === "success") {
                document.getElementById('ad_pax').innerText = r.stats.totalPax; document.getElementById('ad_exp').innerText = r.stats.expected;
                document.getElementById('ad_paid').innerText = r.stats.paid; document.getElementById('ad_unpaid').innerText = r.stats.unpaid;
                globalUnpaidList = r.unpaidList; document.getElementById('copyDebtBtn').style.display = (r.unpaidList.length > 0) ? "block" : "none";

                if (isToday) {
                    let unpaidArea = document.getElementById('adminUnpaidArea');
                    let upHTML = "";
                    const groups = r.unpaidGroups || {};

                    for (const key in groups) {
                        const group = groups[key];
                        if (group.isGroup) {
                            const firstMember = group.members[0];
                                const matchId = group.slipUrl.match(/[-\w]{25,}/);
                                const slipThumbUrl = matchId ? `https://drive.google.com/thumbnail?id=${matchId[0]}&sz=w100` : "";
                            let membersHtml = "";
                            group.members.forEach(m => {
                                let reqDeleteBtn = m.status === "⚠️ ขอลบรายการ" ? `<button class="admin-action-btn" style="background:#ef4444;" onclick="adminAction('${m.time}', '${m.uid}', 'delete', this)">🗑️ อนุมัติลบ</button> <button class="admin-action-btn" style="background:#f59e0b;" onclick="adminAction('${m.time}', '${m.uid}', 'rejectDelete', this)">❌ ปฏิเสธขอลบ</button>` : '';
                                let promoteBtn = (!m.uid.includes("FRIEND_OF_") && m.name !== "โอนแทนเพื่อน") ? `<button class="admin-action-btn" style="background:#f59e0b;" onclick="adminAction('${m.time}', '${m.uid}', 'promote_vip', this)">⭐ รายเดือน</button> <button class="admin-action-btn" style="background:#d97706;" onclick="adminAction('${m.time}', '${m.uid}', 'promote_yearly', this)">👑 รายปี</button>` : '';
                                membersHtml += `<div class="admin-sub-item" style="display:block;">
                                    <div style="margin-bottom:4px;"><span>${m.name} (${m.cost} บ.)</span> <span style="color:#ef4444; font-size:11px; font-weight:bold; margin-left:5px;">[${m.status}]</span></div>
                                    <div>
                                        ${reqDeleteBtn}
                                        <button class="admin-action-btn" style="background:#16a34a;" onclick="adminAction('${m.time}', '${m.uid}', 'confirmPay', this)">✅ รับ</button>
                                        ${promoteBtn}
                                        <button class="admin-action-btn" style="background:#6b7280;" onclick="adminAction('${m.time}', '${m.uid}', 'write_off', this)">🧹 ยกหนี้</button>
                                    </div>
                                </div>`;
                            });

                            upHTML += `<div class="admin-group-card">
                                <div class="admin-group-header">
                                    <img src="${slipThumbUrl}" class="admin-group-slip-thumb" onclick="openSlipModal('${group.slipUrl}', '${firstMember.time}', '${firstMember.uid}', '⏳ รอตรวจ')">
                                    <div class="admin-group-details">
                                        <b style="color:#8b5cf6">ยอดรวมสลิป: ${group.totalCost} บาท</b>
                                        <div style="font-size:12px;">${group.members.map(m => m.name).join(', ')}</div>
                                    ${(group.note && group.note !== "-") ? `<div style="font-size:12px; color:#2563eb; font-weight:bold; word-break: break-all;">📝 หมายเหตุ: ${group.note}</div>` : ''}
                                    </div>
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <button class="admin-action-btn" style="background:#16a34a; flex:1; padding:8px;" onclick="adminAction('${firstMember.time}', '${firstMember.uid}', 'confirmPay', this)">✅ อนุมัติสลิป</button>
                                    <button class="admin-action-btn" style="background:#ef4444; flex:1; padding:8px;" onclick="adminAction('${firstMember.time}', '${firstMember.uid}', 'rejectSlip', this)">❌ ปฏิเสธสลิป</button>
                                </div>
                                <div style="text-align:center; font-size:12px; margin-top:5px; color:#6b7280;">หรือจัดการแยกคน:</div>
                                <div class="admin-sub-items-container">${membersHtml}</div>
                            </div>`;
                        } else { // Individual, no slip
                            const u = group.members[0];
                            let reqDeleteBtn = u.status === "⚠️ ขอลบรายการ" ? `<button class="admin-action-btn" style="background:#ef4444;" onclick="adminAction('${u.time}', '${u.uid}', 'delete', this)">🗑️ อนุมัติลบ</button> <button class="admin-action-btn" style="background:#f59e0b;" onclick="adminAction('${u.time}', '${u.uid}', 'rejectDelete', this)">❌ ปฏิเสธขอลบ</button>` : '';
                            let promoteBtn = (!u.uid.includes("FRIEND_OF_") && u.name !== "โอนแทนเพื่อน") ? `<button class="admin-action-btn" style="background:#f59e0b;" onclick="adminAction('${u.time}', '${u.uid}', 'promote_vip', this)">⭐ รายเดือน</button> <button class="admin-action-btn" style="background:#d97706;" onclick="adminAction('${u.time}', '${u.uid}', 'promote_yearly', this)">👑 รายปี</button>` : '';
                            let noteTxt = (u.note && u.note !== "-") ? `<div style="font-size:12px; color:#2563eb; margin-top:3px; font-weight:bold; word-break: break-all;">📝 หมายเหตุ: ${u.note}</div>` : '';
                            upHTML += `<div class="admin-individual-card"><b>${u.name}</b> (ยอด ${u.cost} บาท) ${noteTxt}<span style="font-size: 12px; color: #ef4444; font-weight: bold; display:block; margin-top:2px;">${u.status}</span><div style="margin-top:6px;">${reqDeleteBtn} <button class="admin-action-btn" style="background:#16a34a;" onclick="adminAction('${u.time}', '${u.uid}', 'confirmPay', this)">✅ รับ</button> ${promoteBtn} <button class="admin-action-btn" style="background:#6b7280;" onclick="adminAction('${u.time}', '${u.uid}', 'write_off', this)">🧹 ยกหนี้</button></div></div>`;
                        }
                    }
                unpaidArea.innerHTML = upHTML ? `<div class="fade-in">${upHTML}</div>` : "ไม่มีรายการค้างชำระ";
                }
                
                document.getElementById('applyPenaltyBtn').style.display = (!isToday && r.stats.unpaid > 0) ? "block" : "none";

                let allowEditHistory = (!isToday && currentViewDate !== ""); // ปลดล็อกให้แก้ไขประวัติย้อนหลังได้ไม่จำกัดวัน

                let allHTML = "";
                r.todayList.forEach(a => {
                    let isFriend = a.uid.includes("FRIEND_OF_"); let promoteBtn = "";
                    if (!isFriend && a.name !== "โอนแทนเพื่อน") {
                        if (a.tierType === "STUDENT") promoteBtn = (isToday || allowEditHistory) ? `<button class="admin-action-btn" style="background:#dc2626;" onclick="adminAction('${a.time}', '${a.uid}', 'revoke', this)">❌ ปลดออก</button>` : '';
                        else if (a.tierType === "VIP" || a.tierType === "YEARLY") promoteBtn = (isToday || allowEditHistory) ? `<button class="admin-action-btn" style="background:#dc2626;" onclick="adminAction('${a.time}', '${a.uid}', 'revoke', this)">❌ ปลดสิทธิ์</button>` : '';
                        else { promoteBtn = (isToday || allowEditHistory) ? `<button class="admin-action-btn" style="background:#3b82f6;" onclick="adminAction('${a.time}', '${a.uid}', 'promote_student', this)">🎓 นศ.</button> <button class="admin-action-btn" style="background:#f59e0b;" onclick="adminAction('${a.time}', '${a.uid}', 'promote_vip', this)">⭐ รายเดือน</button> <button class="admin-action-btn" style="background:#d97706;" onclick="adminAction('${a.time}', '${a.uid}', 'promote_yearly', this)">👑 รายปี</button>` : ''; }
                    }
                    let historyPayBtn = (!isToday && allowEditHistory && (a.status.includes("❌") || a.status.includes("⏳") || a.status.includes("⚠️"))) ? `<button class="admin-action-btn" style="background:#16a34a;" onclick="adminAction('${a.time}', '${a.uid}', 'confirmPay', this)">✅ รับเงินย้อนหลัง</button> <button class="admin-action-btn" style="background:#6b7280;" onclick="adminAction('${a.time}', '${a.uid}', 'write_off', this)">🧹 ยกหนี้</button>` : '';
                    let slipBtnAll = (a.slipUrl && a.slipUrl !== "-") ? `<button class="admin-action-btn" style="background:#0284c7;" onclick="openSlipModal('${a.slipUrl}', '${a.time}', '${a.uid}', '${a.status}')">📄 ดูสลิป</button>` : '';
                    let noteTxtAll = (a.note && a.note !== "-") ? `<span style="color:#2563eb; font-weight:bold; word-break: break-all;"> [หมายเหตุ: ${a.note}]</span>` : '';
                    let revertBtn = "";
                    if ((isToday || allowEditHistory) && a.status.includes("✅") && a.cost > 0 && !a.status.includes("ฟรี") && !a.status.includes("เหมาจ่าย") && !a.status.includes("ระบบ")) {
                        if (a.slipUrl && a.slipUrl !== "-") revertBtn = `<button class="admin-action-btn" style="background:#ea580c;" onclick="adminAction('${a.time}', '${a.uid}', 'revertToPending', this)">↩️ ดึงกลับรอตรวจ</button> <button class="admin-action-btn" style="background:#ef4444;" onclick="adminAction('${a.time}', '${a.uid}', 'rejectSlip', this)">❌ ปฏิเสธสลิป</button>`;
                        else revertBtn = `<button class="admin-action-btn" style="background:#ea580c;" onclick="adminAction('${a.time}', '${a.uid}', 'rejectPaySingle', this)">↩️ ดึงกลับค้างจ่าย</button>`;
                    }
                    // เพิ่มคลาส admin-all-item สำหรับใช้กับระบบค้นหา
                    allHTML += `<div class="admin-all-item" style="padding:10px; border-bottom:1px solid #e5e7eb;"><div><b>${a.name}</b> ${noteTxtAll} <span style="font-size:12px;">(${a.time} น.)</span></div><div style="font-size:12px; color: #6b7280; margin-bottom: 5px;">สถานะ: ${a.status} (${a.cost} บ.)</div>${(isToday || allowEditHistory) ? `<button class="admin-action-btn" style="background:#9ca3af;" onclick="adminAction('${a.time}', '${a.uid}', 'delete', this)">🗑️ ลบ</button>` : ''} ${slipBtnAll} ${promoteBtn} ${historyPayBtn} ${revertBtn}</div>`;
                });
            document.getElementById('adminAllArea').innerHTML = allHTML ? `<div class="fade-in">${allHTML}</div>` : "ยังไม่มีข้อมูล";
            } else {
                showToast(r.message || "เกิดข้อผิดพลาด", "error");
                document.getElementById('adminAllArea').innerHTML = `<div style="color:#ef4444; padding:10px; text-align:center;">⚠️ ${r.message || 'โหลดข้อมูลไม่สำเร็จ'}</div>`;
                if (isToday) document.getElementById('adminUnpaidArea').innerHTML = `<div style="color:#ef4444; padding:10px; text-align:center;">⚠️ ${r.message || 'โหลดข้อมูลไม่สำเร็จ'}</div>`;
            }
        } catch (e) { 
            console.error("[ADM_01] Render Admin UI Error:", e);
            showToast("⚠️ ดึงข้อมูลแอดมินล้มเหลว ลองรีเฟรชใหม่ [ADM_01]", "error"); 
            document.getElementById('adminAllArea').innerHTML = '<div style="color:#ef4444; padding:10px; text-align:center;">โหลดข้อมูลไม่สำเร็จ (รหัสอ้างอิง: [ADM_01])</div>';
            if (isToday) document.getElementById('adminUnpaidArea').innerHTML = '<div style="color:#ef4444; padding:10px; text-align:center;">โหลดข้อมูลไม่สำเร็จ</div>';
        }
    }

    function filterAdminList() {
        let filter = document.getElementById('adminSearchInput').value.toLowerCase();
        let items = document.querySelectorAll('.admin-all-item');
        items.forEach(item => {
            let text = item.innerText.toLowerCase();
            item.style.display = text.includes(filter) ? "" : "none";
        });
    }

    function setAdminFilter(keyword) {
        document.getElementById('adminSearchInput').value = keyword;
        filterAdminList();
    }

    async function adminAction(targetTime, targetUid, manageType, btnElement) {
        if (manageType === 'delete' && !confirm("⚠️ ยืนยันการลบรายชื่อ? (หากลบชื่อเจ้าภาพ เพื่อนทั้งหมดจะถูกลบตามไปด้วย)")) return;
        if (manageType === 'write_off' && !confirm("⚠️ ยืนยันการยกยอดหนี้สูญให้รายการนี้? (ยอดจะกลายเป็น 0 บาท)")) return;
        if (manageType === 'rejectDelete' && !confirm("⚠️ ปฏิเสธคำขอลบ และเตะกลับไปเป็น 'รอแอดมินตรวจ' ใช่หรือไม่?")) return;
        if (manageType === 'rejectSlip' && !confirm("⚠️ ยืนยันการปฏิเสธสลิป?\n(สลิปจะถูกลบ และสถานะจะแจ้งผู้ใช้ว่า 'สลิปไม่ถูกต้อง')")) return;
        if (manageType === 'revertToPending' && !confirm("⚠️ ดึงรายการนี้กลับไปเป็น 'รอแอดมินตรวจ' ใช่หรือไม่?")) return;
        if (manageType === 'rejectPaySingle' && !confirm("⚠️ ยืนยันดึงกลับไปเป็น 'ยังไม่จ่าย' ใช่หรือไม่?")) return;
        btnElement.disabled = true; btnElement.innerText = "⏳...";
        
        // 🛡️ บล็อกปุ่มแอดมินทั้งหมดชั่วคราว ป้องกันการกดรัวๆ จนคิว GAS เต็ม
        document.querySelectorAll('.admin-action-btn').forEach(b => b.style.pointerEvents = 'none');

        try {
            let res = await fetch(getApiUrl(), { method: 'POST', body: JSON.stringify({ action: "adminManage", uid: userUid, targetTime: targetTime, targetUid: targetUid, manageType: manageType, targetDate: currentViewDate }) });
            let r = await res.json();
            if (r.status === "success") { btnElement.innerText = "✅ สำเร็จ"; closeSlipModal(); setTimeout(currentViewDate ? fetchHistory : loadAdminData, 500); } 
            else { 
                showToast(r.message, "error"); btnElement.disabled = false; btnElement.innerText = "❌ ผิดพลาด"; 
                document.querySelectorAll('.admin-action-btn').forEach(b => b.style.pointerEvents = 'auto');
            }
        } catch (e) { 
            console.error("[ACT_01] Admin Action Error:", e);
            showToast("⚠️ เชื่อมต่อล้มเหลว กรุณาลองใหม่ [ACT_01]", "error"); 
            btnElement.disabled = false; btnElement.innerText = "❌ ผิดพลาด";
            document.querySelectorAll('.admin-action-btn').forEach(b => b.style.pointerEvents = 'auto');
        }
    }

    async function loadVipData(btn) {
        if(btn) { btn.disabled = true; btn.innerText = "⏳..."; }
        try {
            let res = await fetch(getApiUrl(), { method: 'POST', body: JSON.stringify({ action: "getVipData", uid: userUid }) });
            let r = await res.json();
            if (r.status === "success") {
                globalVipList = r.data;
                document.getElementById('vipContentArea').style.display = 'block';
                renderVipList();
            } else { showToast(r.message, "error"); }
        } catch(e) { console.error("[VIP_01] Load VIP Error:", e); showToast("⚠️ โหลดข้อมูล VIP ล้มเหลว [VIP_01]", "error"); } 
        finally { if(btn) { btn.disabled = false; btn.innerText = "🔄 โหลดรายชื่อ"; } }
    }

    function renderVipList() {
        let searchTxt = document.getElementById('vipSearchInput').value.toLowerCase();
        let expHtml = ""; let actHtml = "";
        globalVipList.forEach(v => {
            let safeNameForJS = v.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            if (searchTxt && !v.name.toLowerCase().includes(searchTxt)) return;
            if (v.isExpired) {
                let badge = v.tierType === 'YEARLY' ? `<span class="badge badge-vip" style="font-size:10px; padding:2px 6px;">รายปี</span>` : '';
                expHtml += `<div class="admin-sub-item" style="padding: 8px 0;">
                    <div><b style="color:#ef4444;">${v.name}</b> ${badge} <div style="font-size:11px;">(ต่ออายุล่าสุด: ${v.date || 'ไม่มีประวัติ'})</div></div>
                    <div><button class="admin-action-btn" style="background:#f59e0b;" onclick="openRenewModal('${v.uid}', '${safeNameForJS}', '${v.tierType}', '${v.date}', false)">🔄 ต่ออายุ</button><button class="admin-action-btn" style="background:#ef4444;" onclick="removeVip('${v.uid}', '${safeNameForJS}', this)">🗑️</button></div>
                </div>`;
            } else {
                let badge = v.tierType === 'YEARLY' ? `<span class="badge badge-vip" style="font-size:10px; padding:2px 6px;">รายปี</span>` : '';
                actHtml += `<div class="admin-sub-item" style="padding: 8px 0;">
                    <div><b style="color:#16a34a;">${v.name}</b> ${badge} <div style="font-size:11px;">(ต่ออายุเมื่อ: ${v.date})</div></div>
                    <div>
                        <button class="admin-action-btn" style="background:#3b82f6;" onclick="openRenewModal('${v.uid}', '${safeNameForJS}', '${v.tierType}', '${v.date}', true)">✏️ แก้ไข</button>
                        <button class="admin-action-btn" style="background:#6b7280;" onclick="undoRenewVip('${v.uid}', '${safeNameForJS}', this)">↩️ ดึงกลับ</button>
                    </div>
                </div>`;
            }
        });
        document.getElementById('vipExpiredList').innerHTML = expHtml || "ไม่มีรายการ"; document.getElementById('vipActiveList').innerHTML = actHtml || "ไม่มีรายการ";
    }
    function filterVipList() { renderVipList(); }
    
    let searchVipTimeout;
    function debounceFilterVipList() { clearTimeout(searchVipTimeout); searchVipTimeout = setTimeout(filterVipList, 300); }

    let currentRenewUid = ""; let currentRenewName = "";
    function openRenewModal(u, n, tierType, currentMDate, isEdit = false) {
        currentRenewUid = u; currentRenewName = n;
        document.getElementById('vipRenewName').innerText = (isEdit ? "✏️ แก้ไขสิทธิ์: " : "🔄 ต่ออายุ: ") + n;
        document.getElementById('vipRenewTier').value = (tierType === 'YEARLY') ? 'รายปี' : 'รายเดือน';
        let d = new Date();
        if (currentMDate && currentMDate !== "-") { let parts = currentMDate.split("-"); if(parts.length >= 2) d = new Date(parts[0], parts[1]-1); }
        document.getElementById('vipRenewMonth').value = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, '0');
        document.getElementById('vipRenewConfirmBtn').innerText = isEdit ? "✅ ยืนยันการแก้ไข" : "✅ ยืนยันต่ออายุ";
        document.getElementById('vipRenewModal').style.display = 'flex';
    }

    function submitRenewVip(btn) {
        let t = document.getElementById('vipRenewTier').value;
        let m = document.getElementById('vipRenewMonth').value;
        if (!m) return showToast("กรุณาเลือกเดือนเริ่มต้น", "error");
        document.getElementById('vipRenewModal').style.display = 'none';
        handleVipAction("renewVip", currentRenewUid, { newTier: t, startDate: m }, btn, null, `✅ บันทึกข้อมูล ${currentRenewName} สำเร็จ!`);
    }

    async function handleVipAction(actionName, tUid, payloadExtra, btn, confirmMsg, successMsg) {
        if (confirmMsg && !confirm(confirmMsg)) return;
        let oldTxt = btn ? btn.innerText : ""; 
        if(btn) { btn.disabled = true; btn.innerText = "⏳..."; }
        try {
            let res = await fetch(getApiUrl(), { method: 'POST', body: JSON.stringify({ action: actionName, uid: userUid, targetUid: tUid, ...payloadExtra }) });
            let r = await res.json();
            if (r.status === "success") { showToast(successMsg, "success"); loadVipData(); } else { showToast(r.message, "error"); if(btn){btn.disabled = false; btn.innerText = oldTxt;} }
        } catch(e) { console.error("[VIP_02] Action Error:", e); showToast("⚠️ เชื่อมต่อล้มเหลว [VIP_02]", "error"); if(btn){btn.disabled = false; btn.innerText = oldTxt;} }
    }
    function undoRenewVip(u, n, b) { handleVipAction("undoRenewVip", u, {}, b, `⚠️ ยืนยัน "ยกเลิกการต่ออายุ" ของ "${n}" ใช่หรือไม่?\n(รายชื่อจะถูกดึงกลับไปอยู่โซนสีแดง)`, `↩️ ยกเลิกการต่ออายุ ${n} สำเร็จ!`); }
    function removeVip(u, n, b) { handleVipAction("removeVip", u, {}, b, `⚠️ ยืนยัน "ลบสิทธิ์ VIP ถาวร" ของ "${n}" ใช่หรือไม่?\n(หากลบไปแล้ว ต้องไปเพิ่มให้ใหม่ในหน้ากระดาน)`, `🗑️ ลบสิทธิ์ ${n} ถาวรแล้ว`); }

    async function submitWalkIn(btn) {
        let wName = document.getElementById('walkInNameInput').value.trim();
        if (!wName) { showToast("กรุณาพิมพ์ชื่อนักกีฬา", "error"); return; }
        let wTier = document.getElementById('walkInTierSelect').value;
        let wStatus = document.getElementById('walkInStatusSelect').value;

        let oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "⏳ กำลังเพิ่ม...";

        try {
            let res = await fetch(getApiUrl(), { method: 'POST', body: JSON.stringify({ action: "adminAddWalkIn", uid: userUid, walkInName: wName, walkInTier: wTier, walkInStatus: wStatus }) });
            let r = await res.json();
            if (r.status === "success") {
                showToast("✅ เพิ่มชื่อเรียบร้อย", "success");
                document.getElementById('walkInNameInput').value = "";
                loadAdminData();
            } else { showToast(r.message || "ผิดพลาด", "error"); }
        } catch(e) { 
            console.error("[WLK_01] Submit Walk-In Error:", e);
            showToast("⚠️ เชื่อมต่อล้มเหลว กรุณาลองใหม่ [WLK_01]", "error"); 
        }
        finally { btn.disabled = false; btn.innerText = oldText; }
    }

    async function applyPenalty() {
        if (!confirm("⚠️ ยืนยันการปรับคนค้างจ่ายในหน้านี้เป็น 100 บาท?\n\n(ระบบจะเปลี่ยนยอดเงินเป็น 100 บาท และอัปเกรดเป็น 'รายเดือน' ทันทีเฉพาะคนที่มี LINE ID)")) return;
        const btn = document.getElementById('applyPenaltyBtn');
        let oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "⏳ กำลังดำเนินการ...";
        try {
            let res = await fetch(getApiUrl(), { method: 'POST', body: JSON.stringify({ action: "adminApplyPenalty", uid: userUid, targetDate: currentViewDate }) });
            let r = await res.json();
            if (r.status === "success") {
                showToast(`✅ ปรับสำเร็จ ${r.count} รายการ`, "success");
                fetchHistory(); // โหลดหน้าใหม่
            } else { showToast(r.message, "error"); }
        } catch(e) { 
            console.error("[PEN_01] Apply Penalty Error:", e);
            showToast("⚠️ เชื่อมต่อล้มเหลว กรุณาลองใหม่ [PEN_01]", "error"); 
        }
        finally { btn.disabled = false; btn.innerText = oldText; }
    }

    function openSlipModal(driveUrl, time, uid, status = "") {
        if(!driveUrl || driveUrl === "-") return;
        let fileIdMatch = driveUrl.match(/[-\w]{25,}/); 
        if(fileIdMatch && fileIdMatch[0]) {
            currentModalActiveRow = { time: time, uid: uid };
            document.getElementById('slipModal').style.display = 'flex';
            document.getElementById('modalFallbackBtn').style.display = 'none';
            document.getElementById('modalLoader').style.display = 'block';
            
            if (status.includes("⏳") || status.includes("❌")) {
                document.getElementById('modalAdminActionArea').style.display = 'block';
                document.getElementById('modalApproveBtn').style.display = 'block';
                document.getElementById('modalApproveBtn').onclick = function() { adminAction(currentModalActiveRow.time, currentModalActiveRow.uid, 'confirmPay', this); };
                document.getElementById('modalApproveBtn').disabled = false;
                document.getElementById('modalRejectBtn').innerText = "❌ ปฏิเสธสลิป";
                document.getElementById('modalRejectBtn').onclick = function() { adminAction(currentModalActiveRow.time, currentModalActiveRow.uid, 'rejectSlip', this); };
                document.getElementById('modalRejectBtn').disabled = false;
            } else if (status.includes("✅") && !status.includes("ฟรี") && !status.includes("เหมาจ่าย") && !status.includes("ระบบ")) {
                document.getElementById('modalAdminActionArea').style.display = 'block';
                document.getElementById('modalApproveBtn').style.display = 'none'; // ซ่อนปุ่มอนุมัติ (เพราะรับเงินไปแล้ว)
                document.getElementById('modalRejectBtn').innerText = "❌ ปฏิเสธสลิป (ดึงยอดกลับ)";
                document.getElementById('modalRejectBtn').onclick = function() { adminAction(currentModalActiveRow.time, currentModalActiveRow.uid, 'rejectSlip', this); };
                document.getElementById('modalRejectBtn').disabled = false;
            } else { document.getElementById('modalAdminActionArea').style.display = 'none'; }
            
            let imgEl = document.getElementById('modalImg');
            imgEl.onload = function() { document.getElementById('modalLoader').style.display = 'none'; };
            imgEl.onerror = function() { document.getElementById('modalLoader').style.display = 'none'; document.getElementById('modalFallbackBtn').style.display = 'block'; document.getElementById('modalFallbackBtn').onclick = () => window.open(driveUrl, '_blank'); };
            imgEl.src = "https://drive.google.com/thumbnail?id=" + fileIdMatch[0] + "&sz=w800&t=" + new Date().getTime();
        } else { window.open(driveUrl, '_blank'); } 
    }
    
    function closeSlipModal() { 
        let imgEl = document.getElementById('modalImg');
        imgEl.onload = null; imgEl.onerror = null; // ปิดก๊อก Event รูปภาพเก่าที่กำลังโหลดค้างอยู่
        document.getElementById('slipModal').style.display = 'none'; 
        imgEl.src = ""; currentModalActiveRow = null; 
    }

    function copyDebtList() {
        if (globalUnpaidList.length === 0) return;
        let checkDateStr = currentViewDate ? new Date(currentViewDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        let txtUnpaid = ""; let txtCheck = ""; let totalDebt = 0;
        globalUnpaidList.forEach(item => {
            totalDebt += item.cost;
            let displayNote = item.note !== '-' ? (item.note.length > 30 ? item.note.substring(0, 30) + '...' : item.note) : '';
            let appendText = `- ${item.name} (${item.cost} บาท)${displayNote ? ' [📝 '+displayNote+']' : ''}\n`;
            if (item.status.includes("รอแอดมินตรวจ") || item.name === "โอนแทนเพื่อน") txtCheck += appendText; else txtUnpaid += appendText;
        });
        let msg = `📢 *สรุปยอดค้างชำระ ชมรมแบดมินตันตากฟ้า*\n📅 ประจำวันที่: ${checkDateStr}\n\n`;
        if (txtUnpaid) msg += `❌ *ยังไม่ได้ชำระเงิน:*\n${txtUnpaid}\n`;
        if (txtCheck) msg += `⏳ *ส่งสลิปแล้ว (รอแอดมินกดตรวจ):*\n${txtCheck}\n`;
        msg += `💰 *ยอดค้างรวมทั้งหมด: ${totalDebt} บาท*\n💳 บัญชี ธ.ก.ส. : *020219081907*\n🙏 รบกวนสมาชิกตรวจสอบและโอนเคลียร์ยอดด้วยนะครับ`;
        navigator.clipboard.writeText(msg).then(() => { showToast("📋 คัดลอกข้อความแจ้งยอดคงค้างแล้ว นำไปวางในกลุ่มไลน์ได้ทันทีครับ", "success"); }).catch(e => { showToast("⚠️ อุปกรณ์ไม่รองรับการคัดลอกอัตโนมัติ กรุณาคลุมดำคัดลอกเองครับ", "error"); });
    }
