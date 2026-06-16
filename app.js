/**
 * Pocket Debt - Personal Debt Tracker Javascript
 * Local Storage persistent data, dark/light theme, charts, backup/restore
 */

// ==========================================================================
// STATE MANAGEMENT & INITIALIZATION
// ==========================================================================
let state = {
    debts: [],
    theme: 'dark-theme'
};

// Default Sample Data (loads if LocalStorage is empty on first visit)
const sampleDebts = [
    {
        id: "sample-1",
        type: "owed",
        name: "สมชาย ยอดเพื่อน",
        amount: 5000,
        description: "ยืมจ่ายค่าซ่อมบำรุงรถจักรยานยนต์",
        date: "2026-06-01",
        dueDate: "2026-06-30",
        interest: 0,
        notes: "ทยอยผ่อนคืนสิ้นเดือนนี้",
        status: "active",
        repayments: [
            { id: "r-1", amount: 1500, date: "2026-06-10", note: "โอนคืนกวดแรก" }
        ]
    },
    {
        id: "sample-2",
        type: "receivable",
        name: "น้องก้อย ที่ทำงาน",
        amount: 3000,
        description: "ยืมเงินสำรองค่าอาหารเลี้ยงแผนก",
        date: "2026-06-12",
        dueDate: "2026-06-20",
        interest: 0,
        notes: "ก้อยบอกว่าเงินเดือนออกแล้วจะคืนทั้งหมด",
        status: "active",
        repayments: []
    },
    {
        id: "sample-3",
        type: "owed",
        name: "บัตรเครดิตธนาคาร A",
        amount: 12000,
        description: "รูดซื้อแท็บเล็ตเพื่อการศึกษา",
        date: "2026-05-15",
        dueDate: "2026-06-05",
        interest: 250,
        notes: "จ่ายชำระเต็มจำนวนแล้วเมื่อครบกำหนด",
        status: "settled",
        repayments: [
            { id: "r-3", amount: 12250, date: "2026-06-05", note: "จ่ายปิดยอดบัตรเครดิต" }
        ]
    }
];

// Helper to save state to localStorage
function saveState() {
    localStorage.setItem('pocket_debt_state', JSON.stringify(state));
}

// Helper to load state
function loadState() {
    const saved = localStorage.getItem('pocket_debt_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error("Error parsing saved state, resetting...", e);
            state = { debts: sampleDebts, theme: 'dark-theme' };
            saveState();
        }
    } else {
        // First run
        state = { debts: sampleDebts, theme: 'dark-theme' };
        saveState();
    }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on type
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}

// ==========================================================================
// HELPERS & CALCULATIONS
// ==========================================================================

// Helper: Format Number to Thai Baht Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Helper: Calculate total paid for a debt
function getPaidAmount(debt) {
    return debt.repayments.reduce((sum, r) => sum + r.amount, 0);
}

// Helper: Calculate remaining balance for a debt
function getRemainingBalance(debt) {
    const totalDue = Number(debt.amount) + Number(debt.interest || 0);
    return Math.max(0, totalDue - getPaidAmount(debt));
}

