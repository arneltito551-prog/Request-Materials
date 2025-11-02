// script.js (module) - Firestore-backed dashboard (cleaned, deduplicated, fixed)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, deleteDoc, doc, updateDoc, getDocs, where, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ---------- CONFIG ----------
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
try { getAnalytics(app); } catch (e) { /* ignore analytics errors */ }
const db = getFirestore(app);

// cloudinary placeholders (not used but left for future)
const cloudName = "dtmm8frik";
const uploadPreset = "Crrd2025";

// ---------- COLLECTIONS ----------
const requestsCol = collection(db, "requests");
const deliveredCol = collection(db, "delivered");
const usageCol = collection(db, "usage");

// ---------- UI REFS (safely get by id) ----------
function $id(id){ return document.getElementById(id); }

const submitRequestBtn = $id("submitRequestBtn");
const submitModal = $id("submitModal");
const exitModalBtn = $id("exitModalBtn");
const submitDataBtn = $id("submitDataBtn");
const dateEl = $id("date");
const personnelEl = $id("personnel");
const particularEl = $id("particular");
const unitEl = $id("unit");
const qtyEl = $id("qty");
const toastEl = $id("toast");

const viewRequestBtn = $id("viewRequestBtn");
const viewRequestModal = $id("viewRequestModal");
const requestsTbody = $id("requestsTbody");
const closeRequestsBtn = $id("closeRequestsBtn");
const closeRequestsBtnTop = $id("closeRequestsBtnTop");
const openAddDeliveredFromRequestsBtn = $id("openAddDeliveredFromRequestsBtn");
const openAddUsageFromRequestsBtn = $id("openAddUsageFromRequestsBtn");
const searchRequests = $id("searchRequests");
const printRequestsBtn = $id("printRequestsBtn");

const viewDeliveredBtn = $id("viewDeliveredBtn");
const deliveredModal = $id("deliveredModal");
const deliveredTbody = $id("deliveredTbody");
const closeDeliveredBtn = $id("closeDeliveredBtn");
const closeDeliveredBtnTop = $id("closeDeliveredBtnTop");
const addDeliveredBtn = $id("addDeliveredBtn");
const searchDelivered = $id("searchDelivered");
const printDeliveredBtn = $id("printDeliveredBtn");

// edit delivered modal
const editDeliveredModal = $id("editDeliveredModal");
const editDeliveredTitle = $id("editDeliveredTitle");
const deliveredRequestSelect = $id("deliveredRequestSelect");
const deliveredRequestSearch = $id("deliveredRequestSearch");
const editDeliveredParticular = $id("editDeliveredParticular");
const editDeliveredUnit = $id("editDeliveredUnit");
const editDeliveredQty = $id("editDeliveredQty");
const saveDeliveredBtn = $id("saveDeliveredBtn");
const cancelEditDeliveredBtn = $id("cancelEditDeliveredBtn");

const viewRemainingBtn = $id("viewRemainingBtn");
const remainingModal = $id("remainingModal");
const remainingTbody = $id("remainingTbody");
const closeRemainingBtn = $id("closeRemainingBtn");
const closeRemainingBtnTop = $id("closeRemainingBtnTop");
const searchRemaining = $id("searchRemaining");
const printRemainingBtn = $id("printRemainingBtn");

const viewUsageBtn = $id("viewUsageBtn");
const usageModal = $id("usageModal");
const usageTbody = $id("usageTbody");
const closeUsageBtn = $id("closeUsageBtn");
const closeUsageBtnTop = $id("closeUsageBtnTop");
const addUsageBtn = $id("addUsageBtn");
const searchUsage = $id("searchUsage");
const printUsageBtn = $id("printUsageBtn");

// edit usage modal
const editUsageModal = $id("editUsageModal");
const editUsageTitle = $id("editUsageTitle");
const usageRequestSelect = $id("usageRequestSelect");
const usageRequestSearch = $id("usageRequestSearch");
const editUsageParticular = $id("editUsageParticular");
const editUsageUnit = $id("editUsageUnit");
const editUsageQty = $id("editUsageQty");
const editUsageRemarks = $id("editUsageRemarks");
const saveUsageBtn = $id("saveUsageBtn");
const cancelEditUsageBtn = $id("cancelEditUsageBtn");

