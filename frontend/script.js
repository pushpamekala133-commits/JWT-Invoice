/* ==========================================
   JOB WAY TECH INVOICE SYSTEM
   script.js
========================================== */

const STUDENT_KEY = "jwt_students";
const COURSE_KEY = "jwt_courses";
const PAYMENT_KEY = "jwt_payments";
const INVOICE_KEY = "jwt_invoices";
const AUTH_STORAGE_KEY = "jobwaytech_auth";
const AUTH_USERNAME = "Login@JWT.com";

const MONTHLY_COURSE_FEE = 2000;
const GST_RATE = 0.18;

let students = [];
let courses = [];
let payments = [];
let invoices = [];
let otpRequestedFor = "";
let authStep = "credentials";

// API base — point to backend server on same host at port 5000
const API_BASE = `${location.protocol}//${location.hostname}:5000`;

function formatCurrency(value) {
    return Number(value || 0).toFixed(2);
}

function getStoredAuth() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
    } catch (error) {
        return null;
    }
}

function saveAuth(user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        ...user,
        loggedInAt: new Date().toISOString()
    }));
}

function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

function showLoginScreen() {
    const loginView = document.getElementById("loginView");
    const appShell = document.getElementById("appShell");
    if (loginView) loginView.classList.remove("hidden");
    if (appShell) appShell.classList.add("hidden");
}

function showAppShell() {
    const loginView = document.getElementById("loginView");
    const appShell = document.getElementById("appShell");
    if (loginView) loginView.classList.add("hidden");
    if (appShell) appShell.classList.remove("hidden");
}

