import { initializeApp } from "fusabase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "fusabase/auth";
import {
  getOracledb,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "fusabase/oracledb";
import { fusabaseConfig } from "../../fusabase-config.js";

// onSnapshot's default transport polls every 29s. There's also a WebSocket
// transport (use_socket: true) for instant updates, but it needs the realtime
// path (wss://<host>/ords/baas-realtime/...) to pass WebSocket upgrades at your
// reverse proxy, which isn't set up here. So we fall back to long polling on
// the 5s minimum, which works over plain HTTP.
const app = initializeApp({ ...fusabaseConfig, long_polling_interval: 5 });
const auth = getAuth(app);
const db = getOracledb(app);

const $ = (id) => document.getElementById(id);
const message = $("message");
let currentUser = null;
const unsubscribers = [];

function showError(err) {
  message.textContent = `${err.code ?? "error"}: ${err.message}`;
  message.className = "banner error";
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  $("signed-out").hidden = !!user;
  $("signed-in").hidden = !user;
  if (user) {
    $("user-email").textContent = user.email ?? user.uid;
    startListeners();
  } else {
    while (unsubscribers.length) unsubscribers.pop()();
  }
});

$("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(
      auth,
      $("signin-email").value,
      $("signin-password").value
    );
  } catch (err) {
    showError(err);
  }
});

$("signout-link").addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth);
});

// Each device gets its own live listener on the same query.
function startListeners() {
  if (unsubscribers.length) return;
  const q = query(
    collection(db, "todos"),
    where("uid", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );
  for (const device of ["a", "b"]) {
    const unsub = onSnapshot(
      q,
      (snap) => {
        $(`dot-${device}`).classList.add("on");
        renderInto(device, snap);
      },
      (err) => showError(err)
    );
    unsubscribers.push(unsub);
  }
}

function renderInto(device, snap) {
  const list = $(`list-${device}`);
  const seen = new Set(
    [...list.children].map((li) => li.dataset.id)
  );
  list.innerHTML = "";
  let count = 0;
  snap.forEach((docSnap) => {
    count++;
    const data = docSnap.data();
    const li = document.createElement("li");
    li.dataset.id = docSnap.id;
    if (data.done) li.className = "done";
    if (!seen.has(docSnap.id) && seen.size) li.classList.add("flash");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!data.done;
    checkbox.addEventListener("change", () =>
      updateDoc(doc(db, "todos", docSnap.id), { done: checkbox.checked }).catch(
        showError
      )
    );

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = data.title;

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.textContent = "×";
    del.title = "Delete";
    del.addEventListener("click", () =>
      deleteDoc(doc(db, "todos", docSnap.id)).catch(showError)
    );

    li.append(checkbox, title, del);
    list.appendChild(li);
  });
  $(`empty-${device}`).hidden = count > 0;
}

for (const form of document.querySelectorAll(".add-form")) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.querySelector(".new-title");
    const title = input.value.trim();
    if (!title) return;
    input.value = "";
    try {
      await addDoc(collection(db, "todos"), {
        uid: currentUser.uid,
        title,
        done: false,
        createdAt: Date.now(),
      });
    } catch (err) {
      showError(err);
    }
  });
}
