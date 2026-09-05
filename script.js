const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";
let students = [];

// මාස වල අනුපිළිවෙල
const monthsOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// 🚀 Bulk Messaging Queue Variables
let bulkQueue = [];
let bulkCurrentIndex = 0;

async function loadData() {
    const res = await fetch(SCRIPT_URL);
    students = await res.json();
    renderStudents();
    checkBirthdays();
}

async function saveData() {
    await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(students) });
}

window.onload = function() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        let toggleBtn = document.querySelector(".dark-mode-toggle");
        if(toggleBtn) toggleBtn.innerText = "☀️";
    }
    
    loadData().then(() => {
        showSection('summarySection');
    }).catch(err => {
        console.error("Data loading error: ", err);
        showSection('summarySection');
    });
};

function renderStudents() {
    let list = document.getElementById("studentList");
    let search = document.getElementById("searchBar").value.toLowerCase();
    let month = document.getElementById("monthSelect").value;
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    list.innerHTML = "";

    let currentMonthIdx = monthsOrder.indexOf(month);

    let filteredList = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let studentGroup = s.group || s.class || s.classGroup || "";
        let matchesGroup = (selectedGroup === "All") || (studentGroup === selectedGroup);
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) {
                isAvailableInMonth = false;
            }
        }
        
        return matchesSearch && matchesGrade && matchesGroup && isAvailableInMonth;
    });
    
    filteredList.forEach((s) => {
        let sIdx = students.indexOf(s);
        let sameGradeStudents = students.filter(st => st.grade === s.grade);
        let rankedInGrade = [...sameGradeStudents].sort((a, b) => (b.marks?.[month] || 0) - (a.marks?.[month] || 0));
        let rank = rankedInGrade.findIndex(rs => rs.name === s.name) + 1;
        
        if(!s.attendance) s.attendance = {};
        if(!s.attendance[month]) s.attendance[month] = ["-","-","-","-"];
        if(!s.fees) s.fees = {};
        if(!s.marks) s.marks = {};

        let isPaid = s.fees[month] === "Paid";
        let score = s.marks[month] || 0;

        let card = document.createElement("div");
        card.className = "student-card";
        card.style.borderLeft = isPaid ? "8px solid #27ae60" : "8px solid #e74c3c";
        
        let badge = "";
        if (score > 0) {
            if (rank === 1) badge = "🥇 1st Place";
            else if (rank === 2) badge = "🥈 2nd Place";
            else if (rank === 3) badge = "🥉 3rd Place";
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>#${rank} - ${s.name} <span style="font-size:12px; color:#3498db;">(${s.grade || 'N/A'})</span></h3>
                ${badge ? `<span style="background:#f1c40f; color:black; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${badge}</span>` : ""}
            </div>
            <small>${s.group} | Fee: Rs.${s.fee}</small>
            ${isPaid && s.paymentDates && s.paymentDates[month] ? `<div style="font-size:11px; color:#27ae60; margin-top:3px;">✅ Paid on: ${s.paymentDates[month]}</div>` : ''}
            
            <div style="margin:10px 0;">
                ${s.attendance[month].map((a, i) => `<button class="att-btn ${a==='P'?'present':a==='A'?'absent':''}" onclick="mark(${sIdx},'${month}',${i})">${a}</button>`).join('')}
            </div>

            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <input type="number" id="m-${sIdx}" value="${score}" placeholder="Marks" style="width:70px; margin:0; padding:5px;">
                <button onclick="saveMarks(${sIdx}, '${month}')" style="background:#34495e; width:auto; padding:5px 10px; font-size:12px;">Add Marks</button>
            </div>

            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <button onclick="togglePaid(${sIdx}, '${month}')" style="background:${isPaid?'#95a5a6':'#2ecc71'}; font-size:12px; padding:8px;">
                    ${isPaid ? 'Paid ✅' : 'Mark as Paid'}
                </button>
                <button onclick="send3WeekRemind(${sIdx}, '${month}')" style="background:#f39c12; font-size:12px; padding:8px;">⚠️ Remind</button>
                <button onclick="sendProgress(${sIdx}, '${month}', ${rank})" style="background:#3498db; font-size:12px; padding:8px;">📊 Rank</button>
                <button onclick="send4WeekRemind(${sIdx}, '${month}')" style="background:#c0392b; font-size:12px; padding:8px; margin-top:5px;">🚨 4 Week Alert</button>
                <button onclick="toggleExcused(${sIdx}, '${month}')" style="background:${s.fees[month]==='Excused'?'#8e44ad':'#9b59b6'}; font-size:12px; padding:8px; color:white; border:none; border-radius:4px; cursor:pointer;">
                ${s.fees[month] === 'Excused' ? '🚫 Excused' : 'Skip Pending'}
                </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 8px;">
                <button onclick="editStudent(${sIdx})" style="background:none; color:gray; border:none; font-size:11px; cursor:pointer;">📝 Edit Details</button>
                <button onclick="deleteStudent(${sIdx})" style="background:none; color:#e74c3c; border:none; font-size:11px; cursor:pointer; font-weight:bold;">🗑️ Remove Student</button>
            </div>
        `;
        list.appendChild(card);
    });

    updatePendingList();
    updateIncomeSummary(filteredList); 
}

function saveMarks(sIdx, month) {
    if(!students[sIdx].marks) students[sIdx].marks = {};
    students[sIdx].marks[month] = document.getElementById(`m-${sIdx}`).value;
    saveData();
    renderStudents();
}

function send3WeekRemind(idx, month) {
    let s = students[idx];
    let msg = `දෙමාපියන්ගේ අවධානය පිණිසයි,\n\n` +
              `ඔබගේ දරුවා (*${s.name}*) *${month}* මාසය (ගිය මාසය) සඳහා පන්ති ගාස්තු ගෙවා ඇති බව පද්ධතියේ සටහන්ව නොමැත.\n\n` +
              `කරුණාකර ඒ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

function sendProgress(idx, month) {
    let s = students[idx];
    let score = s.marks?.[month] || 0;

    let sameGradeStudents = students.filter(st => st.grade === s.grade);
    let rankedInGrade = [...sameGradeStudents].sort((a, b) => (b.marks?.[month] || 0) - (a.marks?.[month] || 0));
    
    let rank = rankedInGrade.findIndex(rs => rs.name === s.name) + 1;
    let first = rankedInGrade[0] ? (rankedInGrade[0].marks?.[month] || 0) : "0";
    let second = rankedInGrade[1] ? (rankedInGrade[1].marks?.[month] || 0) : "0";
    let third = rankedInGrade[2] ? (rankedInGrade[2].marks?.[month] || 0) : "0";

    let msg = `Student: *${s.name}*\n` +
              `Grade: *${s.grade || 'N/A'}*\n` +
              `--------------------------\n` +
              `🏆 Your Child's Score: *${score}*\n` +
              `📊 Class Rank: *${rank}*\n\n` +
              `📈 Class Performance (${s.grade}):\n` +
              `- 🥇 1st Place: ${first}\n` +
              `- 🥈 2nd Place: ${second}\n` +
              `- 🥉 3rd Place: ${third}\n` +
              `--------------------------\n\n` +
              `Thank you!`;

    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`);
}

function updatePendingList() {
    let month = document.getElementById("monthSelect").value;
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let display = document.getElementById("pendingDisplay");
    display.innerHTML = "";

    let currentMonthIdx = monthsOrder.indexOf(month);

    let groupsToShow = (selectedGroup === "All") 
        ? [...new Set(students.map(s => s.group))] 
        : [selectedGroup];

    groupsToShow.forEach(groupName => {
        let unpaid = students.filter(s => {
            let studentGroup = s.group || s.class || s.classGroup || "";
            let matchesGroup = studentGroup === groupName;
            
            let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
            let isUnpaid = (!s.fees || (s.fees[month] !== "Paid" && s.fees[month] !== "Excused"));
            
            let isAvailableInMonth = true;
            if (s.joinedMonth) {
                let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
                if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
            }
            
            return matchesGroup && matchesGrade && isUnpaid && isAvailableInMonth;
        });

        if (unpaid.length > 0) {
            let namesList = unpaid.map((s, i) => `${i+1}. ${s.name} (${s.grade || 'N/A'})`).join("\n");
            
            // 🛑 මෙන්න මෙතන පළමු පේළිය අගට + එකතු කර ඇත
            let waMsg = `*⚠️ PENDING PAYMENTS - ${groupName} ${selectedGrade !== "All" ? `(${selectedGrade})` : ""}*\n` +
                        `*Month:* ${month}\n` +
                        `--------------------------\n` +
                        `${namesList}\n` +
                        `--------------------------\n` +
                        `කරුණාකර ගාස්තු ගෙවා ඇත්නම් දැනුම් දෙන්න. ස්තූතියි!`;

            let div = document.createElement("div");
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ddd";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small><b>📌 ${groupName} ${selectedGrade !== "All" ? `(${selectedGrade})` : ""}</b></small>
                    <span style="font-size:10px; color:#e74c3c; font-weight:bold;">${unpaid.length} Pending</span>
                </div>
                <pre style="font-size:11px; background:#f9f9f9; padding:8px; border-radius:4px; margin:8px 0; border:1px solid #eee; color: black;">${namesList}</pre>
                <button onclick="copyToClipboard('${encodeURIComponent(waMsg)}')" style="background:#25D366; font-size:11px; padding:6px; width:100%; border-radius:5px; color:white; border:none; cursor:pointer;">📋 Copy ${groupName} List</button>
            `;
            display.appendChild(div);
        }
    });

    if (display.innerHTML === "") {
        display.innerHTML = "<p style='font-size:12px; color:gray; text-align:center; padding:10px;'>තෝරාගත් ශ්‍රේණිය/පන්තිය සඳහා සියලුම දෙනා ගෙවීම් කර ඇත. ✅</p>";
    }
}