function attachAuthHandlers() {
    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");
    const logoutBtn = document.getElementById("logoutBtn");
    const otpGroup = document.getElementById("otpGroup");
    const resendOtpBtn = document.getElementById("resendOtpBtn");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const loginHint = document.getElementById("loginHint");

    const setLoginMessage = (message, isError = true) => {
        if (!loginError) return;
        loginError.textContent = message || "";
        loginError.style.color = isError ? "#dc2626" : "#059669";
    };

    const setOtpStep = (enabled) => {
        authStep = enabled ? "otp" : "credentials";
        if (otpGroup) otpGroup.classList.toggle("hidden", !enabled);
        if (submitBtn) submitBtn.textContent = enabled ? "Verify OTP & Sign In" : "Send OTP";
        if (loginHint) {
            loginHint.textContent = enabled
                ? "Check Jobwaytech@gmail.com or pushpamekala133@gmail.com for the OTP. It expires in 5 minutes."
                : "Username: Login@JWT.com. OTP will be sent to Jobwaytech@gmail.com and pushpamekala133@gmail.com.";
        }
    };

    const requestOtp = async () => {
        const username = document.getElementById("loginUsername")?.value.trim() || "";
        const password = document.getElementById("loginPassword")?.value || "";
        if (submitBtn) submitBtn.disabled = true;
        setLoginMessage("Sending OTP...", false);

        try {
            const response = await fetch(`${API_BASE}/api/auth/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not send OTP.");

            otpRequestedFor = username || AUTH_USERNAME;
            setOtpStep(true);
            setLoginMessage(data.message || "OTP sent successfully.", false);
            document.getElementById("loginOtp")?.focus();
        } catch (error) {
            setOtpStep(false);
            setLoginMessage(error.message || "Could not send OTP.");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    };

    const verifyOtp = async () => {
        const username = otpRequestedFor || document.getElementById("loginUsername")?.value.trim() || "";
        const otp = document.getElementById("loginOtp")?.value.trim() || "";
        if (!otp) {
            setLoginMessage("Enter the OTP sent to Jobwaytech@gmail.com.");
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        setLoginMessage("Verifying OTP...", false);

        try {
            const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, otp })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Invalid OTP.");

            saveAuth({
                token: data.token,
                username: data.user?.username || username,
                email: data.user?.email || "Jobwaytech@gmail.com",
                role: data.user?.role || "admin"
            });
            setLoginMessage("");
            setOtpStep(false);
            loginForm.reset();
            showAppShell();
            initApp();
        } catch (error) {
            setLoginMessage(error.message || "Invalid OTP.");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    };

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (authStep === "otp") await verifyOtp();
            else await requestOtp();
        });
    }

    if (resendOtpBtn) {
        resendOtpBtn.addEventListener("click", requestOtp);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            clearAuth();
            setOtpStep(false);
            if (loginForm) loginForm.reset();
            setLoginMessage("");
            showLoginScreen();
        });
    }
}

function normalizeState(state) {
    if (!state) return 'same';
    const normalized = state.toString().trim().toLowerCase();
    if (normalized.includes('same')) return 'same';
    if (normalized.includes('other')) return 'other';
    return normalized === 'same' ? 'same' : 'other';
}

function formatStateLabel(state) {
    return normalizeState(state) === 'same' ? 'Same State (AP)' : 'Other State';
}

function parseDuration(value) {
    if (!value) return 0;
    const match = value.toString().trim().match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function calculateGst(amount, state) {
    const normalizedState = normalizeState(state);
    const gstAmount = Number((amount * GST_RATE).toFixed(2));
    if (normalizedState === 'same') {
        const half = Number((gstAmount / 2).toFixed(2));
        return {
            gstAmount,
            breakdown: `CGST 9% ₹${half} + SGST 9% ₹${half}`
        };
    }
    return {
        gstAmount,
        breakdown: `IGST 18% ₹${gstAmount.toFixed(2)}`
    };
}

function loadLocalData() {
    students = JSON.parse(localStorage.getItem(STUDENT_KEY)) || [];
    courses = JSON.parse(localStorage.getItem(COURSE_KEY)) || [];
    payments = JSON.parse(localStorage.getItem(PAYMENT_KEY)) || [];
    invoices = JSON.parse(localStorage.getItem(INVOICE_KEY)) || [];
}

function saveStudents() {
    localStorage.setItem(STUDENT_KEY, JSON.stringify(students));
}

function saveCourses() {
    localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
}

function savePayments() {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(payments));
}

function saveInvoices() {
    localStorage.setItem(INVOICE_KEY, JSON.stringify(invoices));
}

function getNextStudentId() {
    const prefix = "STD";
    const existingNumbers = students
        .map(s => s.id)
        .filter(id => typeof id === "string" && id.startsWith(prefix))
        .map(id => parseInt(id.slice(prefix.length), 10))
        .filter(num => !Number.isNaN(num));
    const next = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
    return prefix + String(next).padStart(4, "0");
}

function getNextInvoiceNumber() {
    const prefix = "JWT-2026-";
    const existingNumbers = invoices
        .map(inv => inv.invoiceNo)
        .filter(no => typeof no === "string" && no.startsWith(prefix))
        .map(no => parseInt(no.slice(prefix.length), 10))
        .filter(num => !Number.isNaN(num));
    const next = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
    return prefix + String(next).padStart(4, "0");
}

function getStudentPaidAmount(studentId) {
    return payments
        .filter(p => p.studentId === studentId)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

function updateStudentFinancials() {
    students.forEach(student => {
        const fee = Number(student.courseFee || MONTHLY_COURSE_FEE);
        const duration = Number(student.duration || 0);
        const baseAmount = fee * duration;
        const gstInfo = calculateGst(baseAmount, student.studentState);
        const paidFee = getStudentPaidAmount(student.id);
        const totalFee = Number((baseAmount + gstInfo.gstAmount).toFixed(2));
        student.baseAmount = baseAmount;
        student.gstAmount = gstInfo.gstAmount;
        student.gstBreakdown = gstInfo.breakdown;
        student.totalFee = totalFee;
        student.paidFee = paidFee;
        student.balanceFee = Math.max(totalFee - paidFee, 0);
        student.status = paidFee <= 0 ? "Pending" : paidFee >= totalFee ? "Paid" : "Partial";
        student.courseName = student.courseName || courses.find(c => c.id === student.courseId)?.name || "";
    });
    saveStudents();
}

function updateDashboard() {
    loadLocalData();

    const totalStudentsEl = document.getElementById("totalStudents");
    const totalRevenueEl = document.getElementById("totalRevenue");
    const pendingFeesEl = document.getElementById("pendingFees");
    const totalInvoicesEl = document.getElementById("totalInvoices");
    const recentPaymentsBody = document.getElementById("recentPaymentsTable");
    const monthlyCollection = document.getElementById("monthlyCollection");
    const gstCollected = document.getElementById("gstCollected");
    const reportPending = document.getElementById("reportPending");

    const totalStudents = students.length;
    const totalInvoices = invoices.length;
    const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalPending = students.reduce((sum, student) => sum + Number(student.balanceFee || 0), 0);
    const totalGst = students.reduce((sum, student) => sum + Number(student.gstAmount || 0), 0);

    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    if (totalRevenueEl) totalRevenueEl.textContent = `₹${formatCurrency(totalRevenue)}`;
    if (pendingFeesEl) pendingFeesEl.textContent = `₹${formatCurrency(totalPending)}`;
    if (totalInvoicesEl) totalInvoicesEl.textContent = totalInvoices;

    if (monthlyCollection) monthlyCollection.textContent = `₹${formatCurrency(totalRevenue)}`;
    if (gstCollected) gstCollected.textContent = `₹${formatCurrency(totalGst)}`;
    if (reportPending) reportPending.textContent = `₹${formatCurrency(totalPending)}`;

    if (recentPaymentsBody) {
        recentPaymentsBody.innerHTML = "";
        const recentPayments = [...payments]
            .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
            .slice(0, 5);
        recentPayments.forEach(payment => {
            const student = students.find(s => s.id === payment.studentId) || {};
            recentPaymentsBody.innerHTML += `
                <tr>
                    <td>${payment.paymentDate || "-"}</td>
                    <td>${student.name || payment.studentName || "-"}</td>
                    <td>${payment.courseName || "-"}</td>
                    <td>₹${formatCurrency(payment.amount)}</td>
                </tr>
            `;
        });
    }
}

function populateStudentCourseDropdown() {
    const select = document.getElementById("studentCourse");
    if (!select) return;
    select.innerHTML = `<option value="">Select Course</option>`;
    courses.forEach(course => {
        select.innerHTML += `<option value="${course.id}" data-duration="${course.duration}">${course.name}</option>`;
    });
}

function populateStudentDropdown() {
    const select = document.getElementById("feeStudent");
    if (!select) return;
    select.innerHTML = `<option value="">Select Student</option>`;
    students.forEach(student => {
        select.innerHTML += `<option value="${student.id}">${student.name}</option>`;
    });
}

function populateInvoiceStudentDropdown() {
    const select = document.getElementById("invoiceStudentSelect");
    if (!select) return;
    select.innerHTML = `<option value="">Select Student</option>`;
    students.forEach(student => {
        select.innerHTML += `<option value="${student.id}" data-state="${student.studentState || 'same'}">${student.name}</option>`;
    });
}

function populateFeeInvoiceDropdown(studentId = "") {
    const select = document.getElementById("feeInvoiceSelect");
    if (!select) return;
    select.innerHTML = `<option value="">Select Invoice</option>`;
    invoices
        .filter(invoice => !studentId || invoice.studentId === studentId)
        .forEach(invoice => {
            select.innerHTML += `<option value="${invoice.invoiceNo}">${invoice.invoiceNo} — ${invoice.studentName} — ${invoice.courseName}</option>`;
        });
}

function renderStudents() {
    const tbody = document.getElementById("studentTableBody");
    if (!tbody) return;
    loadLocalData();
    updateStudentFinancials();

    tbody.innerHTML = "";
    students.forEach(student => {
        const statusClass = student.status === "Paid" ? "badge badge-paid" : student.status === "Partial" ? "badge badge-partial" : "badge badge-pending";
        tbody.innerHTML += `
            <tr>
                <td>${student.name}</td>
                <td>${student.courseName || "-"}</td>
                <td>₹${formatCurrency(student.totalFee)}</td>
                <td><button type="button" class="btn-primary small" onclick="openInvoiceForStudent('${student.id}')">Invoice</button></td>
                <td><button type="button" class="btn-secondary small" onclick="openFeeCollectionForStudent('${student.id}')">Fee Collection</button></td>
                <td><span class="${statusClass}">${student.status}</span></td>
                <td>
                    <button type="button" class="btn-success small" onclick="editStudent('${student.id}')">Edit</button>
                    <button type="button" class="btn-danger small" onclick="deleteStudent('${student.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
    updateDashboard();
}

function renderCourses() {
    const tbody = document.getElementById("courseTableBody");
    if (!tbody) return;
    loadLocalData();
    tbody.innerHTML = "";
    courses.forEach(course => {
        const gstAmount = Number(course.gstAmount || course.gst || 0);
        const totalAmount = Number(course.totalAmount || course.total || 0);
        const trainingFeeTotal = Number(course.fee || 0) * Number(course.duration || 0);
        tbody.innerHTML += `
            <tr>
                <td>${course.name}</td>
                <td>${course.duration} Months</td>
                <td>₹${formatCurrency(course.fee || 0)} × ${course.duration} = ₹${formatCurrency(trainingFeeTotal)}</td>
                <td>₹${formatCurrency(gstAmount)}</td>
                <td>₹${formatCurrency(totalAmount)}</td>
                    <td class="action-vertical">
                        <button type="button" class="btn-primary small" onclick="editCourse('${course.id}')">Edit</button>
                        <button type="button" class="btn-danger small" onclick="deleteCourse('${course.id}')">Delete</button>
                    </td>
            </tr>
        `;
    });
    populateStudentCourseDropdown();
}

function renderInvoices() {
    const tbody = document.getElementById("invoiceTableBody");
    if (!tbody) return;
    loadLocalData();
    tbody.innerHTML = "";
    invoices.forEach(invoice => {
        tbody.innerHTML += `
            <tr>
                <td>${invoice.invoiceNo}</td>
                <td>${invoice.studentName}</td>
                <td>₹${formatCurrency(invoice.totalAmount)}</td>
                <td>${invoice.paymentStatus || 'Not Paid'}</td>
                <td>${invoice.invoiceDate}</td>
                <td>
                    <button type="button" class="btn-primary small" onclick="printInvoice('${invoice.invoiceNo}')">Print</button>
                </td>
            </tr>
        `;
    });
}

function renderPayments() {
    const tbody = document.getElementById("feeTableBody");
    if (!tbody) return;
    loadLocalData();
    tbody.innerHTML = "";
    students.forEach(student => {
        const studentInvoices = invoices.filter(inv => inv.studentId === student.id);
        if (!studentInvoices.length) return;
        const totalInvoiceAmount = studentInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        if (totalInvoiceAmount <= 0) return;
        const studentPayments = payments.filter(p => p.invoiceNo && studentInvoices.some(inv => inv.invoiceNo === p.invoiceNo));
        const paid = studentPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const balance = Math.max(totalInvoiceAmount - paid, 0);
        const status = paid <= 0 ? "Not Paid" : paid >= totalInvoiceAmount ? "Paid" : "Partial";
        tbody.innerHTML += `
            <tr>
                <td>${student.name}</td>
                <td>₹${formatCurrency(totalInvoiceAmount)}</td>
                <td>₹${formatCurrency(paid)}</td>
                <td>₹${formatCurrency(balance)}</td>
                <td>${status}</td>
            </tr>
        `;
    });
}

function updateStudentCoursePreview() {
    const courseSelect = document.getElementById("studentCourse");
    const stateSelect = document.getElementById("studentState");
    const courseFeeEl = document.getElementById("studentCourseFee");
    const gstEl = document.getElementById("studentGST");
    const totalEl = document.getElementById("studentTotalFee");

    if (!courseSelect || !courseFeeEl || !gstEl || !totalEl || !stateSelect) return;
    const selectedOption = courseSelect.selectedOptions[0];
    const duration = selectedOption ? Number(selectedOption.dataset.duration) || 0 : 0;
    const baseAmount = MONTHLY_COURSE_FEE * duration;
    const gstInfo = calculateGst(baseAmount, stateSelect.value);
    courseFeeEl.value = formatCurrency(MONTHLY_COURSE_FEE);
    gstEl.value = formatCurrency(gstInfo.gstAmount);
    totalEl.value = formatCurrency(baseAmount + gstInfo.gstAmount);
}

function resetCourseForm() {
    const form = document.getElementById("courseForm");
    if (!form) return;
    form.reset();
    document.getElementById("courseId").value = "";
    document.getElementById("courseFee").value = MONTHLY_COURSE_FEE;
    const saveBtn = document.getElementById('courseSaveBtn');
    if (saveBtn) saveBtn.textContent = 'Save Course';
}

function resetInvoiceForm() {
    const fields = [
        "invoiceStudentSelect",
        "invoiceStudentName",
        "invoiceStudentId",
        "invoiceStudentState",
        "invoiceCourseName",
        "invoiceBatch",
        "invoiceMobile",
        "invoiceGSTDetails",
        "invoiceGSTAmount",
        "invoiceTotalAmount",
        "invoicePaymentMode",
        "invoiceTransactionNumber",
        "invoicePaymentDate",
        "invoiceAmountInWords"
    ];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        if (element.tagName === "SELECT") element.selectedIndex = 0;
        else element.value = "";
    });
    const monthlyFeeEl = document.getElementById("invoiceMonthlyFee");
    if (monthlyFeeEl) monthlyFeeEl.value = formatCurrency(MONTHLY_COURSE_FEE);
    document.getElementById("invoiceNumber").value = getNextInvoiceNumber();
    document.getElementById("invoiceDate").value = formatDateForInput(new Date());
    const paymentDateEl = document.getElementById("invoicePaymentDate");
    if (paymentDateEl) paymentDateEl.value = formatDateForInput(new Date());
}

function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function convertNumberToWords(amount) {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function twoDigits(n) {
        if (n < 20) return units[n];
        const unit = n % 10;
        const ten = Math.floor(n / 10);
        return `${tens[ten]}${unit ? ` ${units[unit]}` : ""}`.trim();
    }

    function threeDigits(n) {
        const hundred = Math.floor(n / 100);
        const rest = n % 100;
        let result = "";
        if (hundred) result += `${units[hundred]} Hundred`;
        if (rest) result += `${result ? " " : ""}${twoDigits(rest)}`;
        return result.trim();
    }

    if (amount === 0) return "Zero Rupees";
    amount = Math.floor(amount);
    const crore = Math.floor(amount / 10000000);
    const lakh = Math.floor((amount % 10000000) / 100000);
    const thousand = Math.floor((amount % 100000) / 1000);
    const remainder = amount % 1000;
    const parts = [];
    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
    if (remainder) parts.push(threeDigits(remainder));
    return `Rupees ${parts.join(' ')} Only`;
}

function updateInvoiceTotals() {
    const trainingFee = Number(document.getElementById("invoiceTrainingFee").value) || 0;
    const stateText = document.getElementById("invoiceStudentState").value || 'same';
    const state = normalizeState(stateText);
    const baseTotal = trainingFee;
    const gstInfo = calculateGst(baseTotal, state);
    const totalAmount = Number((baseTotal + gstInfo.gstAmount).toFixed(2));
    document.getElementById("invoiceGSTAmount").value = formatCurrency(gstInfo.gstAmount);
    document.getElementById("invoiceGSTDetails").value = gstInfo.breakdown;
    document.getElementById("invoiceTotalAmount").value = totalAmount ? `₹${formatCurrency(totalAmount)}` : "";
    document.getElementById("invoiceAmountInWords").value = totalAmount ? convertNumberToWords(totalAmount) : "";
    document.getElementById("invoiceMonthlyFee").value = formatCurrency(MONTHLY_COURSE_FEE);
}

function getInvoiceFormData() {
    const invoiceNo = document.getElementById("invoiceNumber").value.trim();
    const invoiceDate = document.getElementById("invoiceDate").value.trim();
    const studentName = document.getElementById("invoiceStudentName").value.trim();
    const studentId = document.getElementById("invoiceStudentId").value.trim();
    const courseName = document.getElementById("invoiceCourseName").value.trim();
    const batch = document.getElementById("invoiceBatch").value.trim();
    const mobile = document.getElementById("invoiceMobile").value.trim();
    const stateText = document.getElementById("invoiceStudentState").value;
    const state = normalizeState(stateText);
    const trainingFee = Number(document.getElementById("invoiceTrainingFee").value) || 0;
    const gstAmount = Number(document.getElementById("invoiceGSTAmount").value) || 0;
    const gstBreakdown = document.getElementById("invoiceGSTDetails").value.trim();
    const totalAmount = Number((trainingFee + gstAmount).toFixed(2));
    const paymentMode = document.getElementById("invoicePaymentMode").value;
    const transactionNumber = document.getElementById("invoiceTransactionNumber").value.trim();
    const paymentDate = document.getElementById("invoicePaymentDate").value.trim();
    const amountInWords = document.getElementById("invoiceAmountInWords").value.trim();

    if (!studentName || !courseName || totalAmount <= 0) {
        alert("Please provide student name, course name, and valid fee amounts.");
        return null;
    }

    return {
        invoiceNo,
        invoiceDate,
        studentId,
        studentName,
        courseName,
        batch,
        mobile,
        state,
        trainingFee,
        gstAmount,
        gstBreakdown,
        totalAmount,
        paymentMode,
        transactionNumber,
        paymentDate,
        amountInWords,
        paymentStatus: 'Not Paid'
    };
}

function printInvoiceObject(invoice) {
    const w = window.open("", "_blank", "width=900,height=900");
    const trainingFeeLine = `₹${formatCurrency(invoice.trainingFee)}`;
    const gstLine = invoice.gstBreakdown ? invoice.gstBreakdown : `GST ₹${formatCurrency(invoice.gstAmount)}`;
    const totalLine = `₹${formatCurrency(invoice.totalAmount)}`;
    w.document.write(`
        <html>
        <head>
            <title>${invoice.invoiceNo}</title>
            <style>
                @page { margin: 8mm; }
                body { font-family: Arial, sans-serif; margin: 8px; color: #111; font-size: 12px; }
                .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
                .logo { max-width: 90px; max-height: 90px; object-fit: contain; }
                .company-title { text-align: center; flex: 1; margin: 0 10px; }
                .company-title h1 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
                .company-title p { margin: 4px 0; color: #444; line-height: 1.3; font-size: 11px; }
                .details, .items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                .details td, .items th, .items td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
                .items th { background: #f4f7fc; text-align: left; }
                .text-right { text-align: right; }
                .summary td { border: none; padding: 3px 6px; font-size: 12px; }
                p { margin: 5px 0; line-height: 1.25; font-size: 12px; }
                .terms { margin-top: 10px; padding: 8px; border: 1px solid #ccc; background: #f9f9f9; }
                .terms h3 { margin: 0 0 6px; font-size: 13px; }
                .terms ol { margin: 0 0 0 12px; padding: 0; }
                .terms li { margin-bottom: 3px; line-height: 1.12; font-size: 10px; }
                .signature { margin-top: 8px; display: flex; justify-content: space-between; }
                .signature div { width: 30%; text-align: center; font-size: 11px; }
                .signature-line { margin-top: 18px; border-top: 1px solid #444; padding-top: 2px; }
            </style>
        </head>
        <body>
            <div class="header">
                <img class="logo" src="logo.png" alt="Job Way Tech Logo">
                <div class="company-title">
                    <h1>JOB WAY TECH CONSULTANT & TRAINING</h1>
                    <p>Indra Nagar, Madanapalle, Andhra Pradesh - 517325</p>
                    <p>GSTIN: 37BGXPH0623Q1ZP</p>
                    <p>Phone: 9701657953</p>
                </div>
            </div>
            <table class="details">
                <tr><td><strong>Invoice No:</strong> ${invoice.invoiceNo}</td><td><strong>Date:</strong> ${invoice.invoiceDate}</td></tr>
                <tr><td><strong>Student Name:</strong> ${invoice.studentName}</td><td><strong>Student ID:</strong> ${invoice.studentId || '-'}</td></tr>
                <tr><td><strong>Course:</strong> ${invoice.courseName}</td><td><strong>State:</strong> ${formatStateLabel(invoice.state)}</td></tr>
            </table>
            <table class="items">
                <tr><th>Description</th><th class="text-right">Amount (₹)</th></tr>
                <tr><td>Training Fee</td><td class="text-right">${trainingFeeLine}</td></tr>
                <tr><td>GST</td><td class="text-right">${gstLine}</td></tr>
                <tr><td><strong>Total Amount</strong></td><td class="text-right"><strong>${totalLine}</strong></td></tr>
            </table>
            <table class="summary">
                <tr><td><strong>Payment Mode:</strong></td><td>${invoice.paymentMode || '-'}</td></tr>
                <tr><td><strong>Transaction No.:</strong></td><td>${invoice.transactionNumber || '-'}</td></tr>
                <tr><td><strong>Payment Deadline:</strong></td><td>${invoice.paymentDate || '-'}</td></tr>
            </table>
            <p><strong>Amount in Words:</strong> ${invoice.amountInWords || convertNumberToWords(invoice.totalAmount)}</p>
            <div class="terms">
                <h3>Terms and Conditions</h3>
                <ol>
                    <li>A receipt is only valid upon the successful realization of funds (cash received, UPI/bank transfer clearance, or cheque realization).</li>
                    <li>If a course fee is being paid in installments, all subsequent installments must be cleared on or before the specified due dates. Failure to do so may lead to a temporary suspension of training access.</li>
                    <li>All fees once paid to Job Way Tech Consultant and Training are strictly non-refundable and non-transferable to any other candidate or course, except where explicitly agreed upon in writing prior to registration.</li>
                    <li>All fees are inclusive/exclusive of applicable government taxes.</li>
                </ol>
            </div>
            <div class="signature">
                <div><span class="signature-line">Student Signature</span></div>
                <div><span class="signature-line">Authorized Signatory</span></div>
            </div>
        </body>
        </html>
    `);
    w.print();
}

function printInvoice(invoiceNo) {
    loadLocalData();
    const invoice = invoices.find(inv => inv.invoiceNo === invoiceNo);
    if (!invoice) {
        console.error("Invoice not found:", invoiceNo);
        alert("Invoice not found. Please try again.");
        return;
    }
    printInvoiceObject(invoice);
}

function openInvoiceForStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    document.querySelector('.nav-item[data-page="invoices"]').click();
    resetInvoiceForm();
    const normalizedState = normalizeState(student.studentState);
    const duration = Number(student.duration) || 0;
    const baseAmount = MONTHLY_COURSE_FEE * duration;
    const gstInfo = calculateGst(baseAmount, normalizedState);
    document.getElementById("invoiceStudentName").value = student.name || "";
    document.getElementById("invoiceStudentId").value = student.id || "";
    document.getElementById("invoiceStudentState").value = formatStateLabel(normalizedState);
    document.getElementById("invoiceCourseName").value = student.courseName || "";
    document.getElementById("invoiceCourseDuration").value = duration ? `${duration} Months` : "";
    document.getElementById("invoiceTrainingFee").value = formatCurrency(baseAmount);
    document.getElementById("invoiceMonthlyFee").value = formatCurrency(MONTHLY_COURSE_FEE);
    document.getElementById("invoiceGSTAmount").value = formatCurrency(gstInfo.gstAmount);
    document.getElementById("invoiceGSTDetails").value = gstInfo.breakdown;
    document.getElementById("invoiceMobile").value = student.mobile || "";
    document.getElementById("invoiceTotalAmount").value = `₹${formatCurrency(baseAmount + gstInfo.gstAmount)}`;
    document.getElementById("invoicePaymentDate").value = formatDateForInput(new Date());
    document.getElementById("invoiceAmountInWords").value = convertNumberToWords(baseAmount + gstInfo.gstAmount);
}

function openFeeCollectionForStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    document.querySelector('.nav-item[data-page="fees"]').click();
    const feeStudent = document.getElementById("feeStudent");
    if (feeStudent) {
        feeStudent.value = student.id;
        populateFeeInvoiceDropdown(student.id);
    }
    const feeInvoiceSelect = document.getElementById("feeInvoiceSelect");
    if (feeInvoiceSelect && feeInvoiceSelect.options.length > 1) {
        feeInvoiceSelect.selectedIndex = 1;
        feeInvoiceSelect.dispatchEvent(new Event('change'));
    }
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    document.getElementById("studentId").value = student.id;
    document.getElementById("studentName").value = student.name;
    document.getElementById("studentMobile").value = student.mobile;
    document.getElementById("studentEmail").value = student.email;
    document.getElementById("studentQualification").value = student.qualification;
    document.getElementById("collegeName").value = student.college;
    document.getElementById("joiningDate").value = student.joiningDate;
    document.getElementById("studentAddress").value = student.address;
    document.getElementById("aadharNumber").value = student.aadharNumber || "";
    const stateInput = document.getElementById("studentState");
    if (stateInput) stateInput.value = student.studentState || "";
    const courseSelect = document.getElementById("studentCourse");
    if (courseSelect) {
        courseSelect.value = student.courseId || "";
    }
    updateStudentCoursePreview();
}