const viewHistoryBtn = $id("viewHistoryBtn");
const historyModal = $id("historyModal");
const historyTbody = $id("historyTbody");
const closeHistoryBtn = $id("closeHistoryBtn");
const closeHistoryBtnTop = $id("closeHistoryBtnTop");
const searchHistory = $id("searchHistory");
const printHistoryBtn = $id("printHistoryBtn");

// editing state
let editingDeliveredId = null;
let editingUsageId = null;

// local cached requests for selects / quick lookup
let latestRequestsArray = [];

// ---------- small safe helpers ----------
function safeAddListener(el, ev, fn){
  if(!el) return;
  el.addEventListener(ev, fn);
}
function openModal(el){
  if(!el) return;
  el.classList.add("fullscreen");
  el.style.display = "flex";
  el.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeModal(el){
  if(!el) return;
  el.style.display = "none";
  el.classList.remove("fullscreen");
  el.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}
function showToast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = "show";
  setTimeout(()=> toastEl.className = "", 3000);
}
function fmtDate(ts){
  try{ return ts?.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString(); } catch(e){ return ""; }
}
function escapeHtml(s){ if(!s) return ""; return s.toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
function normKey(s){ return (s||"").toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }

// compute remaining helpers
function remainingForDelivered(req) {
  if(req?.remainingForDelivered != null) return Number(req.remainingForDelivered);
  return Number(req.qty ?? 0);
}
function remainingForUsage(req) {
  if(req?.remainingForUsage != null) return Number(req.remainingForUsage);
  return Number(req.qty ?? 0);
}

// ---------- Submit Request ----------
safeAddListener(submitRequestBtn, "click", ()=>{
  if(dateEl) dateEl.value = new Date().toLocaleString();
  openModal(submitModal);
});
safeAddListener(exitModalBtn, "click", ()=> closeModal(submitModal));

safeAddListener(submitDataBtn, "click", async ()=>{
  const personnel = personnelEl?.value.trim();
  const particular = particularEl?.value.trim();
  const unit = unitEl?.value.trim();
  const qty = Number(qtyEl?.value);
  if(!personnel || !particular || !unit || !qty || qty <= 0){ showToast("⚠️ Fill all fields"); return; }
  try{
    await addDoc(requestsCol, {
      personnel, particular, unit, qty,
      remainingForDelivered: qty,
      remainingForUsage: qty,
      deliveredFulfilled: false,
      usageFulfilled: false,
      createdAt: serverTimestamp()
    });
    showToast("✅ Request submitted");
    if(personnelEl) personnelEl.value = "";
    if(particularEl) particularEl.value = "";
    if(unitEl) unitEl.value = "";
    if(qtyEl) qtyEl.value = "";
    closeModal(submitModal);
  } catch(e){ console.error(e); showToast("⚠️ Submit failed"); }
});

// ---------- Requests live listener ----------
const requestsQ = query(requestsCol, orderBy("createdAt","desc"));

onSnapshot(requestsQ, snapshot=>{
  if(requestsTbody) requestsTbody.innerHTML = "";
  const deliveredSelectList = [];
  const usageSelectList = [];
  latestRequestsArray = [];

  snapshot.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    const remD = remainingForDelivered(d);
    const remU = remainingForUsage(d);
    const date = fmtDate(d.createdAt);
    const remLabel = `D:${remD} | U:${remU}`;

    // local cache
    latestRequestsArray.push({ id, ...d, remainingForDelivered: remD, remainingForUsage: remU, createdAt: d.createdAt });

    if(requestsTbody){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:left;padding-left:10px">${escapeHtml(d.personnel)}</td>
        <td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
        <td>${escapeHtml(d.unit)}</td>
        <td>${d.qty ?? 0}</td>
        <td>${remLabel}</td>
        <td>${date}</td>
        <td>
          <button class="table-btn small-delete" data-id="${id}" data-action="delete">Delete</button>
        </td>
      `;
      requestsTbody.appendChild(tr);
    }

    if(!d.deliveredFulfilled && remD > 0) {
      deliveredSelectList.push({ id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForDelivered: remD, createdAt: d.createdAt });
    }
    if(!d.usageFulfilled && remU > 0) {
      usageSelectList.push({ id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForUsage: remU, createdAt: d.createdAt });
    }
  });

  // bind delete buttons (scoped)
  if(requestsTbody){
    requestsTbody.querySelectorAll("button[data-action='delete']").forEach(btn=>{
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if(!confirm("Delete this request and all related Delivered & Usage records?")) return;
        try{
          await cascadeDeleteRequest(id);
          showToast("✅ Request and related records deleted");
        } catch(err){ console.error(err); showToast("⚠️ Delete failed"); }
      };
    });
  }

  // fill selects
  fillDeliveredSelect(deliveredSelectList);
  fillUsageSelect(usageSelectList);
});

// open/close request modal
safeAddListener(viewRequestBtn, "click", ()=> openModal(viewRequestModal));
safeAddListener(closeRequestsBtn, "click", ()=> closeModal(viewRequestModal));
safeAddListener(closeRequestsBtnTop, "click", ()=> closeModal(viewRequestModal));

// search requests (filter table rows) - single hookup
safeAddListener(searchRequests, "input", ()=> filterTableRows(requestsTbody, searchRequests.value));
safeAddListener(printRequestsBtn, "click", ()=> printTable("Requests", document.getElementById("requestsTable")));

// open add delivered/usage from requests
safeAddListener(openAddDeliveredFromRequestsBtn, "click", ()=>{
  editingDeliveredId = null;
  if(editDeliveredTitle) editDeliveredTitle.textContent = "Add Delivered (select request)";
  if(editDeliveredParticular) editDeliveredParticular.value = "";
  if(editDeliveredUnit) editDeliveredUnit.value = "";
  if(editDeliveredQty) editDeliveredQty.value = 1;
  if(deliveredRequestSelect) deliveredRequestSelect.value = "";
  openModal(editDeliveredModal);
});
safeAddListener(openAddUsageFromRequestsBtn, "click", ()=>{
  editingUsageId = null;
  if(editUsageTitle) editUsageTitle.textContent = "Add Usage (select request)";
  if(editUsageParticular) editUsageParticular.value = "";
  if(editUsageUnit) editUsageUnit.value = "";
  if(editUsageQty) editUsageQty.value = 1;
  if(editUsageRemarks) editUsageRemarks.value = "";
  if(usageRequestSelect) usageRequestSelect.value = "";
  openModal(editUsageModal);
});

// cascade delete (request + related delivered + usage)
async function cascadeDeleteRequest(requestId){
  const batch = writeBatch(db);
  const reqRef = doc(db, "requests", requestId);
  batch.delete(reqRef);

  const delQ = query(deliveredCol, where("fromRequestId", "==", requestId));
  const delSnap = await getDocs(delQ);
  delSnap.forEach(s => batch.delete(doc(db, "delivered", s.id)));

  const usageQ = query(usageCol, where("fromRequestId", "==", requestId));
  const usageSnap = await getDocs(usageQ);
  usageSnap.forEach(s => batch.delete(doc(db, "usage", s.id)));

  await batch.commit();
}

// ---------- Delivered add/edit/toggle ----------
safeAddListener(viewDeliveredBtn, "click", ()=> openModal(deliveredModal));
safeAddListener(closeDeliveredBtn, "click", ()=> closeModal(deliveredModal));
safeAddListener(closeDeliveredBtnTop, "click", ()=> closeModal(deliveredModal));

safeAddListener(addDeliveredBtn, "click", ()=>{
  editingDeliveredId = null;
  if(editDeliveredTitle) editDeliveredTitle.textContent = "Add Delivered";
  if(deliveredRequestSelect) deliveredRequestSelect.value = "";
  if(editDeliveredParticular) editDeliveredParticular.value = "";
  if(editDeliveredUnit) editDeliveredUnit.value = "";
  if(editDeliveredQty) editDeliveredQty.value = 1;
  openModal(editDeliveredModal);
});
safeAddListener(cancelEditDeliveredBtn, "click", ()=> closeModal(editDeliveredModal));

safeAddListener(saveDeliveredBtn, "click", async ()=>{
  const particular = editDeliveredParticular?.value.trim();
  const unit = editDeliveredUnit?.value.trim();
  const qty = Number(editDeliveredQty?.value);
  const linkedRequestId = deliveredRequestSelect?.value || null;
  if(!particular || !unit || !qty || qty <= 0){ showToast("⚠️ Fill delivered fields"); return; }
  try{
    if(editingDeliveredId){
      await updateDoc(doc(db, "delivered", editingDeliveredId), { particular, unit, qty, updatedAt: serverTimestamp() });
      showToast("✅ Delivered updated");
    } else {
      await addDoc(deliveredCol, {
        particular, unit, qty, status: "pending", deliveredAt: serverTimestamp(), fromRequestId: linkedRequestId ?? null
      });
      showToast("✅ Delivered added");
      if(linkedRequestId){
        await decrementDeliveredRemaining(linkedRequestId, qty);
      }
    }
    closeModal(editDeliveredModal);
  } catch(e){ console.error(e); showToast("⚠️ Save failed"); }
});

// delivered live listener
const deliveredQ = query(deliveredCol, orderBy("deliveredAt","desc"));
onSnapshot(deliveredQ, snapshot=>{
  if(deliveredTbody) deliveredTbody.innerHTML = "";
  snapshot.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    const date = fmtDate(d.deliveredAt);
    const status = d.status || "pending";
    if(deliveredTbody){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
        <td>${escapeHtml(d.unit)}</td>
        <td>${d.qty}</td>
        <td>${escapeHtml(status)}</td>
        <td>${date}</td>
        <td>
          <button class="table-btn small-mark" data-id="${id}" data-action="toggle">${ status === "completed" ? "Mark Pending" : "Mark Completed" }</button>
          <button class="table-btn small-edit" data-id="${id}" data-action="edit">Edit</button>
        </td>
      `;
      deliveredTbody.appendChild(tr);
    }
  });

  // scope only buttons with data-action
  if(deliveredTbody){
    deliveredTbody.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if(action === "toggle"){
          try{
            const ref = doc(db, "delivered", id);
            const snap = await getDoc(ref);
            if(!snap.exists()) return showToast("Record missing");
            const current = snap.data().status || "pending";
            const next = (current === "completed") ? "pending" : "completed";
            await updateDoc(ref, { status: next, updatedAt: serverTimestamp() });
            showToast(`Status set to ${next}`);
          } catch(e){ console.error(e); showToast("⚠️ Toggle failed"); }
        } else if(action === "edit"){
          try{
            const ref = doc(db, "delivered", id);
            const snap = await getDoc(ref);
            if(!snap.exists()) return showToast("Record missing");
            const data = snap.data();
            editingDeliveredId = id;
            if(editDeliveredTitle) editDeliveredTitle.textContent = "Edit Delivered";
            if(deliveredRequestSelect) deliveredRequestSelect.value = data.fromRequestId || "";
            if(editDeliveredParticular) editDeliveredParticular.value = data.particular || "";
            if(editDeliveredUnit) editDeliveredUnit.value = data.unit || "";
            if(editDeliveredQty) editDeliveredQty.value = data.qty || 1;
            openModal(editDeliveredModal);
          } catch(e){ console.error(e); showToast("⚠️ Fetch failed"); }
        }
      };
    });
  }
});

