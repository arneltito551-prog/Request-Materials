// ================== CONFIG ==================
const cloudName = "dtmm8frik";
const uploadPreset = "Crrd2025";
const GM_APPROVAL_CODE = "CRRD";

// ================== Firebase imports ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase config (user provided)
const firebaseConfig = {
  apiKey: "AIzaSyCMhwCdyBmC3037SScytAYGmiXXnFiwFbI",
  authDomain: "request-materials-4b168.firebaseapp.com",
  projectId: "request-materials-4b168",
  storageBucket: "request-materials-4b168.firebasestorage.app",
  messagingSenderId: "1088278709255",
  appId: "1:1088278709255:web:138e1337bea754b21c16a2",
  measurementId: "G-F4FR8YJD99"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== UI elements ==================
const loginCard = document.getElementById("loginCard");
const registerCard = document.getElementById("registerCard");
const forgotCard = document.getElementById("forgotCard");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const toRegister = document.getElementById("toRegister");
const toLoginFromReg = document.getElementById("toLoginFromReg");
const toForgot = document.getElementById("toForgot");
const backToLogin = document.getElementById("backToLogin");

const regName = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const regRole = document.getElementById("regRole");
const regApproval = document.getElementById("regApproval");
const registerBtn = document.getElementById("registerBtn");

const forgotEmail = document.getElementById("forgotEmail");
const forgotBtn = document.getElementById("forgotBtn");

const dashboard = document.getElementById("dashboard");
const authWrap = document.getElementById("authWrap");
const logoutBtn = document.getElementById("logoutBtn");
const userNameDisplay = document.getElementById("userNameDisplay");
const homeBtn = document.getElementById("homeBtn");

const reqForm = document.getElementById("reqForm");
const reqDate = document.getElementById("reqDate");
const reqParticular = document.getElementById("reqParticular");
const reqUnit = document.getElementById("reqUnit");
const reqQty = document.getElementById("reqQty");
const upload_widget_btn = document.getElementById("upload_widget");
const uploadedURL = document.getElementById("uploadedURL");
const uploadName = document.getElementById("uploadName");

const btnViewRequest = document.getElementById("btnViewRequest");
const btnViewRemaining = document.getElementById("btnViewRemaining");
const btnViewStatus = document.getElementById("btnViewStatus");
const btnViewApprovals = document.getElementById("btnViewApprovals");
const btnViewUsage = document.getElementById("btnViewUsage");

const totalReq = document.getElementById("totalReq");
const totalPending = document.getElementById("totalPending");
const totalApproved = document.getElementById("totalApproved");
const recentList = document.getElementById("recentList");

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");

// ================== Toast ==================
function showToast(message, type = "success") {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = "toast " + (type === "error" ? "error" : type === "info" ? "info" : "success");
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ================== Navigation UI ==================
toRegister.onclick = () => { loginCard.classList.add("hidden"); registerCard.classList.remove("hidden"); };
toLoginFromReg.onclick = () => { registerCard.classList.add("hidden"); loginCard.classList.remove("hidden"); };
toForgot.onclick = (e) => { e.preventDefault(); loginCard.classList.add("hidden"); forgotCard.classList.remove("hidden"); };
backToLogin.onclick = () => { forgotCard.classList.add("hidden"); loginCard.classList.remove("hidden"); };
regRole.addEventListener("change", (e) => regApproval.classList.toggle("hidden", e.target.value !== "GM"));

// ================== Register (Auth + Firestore user doc) ==================
registerBtn.onclick = async () => {
  const name = regName.value.trim(), email = regEmail.value.trim(), pass = regPassword.value.trim(), role = regRole.value, code = regApproval.value.trim();
  if (!name || !email || !pass || !role) { showToast("Please fill out all required fields.", "error"); return; }
  if (role === "GM" && code !== GM_APPROVAL_CODE) { showToast("Approval code invalid. Please contact admin.", "error"); return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role,
      dateCreated: serverTimestamp()
    });
    showToast("Registration Successful!", "success");
    registerCard.classList.add("hidden"); loginCard.classList.remove("hidden");
    regName.value = regEmail.value = regPassword.value = regApproval.value = ""; regRole.value = "";
  } catch (err) {
    console.error(err);
    showToast(err.message || "Registration failed.", "error");
  }
};