function deleteStudent(id) {
    if (!confirm("Delete Student?")) return;
    students = students.filter(s => s.id !== id);
    saveStudents();
    renderStudents();
    populateStudentDropdown();
    populateInvoiceStudentDropdown();
    renderPayments();
}

function editCourse(id) {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    document.getElementById("courseId").value = course.id;
    document.getElementById("courseName").value = course.name;
    document.getElementById("courseDuration").value = course.duration;
    const saveBtn = document.getElementById('courseSaveBtn');
    if (saveBtn) saveBtn.textContent = 'Update Course';
    document.getElementById('courseName').focus();
}

function deleteCourse(id) {
    if (!confirm("Delete Course?")) return;
    courses = courses.filter(c => c.id !== id);
    saveCourses();
    renderCourses();
    populateStudentCourseDropdown();
}

function populateFeeFormFromInvoice(invoice) {
    const fields = {
        feeCourseName: invoice.courseName,
        feeBatch: invoice.batch,
        feeTrainingFee: invoice.trainingFee,
        feeTotalAmount: invoice.totalAmount
    };
    Object.keys(fields).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = fields[id] || "";
    });
}

function clearFeeFormDetails() {
    ["feeCourseName", "feeBatch", "feeTrainingFee", "feeTotalAmount"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function initializeInvoiceForm() {
    populateInvoiceStudentDropdown();
    document.getElementById("invoiceNumber").value = getNextInvoiceNumber();
    document.getElementById("invoiceDate").value = formatDateForInput(new Date());
    const studentSelect = document.getElementById("invoiceStudentSelect");
    if (studentSelect) {
        studentSelect.addEventListener("change", () => {
            const student = students.find(s => s.id === studentSelect.value);
            if (!student) return;
            const normalizedState = normalizeState(student.studentState);
            const duration = Number(student.duration) || 0;
            const baseAmount = MONTHLY_COURSE_FEE * duration;
            const gstInfo = calculateGst(baseAmount, normalizedState);
            document.getElementById("invoiceStudentName").value = student.name || "";
            document.getElementById("invoiceStudentId").value = student.id || "";
            document.getElementById("invoiceStudentState").value = normalizedState;
            document.getElementById("invoiceCourseName").value = student.courseName || "";
            document.getElementById("invoiceCourseDuration").value = duration ? `${duration} Months` : "";
            document.getElementById("invoiceTrainingFee").value = formatCurrency(baseAmount);
            document.getElementById("invoiceMonthlyFee").value = formatCurrency(MONTHLY_COURSE_FEE);
            document.getElementById("invoiceGSTAmount").value = formatCurrency(gstInfo.gstAmount);
            document.getElementById("invoiceGSTDetails").value = gstInfo.breakdown;
            document.getElementById("invoiceMobile").value = student.mobile || "";
            document.getElementById("invoiceTotalAmount").value = `₹${formatCurrency(baseAmount + gstInfo.gstAmount)}`;
            document.getElementById("invoicePaymentDate").value = formatDateForInput(new Date());
            document.getElementById("invoiceAmountInWords").value = convertNumberToWords(baseAmount + gstInfo.gstAmount);
        });
    }
    ["invoiceTrainingFee", "invoiceStudentState"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const eventType = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(eventType, updateInvoiceTotals);
    });
}

function attachEventHandlers() {
    const studentForm = document.getElementById("studentForm");
    if (studentForm) {
        studentForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const id = document.getElementById("studentId").value || getNextStudentId();
            const selectedCourseId = document.getElementById("studentCourse").value;
            const selectedState = document.getElementById("studentState").value || 'same';
            const selectedCourse = courses.find(course => course.id === selectedCourseId) || null;
            const selectedOption = document.getElementById("studentCourse").selectedOptions[0] || null;
            const duration = selectedCourse ? Number(selectedCourse.duration) || 0 : Number(selectedOption?.dataset.duration) || 0;
            const baseAmount = MONTHLY_COURSE_FEE * duration;
            const gstInfo = calculateGst(baseAmount, selectedState);
            const totalFee = Number((baseAmount + gstInfo.gstAmount).toFixed(2));
            const existingIndex = students.findIndex(s => s.id === id);
            const existingStudent = existingIndex >= 0 ? students[existingIndex] : null;
            const paidFee = existingStudent ? Number(existingStudent.paidFee || 0) : 0;
            const balanceFee = Math.max(totalFee - paidFee, 0);
            const status = paidFee <= 0 ? "Pending" : paidFee >= totalFee ? "Paid" : "Partial";
            const student = {
                id,
                name: document.getElementById("studentName").value,
                mobile: document.getElementById("studentMobile").value,
                email: document.getElementById("studentEmail").value,
                qualification: document.getElementById("studentQualification").value,
                college: document.getElementById("collegeName").value,
                joiningDate: document.getElementById("joiningDate").value,
                courseId: selectedCourseId,
                courseName: selectedCourse ? selectedCourse.name : "",
                courseFee: MONTHLY_COURSE_FEE,
                duration,
                studentState: selectedState,
                baseAmount,
                gstAmount: gstInfo.gstAmount,
                gstBreakdown: gstInfo.breakdown,
                totalFee,
                paidFee,
                balanceFee,
                status,
                address: document.getElementById("studentAddress").value,
                studentCourseFee: formatCurrency(MONTHLY_COURSE_FEE),
                studentGST: formatCurrency(gstInfo.gstAmount),
                studentTotalFee: formatCurrency(totalFee),
                aadharNumber: document.getElementById("aadharNumber").value
            };
            if (existingIndex >= 0) {
                students[existingIndex] = student;
            } else {
                students.push(student);
            }
            saveStudents();
            renderStudents();
            populateStudentDropdown();
            populateInvoiceStudentDropdown();
            updateDashboard();
            this.reset();
            document.getElementById("studentCourseFee").value = "";
            document.getElementById("studentGST").value = "";
            document.getElementById("studentTotalFee").value = "";
            alert("Student Saved Successfully");
        });
    }

    const courseForm = document.getElementById("courseForm");
    if (courseForm) {
        courseForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const id = document.getElementById("courseId").value || "CRS" + Date.now();
            const name = document.getElementById("courseName").value.trim();
            const duration = Number(document.getElementById("courseDuration").value) || 0;
            const fee = MONTHLY_COURSE_FEE;
            const baseTotal = fee * duration;
            const gstAmount = Number((baseTotal * GST_RATE).toFixed(2));
            const totalAmount = Number((baseTotal + gstAmount).toFixed(2));
            const course = { id, name, fee, duration, gstAmount, totalAmount };
            const existingIndex = courses.findIndex(c => c.id === id);
            if (existingIndex >= 0) {
                courses[existingIndex] = course;
            } else {
                courses.push(course);
            }
            saveCourses();
            renderCourses();
            resetCourseForm();
            alert("Course Saved");
        });
    }

    const feeForm = document.getElementById("feeForm");
    if (feeForm) {
        feeForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const studentId = document.getElementById("feeStudent").value;
            const invoiceNo = document.getElementById("feeInvoiceSelect").value;
            const paidAmount = Number(document.getElementById("paidAmount").value) || 0;
            if (!studentId || !invoiceNo) {
                alert("Please select student and invoice before recording payment.");
                return;
            }
            if (paidAmount <= 0) {
                alert("Enter a valid paid amount.");
                return;
            }
            const payment = {
                id: "PAY" + Date.now(),
                studentId,
                invoiceNo,
                courseName: document.getElementById("feeCourseName").value,
                batch: document.getElementById("feeBatch").value,
                trainingFee: Number(document.getElementById("feeTrainingFee").value) || 0,
                totalAmount: Number(document.getElementById("feeTotalAmount").value) || 0,
                amount: paidAmount,
                paymentDate: document.getElementById("paymentDate").value,
                mode: document.getElementById("paymentMode").value,
                transaction: document.getElementById("transactionNumber").value
            };
            payments.push(payment);
            savePayments();
            syncPaymentsToInvoices();
            renderPayments();
            renderInvoices();
            updateDashboard();
            this.reset();
            clearFeeFormDetails();
            alert("Payment Recorded");
        });
    }

    

    const studentCourseSelect = document.getElementById("studentCourse");
    if (studentCourseSelect) {
        studentCourseSelect.addEventListener("change", updateStudentCoursePreview);
    }
    const studentStateSelect = document.getElementById("studentState");
    if (studentStateSelect) {
        studentStateSelect.addEventListener("change", updateStudentCoursePreview);
    }

    const feeStudent = document.getElementById("feeStudent");
    if (feeStudent) {
        feeStudent.addEventListener("change", () => {
            populateFeeInvoiceDropdown(feeStudent.value);
            clearFeeFormDetails();
        });
    }

    const feeInvoiceSelect = document.getElementById("feeInvoiceSelect");
    if (feeInvoiceSelect) {
        feeInvoiceSelect.addEventListener("change", () => {
            const invoice = invoices.find(inv => inv.invoiceNo === feeInvoiceSelect.value);
            if (invoice) {
                populateFeeFormFromInvoice(invoice);
                if (feeStudent) feeStudent.value = invoice.studentId || "";
            } else {
                clearFeeFormDetails();
            }
        });
    }

    const generateInvoiceBtn = document.getElementById("generateInvoiceBtn");
    if (generateInvoiceBtn) {
        generateInvoiceBtn.addEventListener("click", resetInvoiceForm);
    }

    const invoiceForm = document.getElementById("invoiceForm");
    if (invoiceForm) {
        invoiceForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const invoiceData = getInvoiceFormData();
            if (!invoiceData) return;
            invoices.push(invoiceData);
            saveInvoices();
            populateFeeInvoiceDropdown();
            syncPaymentsToInvoices();
            renderInvoices();
            renderPayments();
            updateDashboard();
            const savedInvoice = invoices.find(i => i.invoiceNo === invoiceData.invoiceNo) || invoiceData;
            printInvoiceObject(savedInvoice);
            resetInvoiceForm();
        });
    }

    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener("click", function () {
            const invoicePrefix = document.getElementById("invoicePrefix");
            if (invoicePrefix) {
                alert("Settings saved.");
            }
        });
    }

    const clearAppStorageBtn = document.getElementById("clearAppStorageBtn");
    if (clearAppStorageBtn) {
        clearAppStorageBtn.addEventListener("click", function () {
            if (confirm("This will clear all local app data and refresh the page. Continue?")) {
                clearAppStorage();
            }
        });
    }
}

