import { initializeApp } from "fusabase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "fusabase/auth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
} from "fusabase/storage";
import { fusabaseConfig } from "../../fusabase-config.js";

const app = initializeApp(fusabaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

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
    loadFiles();
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

// --- storage ---------------------------------------------------------------

// Each user gets their own folder; the storage rule matches this layout.
const userFolder = () => ref(storage, `attachments/${currentUser.uid}`);

// The storage rule can't cap upload size for resumable uploads (the size
// isn't presented to the rule on create), so we enforce the limit here.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

$("upload-form").addEventListener("submit", (e) => {
  e.preventDefault();
  clearMessage();
  const file = $("file-input").files[0];
  if (!file) return;

  if (file.size > MAX_UPLOAD_BYTES) {
    showError({ code: "storage/file-too-large", message: "File exceeds the 10 MB limit." });
    return;
  }

  const fileRef = ref(storage, `attachments/${currentUser.uid}/${file.name}`);
  const task = uploadBytesResumable(fileRef, file, { contentType: file.type });
  const progress = $("progress");
  progress.classList.add("active");

  task.on(
    "state_changed",
    (snap) => {
      const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
      $("progress-bar").style.width = `${pct}%`;
    },
    (err) => {
      progress.classList.remove("active");
      $("progress-bar").style.width = "0%";
      showError(err);
    },
    async () => {
      progress.classList.remove("active");
      $("progress-bar").style.width = "0%";
      $("upload-form").reset();
      await loadFiles();
    }
  );
});

async function loadFiles() {
  if (!currentUser) return;
  try {
    const result = await listAll(userFolder());

    // resolve all download URLs before touching the DOM, so a failure
    // can't leave a half-rendered list behind
    const rows = await Promise.all(
      result.items.map(async (item) => {
        const li = document.createElement("li");

        const link = document.createElement("a");
        link.textContent = item.name;
        link.className = "title";
        link.target = "_blank";
        link.href = await getDownloadURL(item);

        const del = document.createElement("button");
        del.className = "icon-btn";
        del.textContent = "×";
        del.title = "Delete";
        del.addEventListener("click", async () => {
          clearMessage();
          try {
            await deleteObject(item);
            await loadFiles();
          } catch (err) {
            showError(err);
          }
        });

        li.append(link, del);
        return li;
      })
    );

    $("file-list").replaceChildren(...rows);
    $("file-count").textContent = rows.length ? `(${rows.length})` : "";
    $("file-empty").hidden = rows.length > 0;
  } catch (err) {
    showError(err);
  }
}