// ================== Forgot password ==================
forgotBtn.onclick = async () => {
  const email = forgotEmail.value.trim();
  if (!email) { showToast("Please enter email.", "error"); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("Password reset link sent to your email.", "info");
    forgotEmail.value = ""; forgotCard.classList.add("hidden"); loginCard.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error sending reset link.", "error");
  }
};

// ================== Login ==================
loginBtn.onclick = async () => {
  const email = loginEmail.value.trim(), pass = loginPassword.value.trim();
  if (!email || !pass) { showToast("Invalid credentials. Please try again.", "error"); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    console.error(err);
    showToast("Invalid credentials. Please try again.", "error");
  }
};

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // fetch user role from Firestore
    try {
      const uDoc = await getDoc(doc(db, "users", user.uid));
      const role = uDoc.exists() ? uDoc.data().role : "Maintenance";
      user.role = role;
    } catch (e) {
      user.role = "Maintenance";
    }
    // set global current user reference
    window.currentUser = user;
    authWrap.classList.add("hidden"); dashboard.classList.remove("hidden");
    userNameDisplay.textContent = user.displayName || user.email;
    logoutBtn.classList.remove("hidden");
    document.querySelectorAll(".gm-only").forEach(el => el.classList.toggle("hidden", user.role !== "GM"));
    refreshSummary();
  } else {
    window.currentUser = null;
    authWrap.classList.remove("hidden"); dashboard.classList.add("hidden");
    logoutBtn.classList.add("hidden"); userNameDisplay.textContent = "";
  }
});

// logout
logoutBtn.onclick = async () => {
  try { await signOut(auth); showToast("Logged out.", "info"); } catch (err) { console.error(err); showToast("Error logging out.", "error"); }
};
homeBtn.onclick = () => { closeModal(); window.scrollTo({ top:0, behavior:"smooth" }); };

// ================== Cloudinary Upload Widget ==================
const widget = cloudinary.createUploadWidget({
  cloudName,
  uploadPreset,
  folder: "activity_reports",
  multiple: false,
  maxFileSize: 5 * 1024 * 1024,
  sources: ["local", "camera", "url"]
}, (err, result) => {
  if (!err && result && result.event === "success") {
    uploadedURL.value = result.info.secure_url;
    uploadName.textContent = (result.info.original_filename || "file") + "." + (result.info.format || "");
    showToast("File uploaded successfully!", "success");
  } else if (err) {
    console.error(err);
    showToast("Upload error.", "error");
  }
});
upload_widget_btn.addEventListener("click", () => widget.open(), false);

// ================== Submit Request (Firestore) ==================
reqDate.value = new Date().toLocaleString();
reqForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = window.currentUser;
  if (!user) { showToast("Please login first.", "error"); return; }
  const particular = reqParticular.value.trim(), unit = reqUnit.value.trim(), qty = parseInt(reqQty.value), file = uploadedURL.value || "";
  if (!particular || !unit || !qty || qty <= 0) { showToast("Error submitting request. Please check your input.", "error"); return; }

  try {
    await addDoc(collection(db, "requests"), {
      userId: user.uid,
      userName: user.displayName || user.email,
      date: new Date().toLocaleString(),
      particular,
      unit,
      qty,
      fileURL: file,
      status: "Pending",
      remarks: "",
      usedQty: 0,
      createdAt: serverTimestamp()
    });
    showToast("Request submitted successfully!", "success");
    reqParticular.value = reqUnit.value = reqQty.value = ""; uploadedURL.value = ""; uploadName.textContent = "No file";
    refreshSummary();
  } catch (err) {
    console.error(err);
    showToast("Error submitting request.", "error");
  }
});