function syncPaymentsToInvoices() {
    invoices.forEach(inv => {
        const related = payments.filter(p => p.invoiceNo === inv.invoiceNo);
        const paid = related.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        inv.paymentStatus = paid >= Number(inv.totalAmount || 0) ? 'Paid' : paid > 0 ? 'Partial' : 'Not Paid';
    });
    saveInvoices();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active-page'));
            item.classList.add('active');
            const pageId = item.dataset.page;
            document.getElementById(pageId).classList.add('active-page');
        });
    });
}

function clearAppStorage() {
    localStorage.clear();
    students = [];
    courses = [];
    payments = [];
    invoices = [];
    renderCourses();
    renderStudents();
    renderInvoices();
    renderPayments();
    updateDashboard();
    window.location.assign(window.location.pathname);
}

function initApp() {
    loadLocalData();
    syncPaymentsToInvoices();
    setupNavigation();
    attachEventHandlers();
    resetCourseForm();
    populateStudentCourseDropdown();
    populateStudentDropdown();
    populateInvoiceStudentDropdown();
    populateFeeInvoiceDropdown();
    initializeInvoiceForm();
    renderCourses();
    renderStudents();
    renderInvoices();
    renderPayments();
    updateDashboard();
}

function bootstrapApp() {
    attachAuthHandlers();
    const auth = getStoredAuth();

    if (!auth) {
        showLoginScreen();
        return;
    }

    showAppShell();
    initApp();
}

window.addEventListener('DOMContentLoaded', bootstrapApp);
