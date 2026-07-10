const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIpplQGzEDNYZRjfA5A0cb-khoYf4yYLfQUkhD4qtQ3EUKFVxtnTv4cH5M7TPTdHM6/exec";
let students = [];

// මාස වල අනුපිළිවෙල
const monthsOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

async function loadData() {
    const res = await fetch(SCRIPT_URL);
    students = await res.json();
    renderStudents();
    checkBirthdays();
}

async function saveData() {
    await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(students) });
}

// පේජ් එක ලෝඩ් වෙද්දීම කෙලින්ම ඩේටා ලෝඩ් කරලා ඩෑෂ්බෝඩ් එක මතු කරනවා
window.onload = function() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        let toggleBtn = document.querySelector(".dark-mode-toggle");
        if(toggleBtn) toggleBtn.innerText = "☀️";
    }
    
    loadData(); 
    showSection('summarySection'); 
};

function renderStudents() {
    let list = document.getElementById("studentList");
    let search = document.getElementById("searchBar").value.toLowerCase();
    let month = document.getElementById("monthSelect").value;
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    list.innerHTML = "";

    let currentMonthIdx = monthsOrder.indexOf(month);

    // 1. Filter කිරීම
    let filteredList = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let matchesGroup = (selectedGroup === "All") || (s.group === selectedGroup);
        
        // 🚀 joinedMonth එකක් නැති පරණ ළමයි හැම මාසෙකම පෙන්වනවා. 
        // joinedMonth එකක් තියෙන අලුත් ළමයි විතරක් අදාළ මාසයේ ඉඳන් ඉදිරියට පෙන්වනවා.
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) {
                isAvailableInMonth = false;
            }
        }
        
        return matchesSearch && matchesGrade && matchesGroup && isAvailableInMonth;
    });
    
    // 2. දැන් ලිස්ට් එක පෙන්වනවා
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