// යාවත්කාලීන කළ togglePaid Function එක
async function togglePaid(idx, month) {
    let s = students[idx];
    if (!s.fees) s.fees = {};
    if (!s.paymentDates) s.paymentDates = {}; // අලුතින් එකතු කළ කොටස

    if (s.fees[month] === "Paid") {
        s.fees[month] = "Unpaid";
        delete s.paymentDates[month]; // Unpaid කළොත් Timestamp එක මැකෙනවා
    } else {
        s.fees[month] = "Paid";
        
        // දැනට තියෙන දිනය සහ වෙලාව ගන්නවා
        let now = new Date();
        let dateString = now.toLocaleDateString('en-GB') + " - " + now.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        s.paymentDates[month] = dateString; // System එකේ සේව් වෙනවා
        
        let receiptNo = "RCPT-" + Date.now().toString().slice(-6); 
        
        let msg = `━━━━━━━━━━━━━━━━━━━━\n🌟 *EXCELLENCE MATHS CLASS* 🌟\n━━━━━━━━━━━━━━━━━━━━\n*DATE:* ${dateString}\n*RECEIPT NO:* #${receiptNo}\n━━━━━━━━━━━━━━━━━━━━\n*NAME:* ${s.name}\n*GRADE:* ${s.grade || 'N/A'}\n*MONTH:* ${month}\n*FEE:* Rs. ${s.fee}.00\n━━━━━━━━━━━━━━━━━━━━\n*STATUS:* ✅ *SUCCESSFULLY PAID*\n━━━━━━━━━━━━━━━━━━━━\nස්තුතියි! පන්තියේදී හමුවෙමු.`;

        window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    await saveData();
    renderStudents();
}

function mark(sIdx, month, wIdx) {
    let curr = students[sIdx].attendance[month][wIdx];
    students[sIdx].attendance[month][wIdx] = curr === "P" ? "A" : curr === "A" ? "-" : "P";
    saveData(); renderStudents();
}

function copyToClipboard(encodedMsg) {
    navigator.clipboard.writeText(decodeURIComponent(encodedMsg)).then(() => alert("Copied!"));
}

function editStudent(idx) {
    let s = students[idx];
    document.getElementById("studentName").value = s.name;
    document.getElementById("studentDOB").value = s.dob || ""; 
    document.getElementById("parentPhone").value = s.phone;
    document.getElementById("studentGrade").value = s.grade || ""; 
    document.getElementById("group").value = s.group;
    document.getElementById("monthlyFee").value = s.fee;
    document.getElementById("editIdx").value = idx;
    
    document.getElementById("formTitle").innerText = "📝 Edit Student"; 
    window.scrollTo(0,0); 
}

function addOrUpdateStudent() {
    let name = document.getElementById("studentName").value;
    let dob = document.getElementById("studentDOB").value;
    let phone = document.getElementById("parentPhone").value;
    let grade = document.getElementById("studentGrade").value;
    let group = document.getElementById("group").value;
    let fee = document.getElementById("monthlyFee").value;
    let editIdx = document.getElementById("editIdx").value;
    
    let currentMonth = document.getElementById("monthSelect").value;

    if(name === "" || phone === "") { alert("සම්පූර්ණ විස්තර ඇතුළත් කරන්න"); return; }

    if(editIdx === "") {
        students.push({ 
            name, phone, grade, group, fee, dob, 
            joinedMonth: currentMonth, 
            marks: {}, attendance: {}, fees: {} 
        });
    } else {
    // Edit කරන අවස්ථාව
    let existingJoinedMonth = students[editIdx].joinedMonth || currentMonth;

    students[editIdx].name = name;
    students[editIdx].dob = dob;
    students[editIdx].phone = phone;
    students[editIdx].grade = grade;
    students[editIdx].group = group;
    students[editIdx].fee = fee;
    students[editIdx].joinedMonth = existingJoinedMonth; // එකතු කරන්න
        
        if(!students[editIdx].marks) students[editIdx].marks = {};
        if(!students[editIdx].attendance) students[editIdx].attendance = {};
        if(!students[editIdx].fees) students[editIdx].fees = {};

        document.getElementById("editIdx").value = "";
        document.getElementById("formTitle").innerText = "+ Add Student";
    }
    
    saveData(); 
    renderStudents();
    checkBirthdays();
    
    document.getElementById("studentName").value = "";
    document.getElementById("studentDOB").value = "";
    document.getElementById("parentPhone").value = "";
    document.getElementById("monthlyFee").value = "";
}

function updateIncomeSummary(dataToShow) {
    let listToCalculate = dataToShow || students; 
    
    let month = document.getElementById("monthSelect").value;
    let summaryMonthLabel = document.getElementById("summaryMonth");
    if(summaryMonthLabel) summaryMonthLabel.innerText = month;

    let totalExpected = 0;
    let totalCollected = 0;
    let counts = {}; 

    listToCalculate.forEach(s => {
    let fee = parseFloat(s.fee) || 0;
    
    // Excused කර නැතිනම් පමණක් Expected Income එකට එකතු කරයි
    if (!s.fees || s.fees[month] !== "Excused") {
        totalExpected += fee;
    }
    
    if (s.fees && s.fees[month] === "Paid") {
        totalCollected += fee;
    }

    let g = s.grade || "N/A";
    counts[g] = (counts[g] || 0) + 1;
});

    let totalPending = totalExpected - totalCollected;

    document.getElementById("totalExpected").innerText = `Rs. ${totalExpected.toLocaleString()}`;
    document.getElementById("totalCollected").innerText = `Rs. ${totalCollected.toLocaleString()}`;
    document.getElementById("totalPending").innerText = `Rs. ${totalPending.toLocaleString()}`;
    document.getElementById("totalStudentsCount").innerText = listToCalculate.length;

    let gradeHtml = Object.keys(counts)
        .sort()
        .map(g => `<span>${g}: ${counts[g]}</span>`)
        .join("");
    
    document.getElementById("gradeCounts").innerHTML = gradeHtml;
}

function deleteStudent(idx) {
    let s = students[idx];
    if(confirm(`ඔබට "${s.name}" ශිෂ්‍යයාව පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍ය බව සහතිකද?`)) {
        students.splice(idx, 1);
        saveData(); 
        renderStudents(); 
    }
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const btn = document.querySelector(".dark-mode-toggle");
    
    if (document.body.classList.contains("dark-mode")) {
        btn.innerText = "☀️"; 
        localStorage.setItem("theme", "dark");
    } else {
        btn.innerText = "🌙"; 
        localStorage.setItem("theme", "light");
    }
}

// 🎉 Check Birthdays & Display Individual Cards
function checkBirthdays() {
    let today = new Date();
    let dateStr = (today.getMonth() + 1).toString().padStart(2, '0') + "-" + today.getDate().toString().padStart(2, '0');
    let alertDiv = document.getElementById("birthdayAlert");
    if (!alertDiv) return;

    let birthdaysToday = students.filter(s => s.dob && s.dob.includes(dateStr));
    
    if (birthdaysToday.length > 0) {
        // එක් එක් ළමයා වෙන වෙනම ලිස්ට් එකක් විදිහට හදනවා
        let itemsHtml = birthdaysToday.map(s => {
            let sIdx = students.indexOf(s);
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px 12px; margin-top:8px; border-radius:8px; border:1px solid #ffe0b2; color:black;">
                    <div>
                        <b style="font-size:14px;">🎂 ${s.name}</b> <br>
                        <small style="color:gray;">📞 ${s.phone || 'No phone'}</small>
                    </div>
                    <button onclick="sendSingleBirthdayWish(${sIdx})" style="background:#25D366; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">
                        📲 Wish ${s.name.split(' ')[0]}
                    </button>
                </div>
            `;
        }).join("");

        alertDiv.innerHTML = `
            <div style="background:#fff3e0; padding:15px; border-radius:12px; border:1px dashed #ff9800;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h4 style="margin:0; color:#e67e22; font-size:15px;">🎉 Today's Birthdays (${birthdaysToday.length}) 🎂</h4>
                    <button onclick="sendBulkBirthdaysModal()" style="background:#8e44ad; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">
                        🚀 Send All (Modal)
                    </button>
                </div>
                ${itemsHtml}
            </div>
        `;
        alertDiv.style.display = "block";
    } else {
        alertDiv.style.display = "none";
    }
}

// 📲 එක ළමයෙක්ට විතරක් වෙන වෙනම Wish කරන්න
function sendSingleBirthdayWish(idx) {
    let s = students[idx];
    let msg = `🌟 *HAPPY BIRTHDAY!* 🌟\n\n` +
              `ආදරණීය *${s.name}*,\n` +
              `ඔබට ලැබුවාවූ උපන්දිනය වාසනාවන්ත, සතුට පිරුණු සුබ උපන්දිනයක් වේවා කියා ප්‍රාර්ථනා කරමි! 🎂✨\n\n` +
              `ඉදිරි අධ්‍යාපන කටයුතු සහ සියලු හීන සැබෑ වේවා!\n\n` +
              `මීට,\n*Thilina Sir*`;

    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// 🚀 Modal Queue එක හරහා ඔක්කොටම එකින් එක යවන්න
function sendBulkBirthdaysModal() {
    let today = new Date();
    let dateStr = (today.getMonth() + 1).toString().padStart(2, '0') + "-" + today.getDate().toString().padStart(2, '0');
    let birthdaysToday = students.filter(s => s.dob && s.dob.includes(dateStr));

    let queue = birthdaysToday.map(s => {
        let msg = `🌟 *HAPPY BIRTHDAY!* 🌟\n\n` +
                  `ආදරණීය *${s.name}*,\n` +
                  `ඔබට ලැබුවාවූ උපන්දිනය වාසනාවන්ත, සතුට පිරුණු සුබ උපන්දිනයක් වේවා කියා ප්‍රාර්ථනා කරමි! 🎂✨\n\n` +
                  `ඉදිරි අධ්‍යාපන කටයුතු සහ සියලු හීන සැබෑ වේවා!\n\n` +
                  `මීට,\n*Thilina Sir*`;
        return { student: s, message: msg };
    });

    startBulkQueue(queue, "🎉 Birthday Wishes Queue");
}

function send4WeekRemind(idx, month) {
    let s = students[idx];
    let msg = `*දෙමාපියන්ගේ විශේෂ අවධානය පිණිසයි,* \n\n` +
              `ඔබගේ දරුවා (*${s.name}*) *${month}* මාසයේ සති 4ක්ම පන්තියට සහභාගී වී ඇත.\n\n` +
              `නමුත් පද්ධතියට අනුව එම මාසය සඳහා වන ගාස්තු තවමත් ගෙවා ඇති බව සටහන් වී නොමැත. කරුණාකර අද දින මේ පිළිබඳව සොයා බලා කටයුතු කරන ලෙස කාරුණිකව දන්වා සිටිමු. \n\n` +
              `ස්තූතියි! \n*Excellence Maths Class*`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ========================================================
// 🚀 100% WORKING BULK MESSAGING SYSTEM (QUEUE WITH MODAL)
// ========================================================

function startBulkQueue(list, title) {
    if (list.length === 0) {
        alert("ලිස්ට් එකේ යවන්න ළමයි කවුරුත් නැත!");
        return;
    }
    bulkQueue = list;
    bulkCurrentIndex = 0;
    
    document.getElementById("bulkModalTitle").innerText = title;
    document.getElementById("bulkModal").style.display = "flex";
    updateBulkModalUI();
}

function updateBulkModalUI() {
    let total = bulkQueue.length;
    let current = bulkCurrentIndex;
    
    if (current >= total) {
        document.getElementById("bulkModalStatus").innerHTML = "<b>✅ සියලුම මැසේජ් යවා අවසන්!</b>";
        document.getElementById("bulkProgressBar").style.width = "100%";
        document.getElementById("bulkSendBtn").style.display = "none";
        return;
    }

    let item = bulkQueue[current];
    let percentage = Math.round((current / total) * 100);
    
    document.getElementById("bulkModalStatus").innerHTML = `<b>(${current + 1}/${total})</b> Sending to: <b>${item.student.name}</b>`;
    document.getElementById("bulkProgressBar").style.width = percentage + "%";
    document.getElementById("bulkSendBtn").style.display = "block";
    document.getElementById("bulkSendBtn").innerText = `🚀 Send to ${item.student.name}`;
}

function sendNextBulkMessage() {
    if (bulkCurrentIndex < bulkQueue.length) {
        let item = bulkQueue[bulkCurrentIndex];
        window.open(`https://wa.me/${item.student.phone}?text=${encodeURIComponent(item.message)}`, '_blank');
        
        bulkCurrentIndex++;
        updateBulkModalUI();
    }
}

function closeBulkModal() {
    document.getElementById("bulkModal").style.display = "none";
    bulkQueue = [];
    bulkCurrentIndex = 0;
}

// Bulk Action Buttons (Updated)
function sendBulkProgress() {
    let month = document.getElementById("monthSelect").value;
    let search = document.getElementById("searchBar").value.toLowerCase();
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let currentMonthIdx = monthsOrder.indexOf(month);

    let filtered = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let studentGroup = s.group || s.class || s.classGroup || "";
        let matchesGroup = (selectedGroup === "All") || (studentGroup === selectedGroup);
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return matchesSearch && matchesGrade && matchesGroup && isAvailableInMonth;
    });

    let queue = filtered.map(s => {
        let score = s.marks?.[month] || 0;
        let sameGradeStudents = students.filter(st => st.grade === s.grade);
        let rankedInGrade = [...sameGradeStudents].sort((a, b) => (b.marks?.[month] || 0) - (a.marks?.[month] || 0));
        let rank = rankedInGrade.findIndex(rs => rs.name === s.name) + 1;
        let first = rankedInGrade[0]?.marks?.[month] || 0;
        let second = rankedInGrade[1]?.marks?.[month] || 0;
        let third = rankedInGrade[2]?.marks?.[month] || 0;

        let msg = `Student: *${s.name}*\n` +
                  `Grade: *${s.grade || 'N/A'}*\n` +
                  `--------------------------\n` +
                  `🏆 Your Child's Score: *${score}*\n` +
                  `📊 Class Rank: *${rank}*\n\n` +
                  `📈 Class Performance (${s.grade}):\n` +
                  `- 🥇 1st Place: ${first}\n` +
                  `- 🥈 2nd Place: ${second}\n` +
                  `- 🥉 3rd Place: ${third}\n` +
                  `--------------------------\n\n` +
                  `Thank you!`;

        return { student: s, message: msg };
    });

    startBulkQueue(queue, "📊 Bulk Progress Reports");
}

function sendBulk3WeekReminders() {
    let month = document.getElementById("monthSelect").value;
    let search = document.getElementById("searchBar").value.toLowerCase();
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let currentMonthIdx = monthsOrder.indexOf(month);

    let filtered = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let studentGroup = s.group || s.class || s.classGroup || "";
        let matchesGroup = (selectedGroup === "All") || (studentGroup === selectedGroup);
        
        let attendanceCount = (s.attendance?.[month] || []).filter(a => a === "P").length;
        let isUnpaid = (s.fees?.[month] !== "Paid");
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return matchesSearch && matchesGrade && matchesGroup && attendanceCount >= 3 && isUnpaid && isAvailableInMonth;
    });

    let queue = filtered.map(s => {
        let msg = `දෙමාපියන්ගේ අවධානය පිණිසයි,\n\n` +
                  `ඔබගේ දරුවා (*${s.name}*) *${month}* මාසයේ සති 3ක් හෝ ඊට වැඩි ප්‍රමාණයක් පන්තියට පැමිණ ඇතත්, අදාළ මාසය සඳහා ගාස්තු ගෙවා ඇති බව පද්ධතියේ සටහන්ව නොමැත.\n\n` +
                  `කරුණාකර ඒ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;
        return { student: s, message: msg };
    });

    startBulkQueue(queue, "⚠️ 3-Week Reminders");
}

function sendBulk4WeekReminders() {
    let month = document.getElementById("monthSelect").value;
    let currentMonthIdx = monthsOrder.indexOf(month);
    
    let filtered = students.filter(s => {
        let attendanceCount = (s.attendance?.[month] || []).filter(a => a === "P").length;
        let isUnpaid = (s.fees?.[month] !== "Paid");
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return attendanceCount >= 4 && isUnpaid && isAvailableInMonth;
    });

    let queue = filtered.map(s => {
        let msg = `*විශේෂ මතක් කිරීමයි - Excellence Maths Class*\n\n` +
                  `දරුවා: *${s.name}*\n` +
                  `ඔබගේ දරුවා ${month} මාසයේ සති 4ක්ම පන්තියට පැමිණ ඇතත්, ගාස්තු ගෙවා ඇති බව සටහන්ව නැත. කරුණාකර මේ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;
        return { student: s, message: msg };
    });

    startBulkQueue(queue, "🚨 4-Week Alerts");
}

