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
  getDocs,
  query,
  where,
  orderBy,
} from "fusabase/oracledb";
import { fusabaseConfig } from "../../fusabase-config.js";

const app = initializeApp(fusabaseConfig);
const auth = getAuth(app);
const db = getOracledb(app);

const $ = (id) => document.getElementById(id);
const message = $("message");
let currentUser = null;

function showError(err) {
  message.textContent = `${err.code ?? "error"}: ${err.message}`;
  message.className = "banner error";
}

function clearMessage() {
  message.textContent = "";
}

// --- auth gate -------------------------------------------------------------

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  $("signed-out").hidden = !!user;
  $("signed-in").hidden = !user;
  if (user) {
    $("user-email").textContent = user.email ?? user.uid;
    loadTodos();
  }
});

$("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
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

// --- todos -----------------------------------------------------------------

const todos = collection(db, "todos");

async function loadTodos() {
  if (!currentUser) return;
  clearMessage();
  try {
    // Only my todos, newest first. Both the rule and the index for this
    // query are configured in the Console.
    const snaps = await getDocs(
      query(
        todos,
        where("uid", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      )
    );
    renderTodos(snaps);
  } catch (err) {
    showError(err);
  }
}

function renderTodos(snaps) {
  const list = $("todo-list");
  list.innerHTML = "";
  let count = 0;
  snaps.forEach((snap) => {
    count++;
    const data = snap.data();
    const li = document.createElement("li");
    li.className = data.done ? "done" : "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!data.done;
    checkbox.addEventListener("change", () => toggleTodo(snap.id, checkbox.checked));

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = data.title;

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.textContent = "×";
    del.title = "Delete";
    del.addEventListener("click", () => removeTodo(snap.id));

    li.append(checkbox, title, del);
    list.appendChild(li);
  });
  $("todo-count").textContent = count ? `(${count})` : "";
  $("todo-empty").hidden = count > 0;
}

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  const title = $("new-title").value.trim();
  if (!title) return;
  try {
    await addDoc(todos, {
      uid: currentUser.uid,
      title,
      done: false,
      createdAt: Date.now(),
    });
    $("new-title").value = "";
    await loadTodos();
  } catch (err) {
    showError(err);
  }
});

async function toggleTodo(id, done) {
  clearMessage();
  try {
    await updateDoc(doc(db, "todos", id), { done });
    await loadTodos();
  } catch (err) {
    await loadTodos(); // resync the checkbox with what's actually stored
    showError(err);
  }
}

async function removeTodo(id) {
  clearMessage();
  try {
    await deleteDoc(doc(db, "todos", id));
    await loadTodos();
  } catch (err) {
    showError(err);
  }
}