// Pending List එකත් පරණ ළමයි පේන විදිහට හැදුවා
function updatePendingList() {
    let month = document.getElementById("monthSelect").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let display = document.getElementById("pendingDisplay");
    display.innerHTML = "";

    let currentMonthIdx = monthsOrder.indexOf(month);

    let groupsToShow = (selectedGroup === "All") 
        ? [...new Set(students.map(s => s.group))] 
        : [selectedGroup];

    groupsToShow.forEach(groupName => {
        let unpaid = students.filter(s => {
            let matchesGroup = s.group === groupName;
            let isUnpaid = (!s.fees || s.fees[month] !== "Paid");
            
            let isAvailableInMonth = true;
            if (s.joinedMonth) {
                let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
                if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
            }
            
            return matchesGroup && isUnpaid && isAvailableInMonth;
        });

        if (unpaid.length > 0) {
            let namesList = unpaid.map((s, i) => `${i+1}. ${s.name}`).join("\n");
            
            let waMsg = `*⚠️ PENDING PAYMENTS - ${groupName}*\n` +
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
                    <small><b>📌 ${groupName}</b></small>
                    <span style="font-size:10px; color:#e74c3c; font-weight:bold;">${unpaid.length} Pending</span>
                </div>
                <pre style="font-size:11px; background:#f9f9f9; padding:8px; border-radius:4px; margin:8px 0; border:1px solid #eee; color: black;">${namesList}</pre>
                <button onclick="copyToClipboard('${encodeURIComponent(waMsg)}')" style="background:#25D366; font-size:11px; padding:6px; width:100%; border-radius:5px; color:white; border:none; cursor:pointer;">📋 Copy ${groupName} List</button>           `;
            display.appendChild(div);
        }
    });

    if (display.innerHTML === "") {
        display.innerHTML = "<p style='font-size:12px; color:gray; text-align:center; padding:10px;'>මෙම පන්තියේ සියලුම දෙනා ගෙවීම් කර ඇත. ✅</p>";
    }
}

async function togglePaid(idx, month) {
    let s = students[idx];
    if (!s.fees) s.fees = {};
    
    if (s.fees[month] === "Paid") {
        s.fees[month] = "Unpaid";
    } else {
        s.fees[month] = "Paid";
        
        let date = new Date().toLocaleDateString('en-GB'); 
        let receiptNo = "RCPT-" + Date.now().toString().slice(-6); 
        
        let msg = `━━━━━━━━━━━━━━━━━━━━
🌟 *EXCELLENCE MATHS CLASS* 🌟
━━━━━━━━━━━━━━━━━━━━
*DATE:* ${date}
*RECEIPT NO:* #${receiptNo}
━━━━━━━━━━━━━━━━━━━━
*NAME:* ${s.name}
*GRADE:* ${s.grade || 'N/A'}
*MONTH:* ${month}
*FEE:* Rs. ${s.fee}.00
━━━━━━━━━━━━━━━━━━━━
*STATUS:* ✅ *SUCCESSFULLY PAID*
━━━━━━━━━━━━━━━━━━━━
ස්තුතියි! පන්තියේදී හමුවෙමු.`;

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
        students[editIdx].name = name;
        students[editIdx].dob = dob;
        students[editIdx].phone = phone;
        students[editIdx].grade = grade;
        students[editIdx].group = group;
        students[editIdx].fee = fee;
        
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
        totalExpected += fee;
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

// Bulk Progress Reports
async function sendBulkProgress() {
    let month = document.getElementById("monthSelect").value;
    let search = document.getElementById("searchBar").value.toLowerCase();
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let currentMonthIdx = monthsOrder.indexOf(month);

    let listToSend = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let matchesGroup = (selectedGroup === "All") || (s.group === selectedGroup);
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return matchesSearch && matchesGrade && matchesGroup && isAvailableInMonth;
    });

    if (listToSend.length === 0) return alert("යවන්න ළමයි කවුරුත් නැහැ!");
    if (!confirm(`${listToSend.length} දෙනෙකුට මැසේජ් යවන්නද?`)) return;

    let statusDiv = document.getElementById("bulkStatus");

    for (let i = 0; i < listToSend.length; i++) {
        let s = listToSend[i];
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

        statusDiv.innerText = `Sending to ${s.name} (${i + 1}/${listToSend.length})...`;
        window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
        await new Promise(resolve => setTimeout(resolve, 10000)); 
    }
    statusDiv.innerText = "✅ සියලුම මැසේජ් යවා අවසන්!";
}

// Bulk 3-Week Reminders
async function sendBulk3WeekReminders() {
    let month = document.getElementById("monthSelect").value;
    let search = document.getElementById("searchBar").value.toLowerCase();
    let selectedGrade = document.getElementById("gradeFilter").value;
    let selectedGroup = document.getElementById("groupFilter").value;
    let currentMonthIdx = monthsOrder.indexOf(month);

    let listToFilter = students.filter(s => {
        let matchesSearch = (s.name || "").toLowerCase().includes(search);
        let matchesGrade = (selectedGrade === "All") || (s.grade === selectedGrade);
        let matchesGroup = (selectedGroup === "All") || (s.group === selectedGroup);
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return matchesSearch && matchesGrade && matchesGroup && isAvailableInMonth;
    });

    let listToSend = listToFilter.filter(s => {
        let attendanceCount = (s.attendance?.[month] || []).filter(a => a === "P").length;
        let isUnpaid = (s.fees?.[month] !== "Paid");
        return attendanceCount >= 3 && isUnpaid;
    });

    if (listToSend.length === 0) return alert("සති 3ක් සම්පූර්ණ කළ, ගෙවීම් පැහැර හැර ඇති සිසුන් මෙම ලිස්ට් එකේ නැත!");
    if (!confirm(`${listToSend.length} දෙනෙකුට Reminder මැසේජ් යවන්නද?`)) return;

    let statusDiv = document.getElementById("bulkStatus");

    for (let i = 0; i < listToSend.length; i++) {
        let s = listToSend[i];
        
        let msg = `දෙමාපියන්ගේ අවධානය පිණිසයි,\n\n` +
                  `ඔබගේ දරුවා (*${s.name}*) *${month}* මාසයේ සති 3ක් හෝ ඊට වැඩි ප්‍රමාණයක් පන්තියට පැමිණ ඇතත්, අදාළ මාසය සඳහා ගාස්තු ගෙවා ඇති බව පද්ධතියේ සටහන්ව නොමැත.\n\n` +
                  `කරුණාකර ඒ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;

        statusDiv.innerText = `Sending Reminder to ${s.name} (${i + 1}/${listToSend.length})...`;
        window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    statusDiv.innerText = "✅ සියලුම Reminders යවා අවසන්!";
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

function checkBirthdays() {
    let today = new Date();
    let dateStr = (today.getMonth() + 1).toString().padStart(2, '0') + "-" + today.getDate().toString().padStart(2, '0');
    let alertDiv = document.getElementById("birthdayAlert");
    if (!alertDiv) return;

    let birthdaysToday = students.filter(s => s.dob && s.dob.includes(dateStr));
    
    if(birthdaysToday.length > 0) {
        let names = birthdaysToday.map(s => s.name).join(", ");
        alertDiv.innerHTML = `
            <div style="background:#fff3e0; padding:15px; border-radius:10px; border:1px dashed #ff9800; display:flex; justify-content:space-between; align-items:center;">
                <span>🎉 Today's Birthdays: <b>${names}</b> 🎂</span>
                <button onclick="sendBulkBirthdays()" style="background:#25D366; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">📲 Send WhatsApp Wishes</button>
            </div>
        `;
        alertDiv.style.display = "block";
    } else {
        alertDiv.style.display = "none";
    }
}

async function sendBulkBirthdays() {
    let today = new Date();
    let dateStr = (today.getMonth() + 1).toString().padStart(2, '0') + "-" + today.getDate().toString().padStart(2, '0');
    let birthdaysToday = students.filter(s => s.dob && s.dob.includes(dateStr));

    if (!confirm(`${birthdaysToday.length} දෙනෙකුට සුබපැතුම් යවන්නද?`)) return;

    for (let i = 0; i < birthdaysToday.length; i++) {
        let s = birthdaysToday[i];
        let msg = `\u{1F31F} *HAPPY BIRTHDAY!* \u{1F31F}\n\n` +
                  `ආදරණීය *${s.name}*,\n` +
                  `ඔබට ලැබුවාවූ උපන්දිනය වාසනාවන්ත, සතුට පිරුණු සුබ උපන්දිනයක් වේවා කියා ප්‍රාර්ථනා කරමි! \u{1F382}\u{2728}\n\n` +
                  `ඉදිරි අධ්‍යාපන කටයුතු සහ සියලු හීන සැබෑ වේවා!\n\n` +
                  `මීට,\n*Thilina Sir*`;

        window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
        if (birthdaysToday.length > 1) {
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    alert("සියලුම සුබපැතුම් යවා අවසන්!");
}

function send4WeekRemind(idx, month) {
    let s = students[idx];
    let msg = `*දෙමාපියන්ගේ විශේෂ අවධානය පිණිසයි,* \n\n` +
              `ඔබගේ දරුවා (*${s.name}*) *${month}* මාසයේ සති 4ක්ම පන්තියට සහභාගී වී ඇත.\n\n` +
              `නමුත් පද්ධතියට අනුව එම මාසය සඳහා වන ගාස්තු තවමත් ගෙවා ඇති බව සටහන් වී නොමැත. කරුණාකර අද දින මේ පිළිබඳව සොයා බලා කටයුතු කරන ලෙස කාරුණිකව දන්වා සිටිමු. \n\n` +
              `ස්තූතියි! \n*Excellence Maths Class*`;
    window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Bulk 4-Week Alerts
async function sendBulk4WeekReminders() {
    let month = document.getElementById("monthSelect").value;
    let currentMonthIdx = monthsOrder.indexOf(month);
    
    let listToSend = students.filter(s => {
        let attendanceCount = (s.attendance?.[month] || []).filter(a => a === "P").length;
        let isUnpaid = (s.fees?.[month] !== "Paid");
        
        let isAvailableInMonth = true;
        if (s.joinedMonth) {
            let joinedIdx = monthsOrder.indexOf(s.joinedMonth);
            if (currentMonthIdx < joinedIdx) isAvailableInMonth = false;
        }
        return attendanceCount >= 4 && isUnpaid && isAvailableInMonth;
    });

    if (listToSend.length === 0) return alert("සති 4ම සම්පූර්ණ කළ, ගෙවීම් පැහැර හැර ඇති සිසුන් මෙම ලිස්ට් එකේ නැත!");
    if (!confirm(`${listToSend.length} දෙනෙකුට 4-Week Alert එක යවන්නද?`)) return;

    let statusDiv = document.getElementById("bulkStatus");

    for (let i = 0; i < listToSend.length; i++) {
        let s = listToSend[i];
        let msg = `*විශේෂ මතක් කිරීමයි - Excellence Maths Class*\n\n` +
                  `දරුවා: *${s.name}*\n` +
                  `ඔබගේ දරුවා ${month} මාසයේ සති 4ක්ම පන්තියට පැමිණ ඇතත්, ගාස්තු ගෙවා ඇති බව සටහන්ව නැත. කරුණාකර මේ පිළිබඳව සොයා බලන්න. ස්තූතියි!`;

        statusDiv.innerText = `Sending to ${s.name} (${i + 1}/${listToSend.length})...`;
        window.open(`https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    statusDiv.innerText = "✅ සියලුම 4-Week Alerts යවා අවසන්!";
}

// Navigation Actions
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