// decrement delivered remaining only (and mark deliveredFulfilled if <=0)
async function decrementDeliveredRemaining(requestId, delta){
  try{
    const reqRef = doc(db, "requests", requestId);
    const snap = await getDoc(reqRef);
    if(!snap.exists()) return;
    const data = snap.data();
    const cur = Number(data.remainingForDelivered ?? data.qty ?? 0);
    const newRem = Math.max(cur - Number(delta || 0), 0);
    if(newRem <= 0){
      await updateDoc(reqRef, { remainingForDelivered: 0, deliveredFulfilled: true, updatedAt: serverTimestamp() });
      showToast("✅ Request fulfilled for Delivered (removed from Delivered select)");
    } else {
      await updateDoc(reqRef, { remainingForDelivered: newRem, updatedAt: serverTimestamp() });
      showToast(`✅ Delivered remaining updated: ${newRem}`);
    }
  } catch(err){ console.error("decrementDeliveredRemaining error:", err); }
}

// ---------- Usage add/edit ----------
safeAddListener(viewUsageBtn, "click", ()=> openModal(usageModal));
safeAddListener(closeUsageBtn, "click", ()=> closeModal(usageModal));
safeAddListener(closeUsageBtnTop, "click", ()=> closeModal(usageModal));

safeAddListener(addUsageBtn, "click", ()=>{
  editingUsageId = null;
  if(editUsageTitle) editUsageTitle.textContent = "Add Usage";
  if(usageRequestSelect) usageRequestSelect.value = "";
  if(editUsageParticular) editUsageParticular.value = "";
  if(editUsageUnit) editUsageUnit.value = "";
  if(editUsageQty) editUsageQty.value = 1;
  if(editUsageRemarks) editUsageRemarks.value = "";
  openModal(editUsageModal);
});
safeAddListener(cancelEditUsageBtn, "click", ()=> closeModal(editUsageModal));