// ================== Helpers: refreshSummary & recent ==================
async function refreshSummary() {
  try {
    const snap = await getDocs(collection(db, "requests"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    totalReq.textContent = all.length;
    totalPending.textContent = all.filter(r => r.status === "Pending").length;
    totalApproved.textContent = all.filter(r => r.status === "Approved").length;

    if (!all.length) { recentList.innerHTML = "<p class='muted small'>No requests yet.</p>"; return; }
    recentList.innerHTML = "";
    all.slice(0, 5).forEach(r => {
      const el = document.createElement("div"); el.className = "request-item";
      el.innerHTML = `<div>
        <div style="font-weight:700;color:var(--gold)">${escapeHtml(r.particular)} <span class="small muted">(${escapeHtml(r.unit)})</span></div>
        <div class="small muted">${escapeHtml(r.userName)} • ${escapeHtml(r.date)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800">${r.qty}</div>
        <div class="small muted">${r.status}</div>
      </div>`;
      recentList.appendChild(el);
    });
  } catch (err) {
    console.error(err);
  }
}

// ================== Modal Helpers ==================
function openModal(html) { modalContent.innerHTML = html; modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false"); }
function closeModal() { modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }
modalClose.onclick = closeModal; modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

// ================== View Requests ==================
btnViewRequest.onclick = async () => {
  try {
    const snap = await getDocs(collection(db, "requests"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    let html = `<h3>All Submitted Requests</h3>`;
    if (!rows.length) html += `<p class="muted">No requests yet.</p>`;
    else {
      rows.forEach(r => {
        html += `<div style="padding:12px;border-radius:10px;background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));margin-bottom:10px">
          <div style="display:flex;gap:12px;align-items:center">
            <div style="flex:1">
              <div style="font-weight:800">${escapeHtml(r.particular)}</div>
              <pre style="white-space:pre-wrap;margin:6px 0;background:rgba(255,255,255,0.02);padding:8px;border-radius:8px;color:var(--muted)">${escapeHtml('Submitted by: '+r.userName+' | '+r.date+'\nUnit: '+r.unit+'  Qty: '+r.qty+'\nRemarks: '+(r.remarks||''))}</pre>
              ${r.fileURL ? `<div class="small muted">Attachment: <a href="${r.fileURL}" target="_blank">view</a></div>` : ''}
            </div>
            ${r.fileURL ? `<img src="${r.fileURL}" class="thumb" alt="attachment">` : `<div style="width:120px;text-align:center"><div style="font-weight:900">${r.qty}</div><div class="small muted">${r.status}</div></div>`}
          </div>
        </div>`;
      });
    }
    html += `<div class="mt"><button class="btn" id="closeReqBtn">Home</button></div>`;
    openModal(html); document.getElementById("closeReqBtn").onclick = closeModal;
  } catch (err) {
    console.error(err);
    showToast("Error fetching requests.", "error");
  }
};

// ================== View Remaining Items ==================
btnViewRemaining.onclick = async () => {
  try {
    const snap = await getDocs(collection(db, "requests"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const map = {};
    all.filter(r => r.status === "Approved" || r.status === "Delivered").forEach(r => {
      const key = `${r.particular}||${r.unit}`;
      if (!map[key]) map[key] = { particular: r.particular, unit: r.unit, total: 0, used: 0 };
      map[key].total += r.qty;
      map[key].used += (r.usedQty || 0);
    });
    const rows = Object.values(map);
    let html = `<h3>Remaining Items</h3>`;
    if (!rows.length) html += `<p class="muted">No remaining items to display.</p>`;
    else {
      html += `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Particular</th><th style="text-align:left">Unit</th><th style="text-align:center">Remaining</th></tr></thead><tbody>`;
      rows.forEach(r => { html += `<tr><td>${escapeHtml(r.particular)}</td><td>${escapeHtml(r.unit)}</td><td style="text-align:center">${Math.max(0, r.total - r.used)}</td></tr>`; });
      html += `</tbody></table>`;
    }
    html += `<div class="mt"><button class="btn" id="closeRemBtn">Home</button></div>`;
    openModal(html); document.getElementById("closeRemBtn").onclick = closeModal;
  } catch (err) { console.error(err); showToast("Error computing remaining items.", "error"); }
};

// ================== View Status Delivery ==================
btnViewStatus.onclick = async () => {
  try {
    const snap = await getDocs(collection(db, "requests"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    let html = `<h3>All Requests (Status Delivery)</h3>`;
    if (!rows.length) html += `<p class="muted">No requests found.</p>`;
    else {
      rows.forEach(r => {
        // GM-only status edits; owner can edit remarks only
        const isOwner = window.currentUser && r.userId === window.currentUser.uid;
        const isGM = window.currentUser && window.currentUser.role === "GM";
        html += `<div style="padding:12px;border-radius:10px;background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));margin-bottom:10px">
          <div style="display:flex;justify-content:space-between">
            <div style="flex:1;margin-right:12px">
              <div style="font-weight:800">${escapeHtml(r.particular)} <span class="small muted">(${escapeHtml(r.unit)})</span></div>
              <div class="small muted">${escapeHtml(r.userName)} • ${escapeHtml(r.date)}</div>
              <div class="small muted">Attachment: ${r.fileURL ? `<a href="${r.fileURL}" target="_blank">view</a>` : 'none'}</div>
            </div>
            <div style="text-align:right;min-width:110px">
              <div style="font-weight:900">${r.qty}</div>
              <div class="small muted">Status: <span id="status_${r.id}">${escapeHtml(r.status)}</span></div>
            </div>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" id="remark_${r.id}" placeholder="Remarks" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.03)" value="${escapeHtml(r.remarks||'')}" ${!isOwner ? "readonly" : ""} />
            ${r.fileURL ? `<img src="${r.fileURL}" class="thumb" alt="attachment">` : ''}
            ${isGM ? `<div style="display:flex;gap:8px"><button class="btn" data-approve="${r.id}">Approve</button><button class="btn ghost" data-disapprove="${r.id}">Disapprove</button><button class="btn success" data-setdelivered="${r.id}">Set Delivered</button></div>` : ""}
          </div>
        </div>`;
      });
    }
    html += `<div class="mt"><button class="btn" id="closeStatusBtn">Home</button></div>`;
    openModal(html);

    // Attach GM action handlers
    document.querySelectorAll('[data-approve]').forEach(b => b.onclick = async (e) => {
      if (!window.currentUser || window.currentUser.role !== "GM") { showToast("Only GM can approve.", "error"); return; }
      await changeApproval(e.target.dataset.approve, true);
    });
    document.querySelectorAll('[data-disapprove]').forEach(b => b.onclick = async (e) => {
      if (!window.currentUser || window.currentUser.role !== "GM") { showToast("Only GM can disapprove.", "error"); return; }
      await changeApproval(e.target.dataset.disapprove, false);
    });
    document.querySelectorAll('[data-setdelivered]').forEach(b => b.onclick = async (e) => {
      if (!window.currentUser || window.currentUser.role !== "GM") { showToast("Only GM can set delivered.", "error"); return; }
      await updateRequestStatus(e.target.dataset.setdelivered, "Delivered");
      showToast("Marked as Delivered.", "success");
      closeModal();
    });

    // remarks: owner can edit (live update)
    modal.addEventListener("input", async (ev) => {
      if (ev.target && ev.target.id && ev.target.id.startsWith("remark_")) {
        const id = ev.target.id.replace("remark_","");
        try {
          // only owner allowed to change remarks in UI
          const rRef = doc(db, "requests", id);
          const rSnap = await getDoc(rRef);
          if (!rSnap.exists()) return;
          const r = rSnap.data();
          if (!window.currentUser || window.currentUser.uid !== r.userId) return;
          await updateDoc(rRef, { remarks: ev.target.value });
          showToast("Remarks updated.", "info");
          refreshSummary();
        } catch(e){ console.error(e); }
      }
    }, { passive: true });

    document.getElementById("closeStatusBtn").onclick = closeModal;
  } catch (err) { console.error(err); showToast("Error fetching status list.", "error"); }
};

async function updateRequestStatus(id, status) {
  try { await updateDoc(doc(db, "requests", id), { status }); refreshSummary(); } catch (err) { console.error(err); showToast("Error updating status.", "error"); }
}

async function changeApproval(id, approved) {
  try { await updateDoc(doc(db, "requests", id), { status: approved ? "Approved" : "Disapproved" }); closeModal(); showToast(approved ? "Request approved!" : "Request disapproved.", approved ? "success" : "error"); refreshSummary(); }
  catch (err) { console.error(err); showToast("Error updating approval.", "error"); }
}

// ================== View Approvals ==================
btnViewApprovals.onclick = async () => {
  if (!window.currentUser || window.currentUser.role !== "GM") { showToast("Only GM can view approvals.", "error"); return; }
  try {
    const snap = await getDocs(collection(db, "requests"));
    const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === "Pending");
    let html = `<h3>Pending Approvals</h3>`;
    if (!reqs.length) html += `<p class="muted">No pending requests available.</p>`;
    else {
      reqs.forEach(r => {
        html += `<div style="padding:12px;border-radius:10px;background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:800">${escapeHtml(r.particular)} <span class="small muted">(${escapeHtml(r.unit)})</span></div>
              <div class="small muted">${escapeHtml(r.userName)} • ${escapeHtml(r.date)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="font-weight:900;text-align:right">${r.qty}</div>
              <div style="display:flex;gap:8px">
                <button class="btn" data-approve="${r.id}">Approve</button>
                <button class="btn ghost" data-disapprove="${r.id}">Disapprove</button>
              </div>
            </div>
          </div>
        </div>`;
      });
    }
    html += `<div class="mt"><button class="btn" id="closeAppBtn">Home</button></div>`;
    openModal(html);
    document.querySelectorAll("[data-approve]").forEach(b => b.onclick = async (e) => { await changeApproval(e.target.dataset.approve, true); });
    document.querySelectorAll("[data-disapprove]").forEach(b => b.onclick = async (e) => { await changeApproval(e.target.dataset.disapprove, false); });
    document.getElementById("closeAppBtn").onclick = closeModal;
  } catch (err) { console.error(err); showToast("Error fetching approvals.", "error"); }
};

// ================== View Usage ==================
btnViewUsage.onclick = async () => {
  try {
    const snap = await getDocs(collection(db, "requests"));
    const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === "Approved" || r.status === "Delivered");
    let html = `<h3>View Usage</h3>`;
    if (!reqs.length) html += `<p class="muted">No usage data yet.</p>`;
    else {
      reqs.forEach(r => {
        const isOwner = window.currentUser && r.userId === window.currentUser.uid;
        html += `<div style="padding:12px;border-radius:10px;background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));margin-bottom:10px">
          <div style="display:flex;justify-content:space-between">
            <div style="flex:1">
              <div style="font-weight:800">${escapeHtml(r.particular)} <span class="small muted">(${escapeHtml(r.unit)})</span></div>
              <div class="small muted">${escapeHtml(r.userName)} • ${escapeHtml(r.date)}</div>
            </div>
            <div style="text-align:right;min-width:120px">
              <div style="font-weight:900">Total: ${r.qty}</div>
              <div class="small muted">Used: <span id="used_${r.id}">${r.usedQty || 0}</span></div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">
            <input id="useInput_${r.id}" type="number" placeholder="Enter used qty" style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);width:120px" ${!isOwner ? "readonly" : ""} />
            <button class="btn" data-save="${r.id}" ${!isOwner ? "disabled title='Only uploader can edit'" : ""}>Save</button>
          </div>
        </div>`;
      });
    }
    html += `<div class="mt"><button class="btn" id="closeUsageBtn">Home</button></div>`;
    openModal(html);
    document.querySelectorAll("[data-save]").forEach(b => b.onclick = async (e) => {
      const id = e.target.dataset.save;
      const valEl = document.getElementById(`useInput_${id}`);
      const val = parseInt(valEl.value || "0");
      if (!Number.isFinite(val) || val < 0) { showToast("Enter a valid used quantity.", "error"); return; }
      try {
        const rRef = doc(db, "requests", id);
        const rSnap = await getDoc(rRef);
        if (!rSnap.exists()) return;
        const r = rSnap.data();
        // only uploader can save
        if (!window.currentUser || window.currentUser.uid !== r.userId) { showToast("Only uploader can save usage.", "error"); return; }
        const newUsed = (r.usedQty || 0) + val;
        await updateDoc(rRef, { usedQty: Math.min(newUsed, r.qty) });
        document.getElementById(`used_${id}`).textContent = Math.min(newUsed, r.qty);
        showToast("Usage saved successfully!", "success");
        refreshSummary();
      } catch (err) { console.error(err); showToast("Error saving usage.", "error"); }
    });
    document.getElementById("closeUsageBtn").onclick = closeModal;
  } catch (err) { console.error(err); showToast("Error fetching usage list.", "error"); }
};

// ================== Utilities ==================
function escapeHtml(s){ return (s||"").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

refreshSummary();
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* NOTES:
 - Ensure Email/Password sign-in is enabled in Firebase Console (Authentication → Sign-in method).
 - Create unsigned Cloudinary preset "Crrd2025" (or rename in script).
 - Add Firestore security rules to enforce roles (I can supply rules on request).
*/