// Helper: Format Dates to friendly Thai format
function formatFriendlyDate(dateStr) {
    if (!dateStr) return 'ไม่ได้ระบุ';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// Helper: Generate Unique ID
function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// ==========================================================================
// RENDER FUNCTIONS
// ==========================================================================

// Render Dashboard Summary
function renderDashboard() {
    let totalOwed = 0; // ฉันเป็นหนี้เขา
    let totalReceivable = 0; // เขาเป็นหนี้ฉัน
    let owedCount = 0;
    let receivableCount = 0;

    state.debts.forEach(debt => {
        if (debt.status === 'active') {
            const remaining = getRemainingBalance(debt);
            if (debt.type === 'owed') {
                totalOwed += remaining;
                owedCount++;
            } else if (debt.type === 'receivable') {
                totalReceivable += remaining;
                receivableCount++;
            }
        }
    });

    const netBalance = totalReceivable - totalOwed;
    
    // Update Elements
    const netEl = document.getElementById('net-balance');
    const netStatusEl = document.getElementById('net-balance-status');
    const totalOwedEl = document.getElementById('total-owed');
    const owedCountEl = document.getElementById('owed-count');
    const totalReceivableEl = document.getElementById('total-receivable');
    const receivableCountEl = document.getElementById('receivable-count');

    // Net balance
    netEl.textContent = formatCurrency(Math.abs(netBalance));
    
    if (netBalance > 0) {
        netEl.className = "amount-display text-receivable";
        netStatusEl.className = "balance-status positive";
        netStatusEl.textContent = `ยอดบวกสุทธิ (รอเก็บเงินมากกว่าเป็นหนี้)`;
    } else if (netBalance < 0) {
        netEl.className = "amount-display text-owed";
        netStatusEl.className = "balance-status negative";
        netStatusEl.textContent = `ยอดลบสุทธิ (เป็นหนี้มากกว่ารอเก็บเงิน)`;
    } else {
        netEl.className = "amount-display";
        netStatusEl.className = "balance-status neutral";
        netStatusEl.textContent = "ดุลภาพหนี้สินเป็นศูนย์";
    }

    // Owed & Receivable
    totalOwedEl.textContent = formatCurrency(totalOwed);
    owedCountEl.textContent = `${owedCount} รายการที่กำลังค้างอยู่`;
    
    totalReceivableEl.textContent = formatCurrency(totalReceivable);
    receivableCountEl.textContent = `${receivableCount} รายการที่กำลังค้างอยู่`;
}

// Render SVG Donut Chart
function renderChart() {
    let activeOwedTotal = 0;
    let activeReceivableTotal = 0;
    
    state.debts.forEach(debt => {
        if (debt.status === 'active') {
            const rem = getRemainingBalance(debt);
            if (debt.type === 'owed') activeOwedTotal += rem;
            else if (debt.type === 'receivable') activeReceivableTotal += rem;
        }
    });
    
    const grandTotal = activeOwedTotal + activeReceivableTotal;
    const totalActiveCount = state.debts.filter(d => d.status === 'active').length;
    
    document.getElementById('chart-total-count').textContent = totalActiveCount;
    
    const segmentOwed = document.getElementById('donut-segment-owed');
    const segmentReceivable = document.getElementById('donut-segment-receivable');
    
    const percentOwedEl = document.getElementById('legend-owed-percent');
    const percentReceivableEl = document.getElementById('legend-receivable-percent');

    // Circumference of our donut is 2 * PI * r = 2 * 3.14159 * 70 = 439.82 -> roughly 440
    const circumference = 440;
    
    if (grandTotal === 0) {
        // Reset segments
        segmentOwed.style.strokeDasharray = `0 ${circumference}`;
        segmentReceivable.style.strokeDasharray = `0 ${circumference}`;
        segmentOwed.style.strokeDashoffset = "0";
        segmentReceivable.style.strokeDashoffset = "0";
        percentOwedEl.textContent = "0%";
        percentReceivableEl.textContent = "0%";
        return;
    }
    
    const pctOwed = (activeOwedTotal / grandTotal);
    const pctReceivable = (activeReceivableTotal / grandTotal);
    
    percentOwedEl.textContent = `${Math.round(pctOwed * 100)}%`;
    percentReceivableEl.textContent = `${Math.round(pctReceivable * 100)}%`;
    
    const owedDash = pctOwed * circumference;
    const receivableDash = pctReceivable * circumference;
    
    // Draw segments
    segmentOwed.style.strokeDasharray = `${owedDash} ${circumference}`;
    segmentOwed.style.strokeDashoffset = "0";
    
    segmentReceivable.style.strokeDasharray = `${receivableDash} ${circumference}`;
    // Shift the receivable segment to start where the owed segment ends
    segmentReceivable.style.strokeDashoffset = `-${owedDash}`;
}

// Render Upcoming Due Dates list
function renderUpcoming() {
    const listContainer = document.getElementById('upcoming-list-container');
    listContainer.innerHTML = '';
    
    // Filter active debts with due dates
    const activeWithDues = state.debts.filter(d => d.status === 'active' && d.dueDate);
    
    if (activeWithDues.length === 0) {
        listContainer.innerHTML = '<div class="empty-state-small">ไม่มีรายการหนี้ที่ใกล้ครบกำหนด</div>';
        return;
    }
    
    // Sort by due date ascending
    activeWithDues.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    activeWithDues.forEach(debt => {
        const dueDate = new Date(debt.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // Calculate days difference
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let badgeClass = 'safe';
        let badgeText = '';
        
        if (daysDiff < 0) {
            badgeClass = 'overdue';
            badgeText = `เลยกำหนด ${Math.abs(daysDiff)} วัน`;
        } else if (daysDiff === 0) {
            badgeClass = 'near';
            badgeText = 'ครบกำหนดวันนี้';
        } else if (daysDiff <= 3) {
            badgeClass = 'near';
            badgeText = `เหลืออีก ${daysDiff} วัน`;
        } else {
            badgeClass = 'safe';
            badgeText = `เหลืออีก ${daysDiff} วัน`;
        }
        
        const remaining = getRemainingBalance(debt);
        const itemHtml = `
            <div class="upcoming-item">
                <div class="upcoming-info">
                    <span class="upcoming-name">${debt.name}</span>
                    <span class="upcoming-desc">${debt.description}</span>
                </div>
                <div class="upcoming-due">
                    <span class="upcoming-amount ${debt.type === 'owed' ? 'text-owed' : 'text-receivable'}">
                        ${debt.type === 'owed' ? '-' : '+'}${formatCurrency(remaining)}
                    </span>
                    <span class="due-badge ${badgeClass}">${badgeText}</span>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
}

// Render main Debt Cards list
let currentTypeFilter = 'all'; // 'all', 'owed', 'receivable'
let currentSearchQuery = '';

function renderDebtsGrid() {
    const gridContainer = document.getElementById('debts-grid-container');
    const statusFilter = document.getElementById('status-filter').value;
    
    gridContainer.innerHTML = '';
    
    // Filter calculations
    let filtered = state.debts.filter(debt => {
        // Type filter
        if (currentTypeFilter === 'owed' && debt.type !== 'owed') return false;
        if (currentTypeFilter === 'receivable' && debt.type !== 'receivable') return false;
        
        // Status filter
        if (statusFilter === 'active' && debt.status !== 'active') return false;
        if (statusFilter === 'settled' && debt.status !== 'settled') return false;
        
        // Search filter
        if (currentSearchQuery) {
            const query = currentSearchQuery.toLowerCase();
            const nameMatch = debt.name.toLowerCase().includes(query);
            const descMatch = debt.description.toLowerCase().includes(query);
            const noteMatch = (debt.notes || '').toLowerCase().includes(query);
            if (!nameMatch && !descMatch && !noteMatch) return false;
        }
        
        return true;
    });

    // Sort active ones first, then by date descending
    filtered.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
        }
        return new Date(b.date) - new Date(a.date);
    });

    if (filtered.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <h3>ไม่พบบันทึกหนี้สินที่ตรงกับเงื่อนไข</h3>
                <p>ลองปรับฟิลเตอร์ตัวกรอง หรือค้นหาด้วยคำอื่น</p>
            </div>
        `;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filtered.forEach(debt => {
        const totalAmount = Number(debt.amount) + Number(debt.interest || 0);
        const paid = getPaidAmount(debt);
        const remaining = getRemainingBalance(debt);
        
        // Progress percentage
        const progressPercent = totalAmount > 0 ? (paid / totalAmount) * 100 : 0;
        
        // Card tags/info
        let typeBadgeHtml = '';
        if (debt.status === 'settled') {
            typeBadgeHtml = `<span class="status-badge settled">ชำระครบแล้ว 🎉</span>`;
        } else {
            typeBadgeHtml = debt.type === 'owed' 
                ? `<span class="status-badge owed">ฉันเป็นหนี้เขา</span>`
                : `<span class="status-badge receivable">เขาเป็นหนี้ฉัน</span>`;
        }

        // Check if overdue
        let overdueHtml = '';
        if (debt.status === 'active' && debt.dueDate) {
            const due = new Date(debt.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < today) {
                overdueHtml = `<span class="overdue-text">⚠️ เลยกำหนดชำระ!</span>`;
            }
        }

        // Get initials for avatar
        const initials = debt.name.charAt(0);
        const avatarClass = debt.type === 'owed' ? 'avatar-owed' : 'avatar-receivable';

        const cardHtml = `
            <div class="debt-card ${debt.type === 'owed' ? 'owed-type' : 'receivable-type'}" data-id="${debt.id}">
                <!-- Top details -->
                <div class="card-top">
                    <div class="avatar-info">
                        <div class="avatar ${avatarClass}">${initials}</div>
                        <div class="name-desc">
                            <h4>${debt.name}</h4>
                            <span>${debt.description}</span>
                        </div>
                    </div>
                    ${typeBadgeHtml}
                </div>

                <!-- Middle (Money balance) -->
                <div class="card-middle">
                    <div class="amount-label">ยอดเงินคงเหลือคงค้าง</div>
                    <div class="amount-progress-row">
                        <div class="remaining-val ${debt.status === 'settled' ? 'text-muted' : (debt.type === 'owed' ? 'text-owed' : 'text-receivable')}">
                            ${formatCurrency(remaining)}
                        </div>
                        <div class="original-val">
                            จากเต็ม ฿${totalAmount.toLocaleString()}
                        </div>
                    </div>
                    ${debt.status === 'active' && paid > 0 ? `
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${progressPercent}%"></div>
                        </div>
                    ` : ''}
                </div>

                <!-- Bottom details -->
                <div class="card-details">
                    <div class="date-info">
                        <div>เริ่มต้น: ${formatFriendlyDate(debt.date)}</div>
                        ${debt.dueDate ? `<div>กำหนดชำระ: ${formatFriendlyDate(debt.dueDate)} ${overdueHtml}</div>` : '<div>ไม่มีกำหนดชำระ</div>'}
                    </div>
                    ${debt.interest > 0 ? `<span class="interest-badge">ดอกเบี้ย ฿${debt.interest}</span>` : ''}
                </div>

                ${debt.notes ? `
                    <div style="font-size: 11px; color: var(--text-muted); border-top: 1px dashed var(--border-glass); padding-top: 8px; font-style: italic;">
                        บันทึก: ${debt.notes}
                    </div>
                ` : ''}

                <!-- Actions -->
                <div class="card-actions">
                    <button class="btn btn-secondary btn-card btn-edit" onclick="openEditDebtModal('${debt.id}')">แก้ไข</button>
                    <button class="btn btn-secondary btn-card btn-delete" onclick="deleteDebt('${debt.id}')">ลบ</button>
                    ${debt.status === 'active' ? `
                        <button class="btn btn-primary btn-card btn-add-amount" onclick="openRepaymentModal('${debt.id}', 'increase')">
                            ➕ เพิ่มยอดหนี้
                        </button>
                        <button class="btn btn-success btn-card btn-pay" onclick="openRepaymentModal('${debt.id}', 'pay')">
                            💰 ชำระเงินคืน
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-card btn-pay" onclick="openRepaymentModal('${debt.id}', 'pay')">
                            📊 ประวัติการเงิน
                        </button>
                    `}
                </div>
            </div>
        `;
        gridContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// Re-render everything
function refreshUI() {
    renderDashboard();
    renderChart();
    renderUpcoming();
    renderDebtsGrid();
}

// ==========================================================================
// MODAL STATE & HANDLERS
// ==========================================================================
const debtModal = document.getElementById('debt-modal');
const repaymentModal = document.getElementById('repayment-modal');

// Close all modals helper
function closeAllModals() {
    debtModal.classList.remove('open');
    repaymentModal.classList.remove('open');
}

// Setup Open/Close Listeners
document.getElementById('btn-add-debt').addEventListener('click', () => {
    // Reset Form
    document.getElementById('debt-form').reset();
    document.getElementById('debt-id').value = '';
    document.getElementById('modal-title').textContent = 'เพิ่มบันทึกหนี้สิน';
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('debt-date').value = today;
    
    debtModal.classList.add('open');
});

document.getElementById('btn-close-debt-modal').addEventListener('click', closeAllModals);
document.getElementById('btn-cancel-debt-modal').addEventListener('click', closeAllModals);
document.getElementById('btn-close-repay-modal').addEventListener('click', closeAllModals);
document.getElementById('btn-close-repay-modal-bottom').addEventListener('click', closeAllModals);

// Click outside modal box closes it
window.addEventListener('click', (e) => {
    if (e.target === debtModal || e.target === repaymentModal) {
        closeAllModals();
    }
});

// ==========================================================================
// DEBT ADD / EDIT LOGIC
// ==========================================================================
document.getElementById('debt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('debt-id').value;
    const type = document.querySelector('input[name="debt-type"]:checked').value;
    const name = document.getElementById('debt-name').value.trim();
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const description = document.getElementById('debt-desc').value.trim();
    const date = document.getElementById('debt-date').value;
    const dueDate = document.getElementById('debt-due-date').value;
    const interest = parseFloat(document.getElementById('debt-interest').value) || 0;
    const notes = document.getElementById('debt-notes').value.trim();

    if (!name || isNaN(amount) || amount <= 0 || !description) {
        showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนและถูกต้อง", "danger");
        return;
    }

    if (id) {
        // EDIT MODE
        const debtIdx = state.debts.findIndex(d => d.id === id);
        if (debtIdx > -1) {
            const oldDebt = state.debts[debtIdx];
            
            // Retain repayments and status
            const updatedDebt = {
                ...oldDebt,
                type,
                name,
                amount,
                description,
                date,
                dueDate,
                interest,
                notes
            };
            
            // Check if changes mean the debt is now paid off (e.g. principal reduced below what was already paid)
            const remaining = getRemainingBalance(updatedDebt);
            updatedDebt.status = remaining <= 0 ? 'settled' : 'active';

            state.debts[debtIdx] = updatedDebt;
            showToast("แก้ไขบันทึกหนี้สินเรียบร้อยแล้ว", "success");
        }
    } else {
        // ADD MODE
        const newDebt = {
            id: generateId(),
            type,
            name,
            amount,
            description,
            date,
            dueDate,
            interest,
            notes,
            status: "active",
            repayments: []
        };
        state.debts.push(newDebt);
        showToast("เพิ่มบันทึกหนี้สินใหม่เรียบร้อยแล้ว", "success");
    }

    saveState();
    closeAllModals();
    refreshUI();
});

// Open edit modal directly
window.openEditDebtModal = function(id) {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;

    document.getElementById('debt-id').value = debt.id;
    document.getElementById('modal-title').textContent = 'แก้ไขรายละเอียดบันทึก';
    
    // Check type radio
    if (debt.type === 'owed') {
        document.getElementById('type-owed').checked = true;
    } else {
        document.getElementById('type-receivable').checked = true;
    }

    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-amount').value = debt.amount;
    document.getElementById('debt-desc').value = debt.description;
    document.getElementById('debt-date').value = debt.date;
    document.getElementById('debt-due-date').value = debt.dueDate || '';
    document.getElementById('debt-interest').value = debt.interest || '';
    document.getElementById('debt-notes').value = debt.notes || '';

    debtModal.classList.add('open');
};

// Delete debt card
window.deleteDebt = function(id) {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;
    
    if (confirm(`คุณต้องการลบบันทึกหนี้สินของ "${debt.name}" (ยอด ฿${debt.amount.toLocaleString()}) ใช่หรือไม่? ข้อมูลประวัติการชำระเงินจะถูกลบออกทั้งหมด`)) {
        state.debts = state.debts.filter(d => d.id !== id);
        saveState();
        showToast("ลบบันทึกหนี้สินเรียบร้อยแล้ว", "warning");
        refreshUI();
    }
};

// ==========================================================================
// REPAYMENT & TRANSACTION HISTORY LOGIC
// ==========================================================================

// Helper to update the Repayment modal UI based on selected action type (pay vs increase)
function updateRepayFormUI() {
    const actionType = document.querySelector('input[name="repay-action-type"]:checked').value;
    const isPay = actionType === 'pay';
    
    const titleEl = document.getElementById('repay-form-title');
    const amountLabel = document.getElementById('repay-amount-label');
    const dateLabel = document.getElementById('repay-date-label');
    const noteLabel = document.getElementById('repay-note-label');
    const noteInput = document.getElementById('repay-note');
    const submitBtn = document.getElementById('repay-submit-btn');
    
    if (isPay) {
        titleEl.textContent = 'เพิ่มประวัติการชำระเงิน';
        amountLabel.innerHTML = 'จำนวนเงินที่ชำระ (บาท) <span class="required">*</span>';
        dateLabel.innerHTML = 'วันที่ชำระเงิน <span class="required">*</span>';
        noteLabel.textContent = 'หมายเหตุการชำระเงิน';
        noteInput.placeholder = 'เช่น ชำระงวดแรก, โอนผ่านธนาคาร...';
        
        submitBtn.textContent = 'บันทึกชำระเงิน';
        submitBtn.className = 'btn btn-success';
    } else {
        titleEl.textContent = 'เพิ่มยอดหนี้ในยอดเดิม';
        amountLabel.innerHTML = 'จำนวนเงินที่กู้ยืมเพิ่ม (บาท) <span class="required">*</span>';
        dateLabel.innerHTML = 'วันที่เพิ่มยอดหนี้ <span class="required">*</span>';
        noteLabel.textContent = 'หมายเหตุการเพิ่มยอดหนี้';
        noteInput.placeholder = 'เช่น ยืมกินข้าวเพิ่ม, ซื้อของเพิ่ม...';
        
        submitBtn.textContent = 'บันทึกเพิ่มยอดหนี้';
        submitBtn.className = 'btn btn-primary';
    }
}

// Open Repayment management modal
window.openRepaymentModal = function(id, defaultAction = 'pay') {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;

    document.getElementById('repay-debt-id').value = debt.id;
    document.getElementById('repay-info-name').textContent = debt.name;
    document.getElementById('repay-info-desc').textContent = debt.description;
    
    const remaining = getRemainingBalance(debt);
    const paid = getPaidAmount(debt);
    const total = Number(debt.amount) + Number(debt.interest || 0);
    
    document.getElementById('repay-info-remaining').textContent = formatCurrency(remaining);
    document.getElementById('repay-info-paid').textContent = `ชำระแล้ว: ${formatCurrency(paid)}`;
    document.getElementById('repay-info-total').textContent = `ยอดเต็ม: ${formatCurrency(total)}`;
    
    // Set label based on debt type
    const remainingLabel = document.getElementById('repay-label-remaining');
    if (debt.type === 'owed') {
        remainingLabel.textContent = "ยอดที่ต้องจ่ายคืนอีก:";
    } else {
        remainingLabel.textContent = "ยอดที่รอเขามาคืนอีก:";
    }

    // Set progress bar
    const progressFill = document.getElementById('repay-progress-fill');
    const pct = total > 0 ? (paid / total) * 100 : 0;
    progressFill.style.width = `${Math.max(0, pct)}%`;

    // Reset repayment inputs
    document.getElementById('repay-amount').value = '';
    document.getElementById('repay-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('repay-note').value = '';
    
    // Set action mode
    if (defaultAction === 'increase') {
        document.getElementById('repay-action-increase').checked = true;
    } else {
        document.getElementById('repay-action-pay').checked = true;
    }
    updateRepayFormUI();

    // Focus on amount input field
    setTimeout(() => {
        const amtInput = document.getElementById('repay-amount');
        if (amtInput) amtInput.focus();
    }, 150);

    // Render History table
    renderRepaymentHistory(debt);
    
    repaymentModal.classList.add('open');
};

// Render repayment list inside modal
function renderRepaymentHistory(debt) {
    const historyContainer = document.getElementById('repay-history-container');
    historyContainer.innerHTML = '';

    if (!debt.repayments || debt.repayments.length === 0) {
        historyContainer.innerHTML = '<div class="empty-state-small">ยังไม่มีประวัติการทำรายการ</div>';
        return;
    }

    // Sort repayments by date descending
    const sortedRepayments = [...debt.repayments].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedRepayments.forEach(rep => {
        const isIncrease = rep.amount < 0;
        const absAmount = Math.abs(rep.amount);
        const amountClass = isIncrease ? 'text-owed' : 'text-receivable';
        const displayAmount = isIncrease ? `+฿${absAmount.toLocaleString()}` : `฿${absAmount.toLocaleString()}`;
        const defaultNote = isIncrease ? 'ยืมเพิ่ม/เพิ่มยอดหนี้' : 'ไม่ได้ระบุบันทึกย่อย';

        const itemHtml = `
            <div class="history-item">
                <div class="history-item-left">
                    <span class="history-date">${formatFriendlyDate(rep.date)}</span>
                    <span class="history-note">${rep.note || defaultNote}</span>
                </div>
                <div class="history-amount-area">
                    <span class="history-amount ${amountClass}">${displayAmount}</span>
                    <button class="btn-delete-history" title="ลบประวัตินี้" onclick="deleteRepaymentRecord('${debt.id}', '${rep.id}')">×</button>
                </div>
            </div>
        `;
        historyContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
}

// Submit payment / increase debt
document.getElementById('repayment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const debtId = document.getElementById('repay-debt-id').value;
    const amountInput = parseFloat(document.getElementById('repay-amount').value);
    const date = document.getElementById('repay-date').value;
    const note = document.getElementById('repay-note').value.trim();

    const debt = state.debts.find(d => d.id === debtId);
    if (!debt) return;

    const remaining = getRemainingBalance(debt);
    const actionType = document.querySelector('input[name="repay-action-type"]:checked').value;

    if (isNaN(amountInput) || amountInput <= 0) {
        showToast("กรุณากรอกจำนวนเงินที่ถูกต้อง", "danger");
        return;
    }

    if (!debt.repayments) debt.repayments = [];

    if (actionType === 'pay') {
        if (amountInput > remaining + 0.01) { // allow small floating point variance
            showToast(`จำนวนเงินเกินยอดคงเหลือ (ยอดคงเหลือคือ ฿${remaining.toLocaleString()})`, "danger");
            return;
        }

        // Add repayment record
        const newRepay = {
            id: generateId(),
            amount: amountInput,
            date,
            note
        };
        debt.repayments.push(newRepay);

        // Check if fully paid
        const newRemaining = getRemainingBalance(debt);
        if (newRemaining <= 0) {
            debt.status = 'settled';
            showToast("ยินดีด้วย! ชำระครบถ้วนเรียบร้อยแล้ว ปิดหนี้สินสำเร็จ", "success");
            closeAllModals();
        } else {
            showToast(`บันทึกการชำระเงินเรียบร้อย (คงเหลือ ฿${newRemaining.toLocaleString()})`, "success");
            openRepaymentModal(debtId, 'pay');
        }
    } else {
        // INCREASE MODE
        // Add repayment record with negative amount (debt increases)
        const newRepay = {
            id: generateId(),
            amount: -amountInput,
            date,
            note: note || "ยืมเพิ่ม/เพิ่มยอดหนี้"
        };
        debt.repayments.push(newRepay);

        // Reactivate debt if it was settled
        if (debt.status === 'settled') {
            debt.status = 'active';
        }

        const newRemaining = getRemainingBalance(debt);
        showToast(`บันทึกเพิ่มยอดหนี้เรียบร้อย (ยอดรวมใหม่ ฿${newRemaining.toLocaleString()})`, "success");
        openRepaymentModal(debtId, 'increase');
    }

    saveState();
    refreshUI();
});

// Delete individual payment history log
window.deleteRepaymentRecord = function(debtId, repayId) {
    const debt = state.debts.find(d => d.id === debtId);
    if (!debt) return;

    if (confirm("คุณต้องการลบรายการประวัติการชำระเงินนี้ใช่หรือไม่? ยอดเงินคงค้างจะถูกปรับเพิ่มกลับขึ้นมา")) {
        debt.repayments = debt.repayments.filter(r => r.id !== repayId);
        
        // Re-adjust status back to active if it was settled
        const remaining = getRemainingBalance(debt);
        if (remaining > 0) {
            debt.status = 'active';
        }

        saveState();
        showToast("ลบประวัติการชำระเงินคืนแล้ว", "warning");
        
        // Refresh modal and main page
        openRepaymentModal(debtId);
        refreshUI();
    }
};

// Settle entire balance directly
document.getElementById('btn-settle-all').addEventListener('click', () => {
    const debtId = document.getElementById('repay-debt-id').value;
    const debt = state.debts.find(d => d.id === debtId);
    if (!debt) return;

    const remaining = getRemainingBalance(debt);
    if (remaining <= 0) {
        showToast("หนี้สินนี้ได้รับการชำระครบถ้วนแล้ว", "warning");
        return;
    }

    if (confirm(`คุณต้องการชำระเงินคืนทั้งหมดจำนวน ฿${remaining.toLocaleString()} เพื่อปิดบัญชีหนี้สินนี้ทันทีใช่หรือไม่?`)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const settleRepay = {
            id: generateId(),
            amount: remaining,
            date: todayStr,
            note: "ชำระส่วนที่เหลือทั้งหมดปิดยอด"
        };
        
        debt.repayments.push(settleRepay);
        debt.status = 'settled';
        
        saveState();
        showToast("ยินดีด้วย! ปิดยอดหนี้สินเรียบร้อยแล้ว", "success");
        closeAllModals();
        refreshUI();
    }
});

// ==========================================================================
// FILTERS & SEARCH EVENT LISTENERS
// ==========================================================================

// Search Input Listener
document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderDebtsGrid();
});

// Filter by Status Dropdown
document.getElementById('status-filter').addEventListener('change', () => {
    renderDebtsGrid();
});

// Filter by Type (Owed / Receivable) Buttons
const filterBtns = document.querySelectorAll('#type-filter-group .filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTypeFilter = btn.dataset.type;
        renderDebtsGrid();
    });
});

// Clear All Data
document.getElementById('btn-clear-all').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm("⚠️ คำเตือน: คุณต้องการล้างข้อมูลบันทึกหนี้สินทั้งหมดใช่หรือไม่? ข้อมูลทั้งหมดที่บันทึกไว้ในเครื่องนี้จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้ เว้นแต่จะมีไฟล์สำรองข้อมูล")) {
        if (confirm("ยืนยันอีกครั้งเพื่อลบข้อมูลทั้งหมด?")) {
            state.debts = [];
            saveState();
            showToast("ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว", "danger");
            refreshUI();
        }
    }
});