safeAddListener(saveUsageBtn, "click", async ()=>{
  const particular = editUsageParticular?.value.trim();
  const unit = editUsageUnit?.value.trim();
  const qty = Number(editUsageQty?.value);
  const remarks = editUsageRemarks?.value.trim();
  const linkedRequestId = usageRequestSelect?.value || null;
  if(!particular || !unit || !qty || qty <= 0){ showToast("⚠️ Fill usage fields"); return; }
  try{
    if(editingUsageId){
      await updateDoc(doc(db, "usage", editingUsageId), { particular, unit, qty, remarks, updatedAt: serverTimestamp() });
      showToast("✅ Usage updated");
    } else {
      await addDoc(usageCol, { particular, unit, qty, remarks, usedAt: serverTimestamp(), fromRequestId: linkedRequestId ?? null });
      showToast("✅ Usage added");
      if(linkedRequestId){
        await decrementUsageRemaining(linkedRequestId, qty);
      }
    }
    closeModal(editUsageModal);
  } catch(e){ console.error(e); showToast("⚠️ Save failed"); }
});

// usage live listener
const usageQ = query(usageCol, orderBy("usedAt","desc"));
onSnapshot(usageQ, snapshot=>{
  if(usageTbody) usageTbody.innerHTML = "";
  snapshot.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    const date = fmtDate(d.usedAt);
    if(usageTbody){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
        <td>${escapeHtml(d.unit)}</td><td>${d.qty}</td><td>${date}</td><td>${escapeHtml(d.remarks || "")}</td>
        <td><button class="table-btn small-edit" data-id="${id}" data-action="edit">Edit</button></td>`;
      usageTbody.appendChild(tr);
    }
  });

  if(usageTbody){
    usageTbody.querySelectorAll("button[data-action='edit']").forEach(btn=>{
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try{
          const snap = await getDoc(doc(db,"usage",id));
          if(!snap.exists()) return showToast("Record missing");
          const data = snap.data();
          editingUsageId = id;
          if(editUsageTitle) editUsageTitle.textContent = "Edit Usage Remarks";
          if(usageRequestSelect) usageRequestSelect.value = data.fromRequestId || "";
          if(editUsageParticular) editUsageParticular.value = data.particular || "";
          if(editUsageUnit) editUsageUnit.value = data.unit || "";
          if(editUsageQty) editUsageQty.value = data.qty || 1;
          if(editUsageRemarks) editUsageRemarks.value = data.remarks || "";
          openModal(editUsageModal);
        } catch(e){ console.error(e); showToast("⚠️ Fetch failed"); }
      };
    });
  }
});

// decrement usage remaining only (and mark usageFulfilled if <=0)
async function decrementUsageRemaining(requestId, delta){
  try{
    const reqRef = doc(db, "requests", requestId);
    const snap = await getDoc(reqRef);
    if(!snap.exists()) return;
    const data = snap.data();
    const cur = Number(data.remainingForUsage ?? data.qty ?? 0);
    const newRem = Math.max(cur - Number(delta || 0), 0);
    if(newRem <= 0){
      await updateDoc(reqRef, { remainingForUsage: 0, usageFulfilled: true, updatedAt: serverTimestamp() });
      showToast("✅ Request fulfilled for Usage (removed from Usage select)");
    } else {
      await updateDoc(reqRef, { remainingForUsage: newRem, updatedAt: serverTimestamp() });
      showToast(`✅ Usage remaining updated: ${newRem}`);
    }
  } catch(err){ console.error("decrementUsageRemaining error:", err); }
}

// ---------- Remaining: compute and show ----------
safeAddListener(viewRemainingBtn, "click", ()=> { computeAndRenderRemaining(); openModal(remainingModal); });
safeAddListener(closeRemainingBtn, "click", ()=> closeModal(remainingModal));
safeAddListener(closeRemainingBtnTop, "click", ()=> closeModal(remainingModal));
safeAddListener(searchRemaining, "input", ()=> filterTableRows(remainingTbody, searchRemaining.value));
safeAddListener(printRemainingBtn, "click", ()=> printTable("Remaining Inventory", document.getElementById("remainingTable")));

async function computeAndRenderRemaining(){
  const reqSnap = await getDocs(requestsCol);
  const delSnap = await getDocs(deliveredCol);
  const usSnap = await getDocs(usageCol);
  const totals = {}; // key -> {particular, requested, delivered, used}

  reqSnap.forEach(s => {
    const d = s.data();
    const k = normKey(d.particular);
    totals[k] = totals[k] || { particular: d.particular, requested:0, delivered:0, used:0 };
    totals[k].requested += Number(d.qty || 0);
  });
  delSnap.forEach(s => {
    const d = s.data();
    const k = normKey(d.particular);
    totals[k] = totals[k] || { particular: d.particular, requested:0, delivered:0, used:0 };
    totals[k].delivered += Number(d.qty || 0);
  });
  usSnap.forEach(s => {
    const d = s.data();
    const k = normKey(d.particular);
    totals[k] = totals[k] || { particular: d.particular, requested:0, delivered:0, used:0 };
    totals[k].used += Number(d.qty || 0);
  });

  if(remainingTbody) remainingTbody.innerHTML = "";
  const keys = Object.keys(totals).sort();
  if(keys.length === 0){
    if(remainingTbody) remainingTbody.innerHTML = `<tr><td colspan="5">No data</td></tr>`;
    return;
  }
  keys.forEach(k=>{
    const it = totals[k];
    const remaining = (it.delivered || 0) - (it.used || 0);
    if(remainingTbody){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(it.particular)}</td>
        <td>${it.requested || 0}</td><td>${it.delivered || 0}</td><td>${it.used || 0}</td><td>${remaining}</td>`;
      remainingTbody.appendChild(tr);
    }
  });
}