function exportToExcel() {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFFName,Phone,Grade,Group,Monthly Fee\n";
    students.forEach(s => {
        csvContent += `"${s.name}","${s.phone}","${s.grade}","${s.group}","${s.fee}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Student_List_Backup.csv");
    document.body.appendChild(link);
    link.click();
}

function showSection(sectionId) {
    document.querySelectorAll('.nav-section').forEach(section => {
        section.style.display = 'none';
    });
    let activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.style.display = 'block';
    }
    const navButtons = document.querySelectorAll('.navbar button');
    navButtons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(sectionId)) {
            btn.style.background = '#2980b9';
        } else {
            btn.style.background = '#34495e';
        }
    });
}

// ✉️ Send Any Custom Message to Filtered Students Queue
function sendCustomBulkMessage() {
    let msgText = document.getElementById("customBulkMsg").value.trim();
    
    if (msgText === "") {
        alert("කරුණාකර යැවීමට අවශ්‍ය මැසේජ් එක ඇතුළත් කරන්න!");
        return;
    }

    let month = document.getElementById("monthSelect").value;
    let search = document.getElementById("searchBar").value.toLowerCase();
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let currentMonthIdx = monthsOrder.indexOf(month);

    // Filter වෙලා තියෙන ළමයි ලිස්ට් එක ගන්නවා
    let filtered = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let studentGroup = s.group || s.class || s.classGroup || "";
        let matchesGroup = (selectedGroup === "All") || (studentGroup === selectedGroup);
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return matchesSearch && matchesGrade && matchesGroup && isAvailableInMonth;
    });

    // Queue එක හදනවා
    let queue = filtered.map(s => {
        // ළමයාගේ නම එක්ක මැසේජ් එක ලස්සනට Format කරගන්නවා
        let formattedMsg = `ආදරණීය දෙමාපියන්ගේ / දරුවාගේ (*${s.name}*) අවධානය පිණිසයි,\n\n` +
                           `${msgText}\n\n` +
                           `ස්තූතියි!\n*Thilina Sir*`;

        return { student: s, message: formattedMsg };
    });

    // අර අපි හදපු Modal Queue එකෙන්ම යවනවා
    startBulkQueue(queue, "📢 Custom Notice Broadcast");
}

async function toggleExcused(idx, month) {
    if (!students[idx].fees) students[idx].fees = {};
    
    // Toggle Logic: Excused නම් Unpaid කරයි, නැත්නම් Excused කරයි
    if (students[idx].fees[month] === "Excused") {
        students[idx].fees[month] = "Unpaid";
    } else {
        students[idx].fees[month] = "Excused";
    }
    
    await saveData();
    renderStudents();
}

// 📤 1. Data Backup එක JSON File එකක් විදිහට Download කිරීම
function exportJSONBackup() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Class_Manager_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// 📥 2. JSON File එකෙන් System එකට Data Restore කිරීම
function importJSONBackup(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = async function(e) {
        try {
            let importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if (confirm("ඔබට තහවුරුද? දැනට ඇති Data සියල්ල වෙනුවට මෙම Backup එක Load වේ!")) {
                    students = importedData;
                    await saveData(); // Update the Google Apps Script database
                    renderStudents(); // Refresh the student list on screen
                    checkBirthdays(); // Re-check for any birthdays in the new data
                    alert("Data successfully restored! (දත්ත සාර්ථකව Restore කරන ලදී!)");
                    
                    // Clear the file input so the same file can be uploaded again if needed
                    event.target.value = ""; 
                }
            } else {
                alert("Invalid data format. Please upload a valid Backup JSON.");
            }
        } catch (error) {
            alert("Error reading file! (ෆයිල් එක කියවීමේදී දෝෂයක්!)");
            console.error("Import Error:", error);
        }
    };
    reader.readAsText(file);
}