// ==========================================================================
// BACKUP & RESTORE (EXPORT / IMPORT JSON)
// ==========================================================================

// Export to JSON file
document.getElementById('btn-export').addEventListener('click', () => {
    if (state.debts.length === 0) {
        showToast("ไม่มีข้อมูลการบันทึกสำหรับการส่งออกสำรองข้อมูล", "warning");
        return;
    }
    
    try {
        const dataStr = JSON.stringify(state, null, 4);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `pocket_debt_backup_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showToast("ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว", "success");
    } catch (err) {
        showToast("เกิดข้อผิดพลาดในการสร้างไฟล์สำรองข้อมูล", "danger");
        console.error(err);
    }
});

// Import JSON Trigger
document.getElementById('btn-import-trigger').addEventListener('click', () => {
    document.getElementById('file-import').click();
});

// Import File Selector Change event
document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            
            // Validate basic schema integrity
            if (importedData && Array.isArray(importedData.debts)) {
                // Ensure correct structure for each imported debt
                let valid = true;
                importedData.debts.forEach(d => {
                    if (!d.id || !d.type || !d.name || isNaN(d.amount) || !d.description) {
                        valid = false;
                    }
                });
                
                if (!valid) {
                    showToast("รูปแบบโครงสร้างไฟล์ไม่ถูกต้อง ข้อมูลหนี้สินบางส่วนไม่สมบูรณ์", "danger");
                    return;
                }
                
                // Confirm overwrite
                if (confirm(`พบข้อมูลหนี้สินจำนวน ${importedData.debts.length} รายการในไฟล์สำรองนี้ คุณต้องการนำเข้าข้อมูลและเขียนทับข้อมูลชุดปัจจุบันใช่หรือไม่?`)) {
                    state = importedData;
                    if (!state.theme) state.theme = 'dark-theme';
                    
                    saveState();
                    
                    // Apply theme
                    document.body.className = state.theme;
                    
                    showToast("นำเข้าข้อมูลสำรองเรียบร้อยแล้ว!", "success");
                    refreshUI();
                }
            } else {
                showToast("ไฟล์สำรองไม่ใช่รูปแบบข้อมูล Pocket Debt ที่ถูกต้อง", "danger");
            }
        } catch (err) {
            showToast("ไม่สามารถอ่านหรือแปลงข้อมูลไฟล์ JSON นี้ได้", "danger");
            console.error(err);
        }
    };
    reader.readAsText(file);
    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
});

// ==========================================================================
// THEME SWITCHER
// ==========================================================================
document.getElementById('theme-toggle').addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        state.theme = 'light-theme';
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        state.theme = 'dark-theme';
    }
    saveState();
    showToast(`เปลี่ยนธีมเป็น ${state.theme === 'dark-theme' ? 'ธีมมืด' : 'ธีมสว่าง'}`, "success");
});

// ==========================================================================
// RUN ON PAGE LOAD
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    // Apply saved theme
    document.body.className = state.theme;
    
    // Bind radio toggle change for repayment modal
    document.querySelectorAll('input[name="repay-action-type"]').forEach(radio => {
        radio.addEventListener('change', updateRepayFormUI);
    });
    
    // Load and render UI
    refreshUI();
});