// ---------- History (monthly totals) ----------
safeAddListener(viewHistoryBtn, "click", async ()=> { await renderHistory(); openModal(historyModal); });
safeAddListener(closeHistoryBtn, "click", ()=> closeModal(historyModal));
safeAddListener(closeHistoryBtnTop, "click", ()=> closeModal(historyModal));
safeAddListener(searchHistory, "input", ()=> filterTableRows(historyTbody, searchHistory.value));
safeAddListener(printHistoryBtn, "click", ()=> printTable("History Usage", document.getElementById("historyTable")));

async function renderHistory(){
  const snaps = await getDocs(usageCol);
  const totals = {};
  snaps.forEach(s=>{
    const d = s.data();
    const dt = d.usedAt?.toDate ? d.usedAt.toDate() : (d.usedAt ? new Date(d.usedAt) : new Date());
    const month = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    const key = `${d.particular}||${month}`;
    totals[key] = (totals[key]||0) + Number(d.qty || 0);
  });
  if(historyTbody) historyTbody.innerHTML = "";
  const keys = Object.keys(totals).sort();
  if(keys.length === 0){
    if(historyTbody) historyTbody.innerHTML = `<tr><td colspan="3">No history</td></tr>`;
    return;
  }
  keys.forEach(k=>{
    const [particular, month] = k.split("||");
    const [y,m] = month.split("-");
    const monthLabel = new Date(Number(y), Number(m)-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"});
    if(historyTbody){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(particular)}</td><td>${monthLabel}</td><td>${totals[k]}</td>`;
      historyTbody.appendChild(tr);
    }
  });
}

// ---------- Helpers to populate selects ----------
function fillDeliveredSelect(requests){
  if(!deliveredRequestSelect) return;
  deliveredRequestSelect.innerHTML = `<option value="">-- Select a submitted request --</option>`;
  // alphabetize by particular then personnel
  requests.sort((a,b)=> {
    const ka = (a.particular||"").toLowerCase();
    const kb = (b.particular||"").toLowerCase();
    if(ka < kb) return -1;
    if(ka > kb) return 1;
    return (a.personnel||"").toLowerCase().localeCompare((b.personnel||"").toLowerCase());
  });
  requests.forEach(r=>{
    const label = `${r.personnel} — ${r.particular} (remain D:${r.remainingForDelivered})`;
    const opt = document.createElement("option"); opt.value = r.id; opt.textContent = label;
    deliveredRequestSelect.appendChild(opt);
  });

  deliveredRequestSelect.onchange = () => {
    const rid = deliveredRequestSelect.value;
    const sel = latestRequestsArray.find(x=> x.id === rid);
    if(personnelEl) personnelEl.value = "";
    if(sel){
      if(editDeliveredParticular) editDeliveredParticular.value = sel.particular;
      if(editDeliveredUnit) editDeliveredUnit.value = sel.unit;
      if(editDeliveredQty) editDeliveredQty.value = sel.remainingForDelivered || sel.qty;
    } else {
      if(editDeliveredParticular) editDeliveredParticular.value = "";
      if(editDeliveredUnit) editDeliveredUnit.value = "";
      if(editDeliveredQty) editDeliveredQty.value = 1;
    }
  };

  if(deliveredRequestSearch){
    deliveredRequestSearch.oninput = () => {
      const q = deliveredRequestSearch.value.toLowerCase().trim();
      Array.from(deliveredRequestSelect.options).forEach(opt=>{
        if(!opt.value){ opt.hidden = false; return; } // keep placeholder visible
        opt.hidden = !(opt.text.toLowerCase().includes(q));
      });
    };
  }
}

function fillUsageSelect(requests){
  if(!usageRequestSelect) return;
  usageRequestSelect.innerHTML = `<option value="">-- Select a submitted request --</option>`;
  requests.sort((a,b)=> {
    const ka = (a.particular||"").toLowerCase();
    const kb = (b.particular||"").toLowerCase();
    if(ka < kb) return -1;
    if(ka > kb) return 1;
    return (a.personnel||"").toLowerCase().localeCompare((b.personnel||"").toLowerCase());
  });
  requests.forEach(r=>{
    const label = `${r.personnel} — ${r.particular} (remain U:${r.remainingForUsage})`;
    const opt = document.createElement("option"); opt.value = r.id; opt.textContent = label;
    usageRequestSelect.appendChild(opt);
  });

  usageRequestSelect.onchange = () => {
    const rid = usageRequestSelect.value;
    const sel = latestRequestsArray.find(x=> x.id === rid);
    if(personnelEl) personnelEl.value = "";
    if(sel){
      if(editUsageParticular) editUsageParticular.value = sel.particular;
      if(editUsageUnit) editUsageUnit.value = sel.unit;
      if(editUsageQty) editUsageQty.value = sel.remainingForUsage || sel.qty;
    } else {
      if(editUsageParticular) editUsageParticular.value = "";
      if(editUsageUnit) editUsageUnit.value = "";
      if(editUsageQty) editUsageQty.value = 1;
    }
  };

  if(usageRequestSearch){
    usageRequestSearch.oninput = () => {
      const q = usageRequestSearch.value.toLowerCase().trim();
      Array.from(usageRequestSelect.options).forEach(opt=>{
        if(!opt.value){ opt.hidden = false; return; }
        opt.hidden = !(opt.text.toLowerCase().includes(q));
      });
    };
  }
}

// Boot - initial fill of selects (one-shot)
(async function boot(){
  try{
    const reqSnap = await getDocs(requestsCol);
    const arrD = [];
    const arrU = [];
    reqSnap.forEach(s=>{
      const d = s.data();
      const remD = remainingForDelivered(d);
      const remU = remainingForUsage(d);
      if(!d.deliveredFulfilled && remD > 0){
        arrD.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForDelivered: remD, createdAt: d.createdAt });
      }
      if(!d.usageFulfilled && remU > 0){
        arrU.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForUsage: remU, createdAt: d.createdAt });
      }
    });
    fillDeliveredSelect(arrD);
    fillUsageSelect(arrU);
  } catch(e){ console.error("boot error", e); }
})();

// convenience loaders
async function loadDeliveredRecords() {
  if(!deliveredTbody) return;
  deliveredTbody.innerHTML = "";
  const snap = await getDocs(deliveredCol);
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const date = fmtDate(d.deliveredAt);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
      <td>${escapeHtml(d.unit)}</td><td>${d.qty}</td><td>${escapeHtml(d.status||"pending")}</td><td>${date}</td><td></td>`;
    deliveredTbody.appendChild(tr);
  });
}

async function loadUsageRecords() {
  if(!usageTbody) return;
  usageTbody.innerHTML = "";
  const snap = await getDocs(usageCol);
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const date = fmtDate(d.usedAt);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left;padding-left:10px">${escapeHtml(d.particular)}</td>
      <td>${escapeHtml(d.unit)}</td><td>${d.qty}</td><td>${date}</td><td>${escapeHtml(d.remarks||"")}</td><td></td>`;
    usageTbody.appendChild(tr);
  });
}
async function loadRemainingRecords() { await computeAndRenderRemaining(); }
async function loadMaterialHistory() { await renderHistory(); }

// initial load
window.addEventListener("load", () => {
  loadDeliveredRecords();
  loadUsageRecords();
  loadRemainingRecords();
  loadMaterialHistory();
});

// ---------- Table filter helper ----------
function filterTableRows(tbodyEl, queryText){
  if(!tbodyEl) return;
  const q = (queryText || "").toString().toLowerCase().trim();
  Array.from(tbodyEl.querySelectorAll("tr")).forEach(tr=>{
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(q) ? "" : "none";
  });
}

// ---------- Print helper (prints table with title & timestamp) ----------
function printTable(title, tableEl){
  if(!tableEl) { showToast("⚠️ Table not found"); return; }
  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body{ font-family: Arial, Helvetica, sans-serif; padding:20px; color:#000 }
          h1{ font-size:18px; margin-bottom:8px }
          table{ width:100%; border-collapse:collapse; margin-top:10px }
          th,td{ border:1px solid #ddd; padding:8px; text-align:left; font-size:12px }
          th{ background:#f4f4f4; font-weight:700 }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div>Printed: ${new Date().toLocaleString()}</div>
        ${tableEl.outerHTML}
      </body>
    </html>
  `;
  const w = window.open("", "_blank", "width=900,height=700");
  if(!w) { showToast("⚠️ Popup blocked. Allow popups to print."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=> w.print(), 350);
}

// ---------- Utility: search input hookup for delivered/usage/request tables ----------
safeAddListener(searchDelivered, "input", ()=> filterTableRows(deliveredTbody, searchDelivered.value));
safeAddListener(searchUsage, "input", ()=> filterTableRows(usageTbody, searchUsage.value));
// searchRequests hooked above once

// ---------- Boot note: ensure selects update when requests change ----------
onSnapshot(requestsQ, snapshot=>{
  // rebuild selectable arrays for delivered/usage selects
  const arrD = [];
  const arrU = [];
  snapshot.forEach(s=>{
    const d = s.data();
    const remD = remainingForDelivered(d);
    const remU = remainingForUsage(d);
    if(!d.deliveredFulfilled && remD > 0){
      arrD.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForDelivered: remD, createdAt: d.createdAt });
    }
    if(!d.usageFulfilled && remU > 0){
      arrU.push({ id: s.id, personnel: d.personnel, particular: d.particular, unit: d.unit, remainingForUsage: remU, createdAt: d.createdAt });
    }
  });
  fillDeliveredSelect(arrD);
  fillUsageSelect(arrU);
});
