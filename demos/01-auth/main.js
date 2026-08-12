import { initializeApp } from "fusabase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getIdTokenResult,
  signOut,
} from "fusabase/auth";
import { fusabaseConfig } from "../../fusabase-config.js";

const app = initializeApp(fusabaseConfig);
const auth = getAuth(app);

const $ = (id) => document.getElementById(id);
const message = $("message");

function showMessage(text, kind = "error") {
  message.textContent = text;
  message.className = `banner ${kind}`;
}

function clearMessage() {
  message.textContent = "";
}

// React to sign-in / sign-out, including sessions restored from a previous visit.
onAuthStateChanged(auth, async (user) => {
  $("signed-out").hidden = !!user;
  $("signed-in").hidden = !user;
  if (!user) return;

  $("user-email").textContent = user.email ?? "(no email)";
  $("user-uid").textContent = user.uid;
  $("user-provider").textContent =
    user.providerData?.[0]?.providerId ?? "password";
  $("user-avatar").textContent = (user.email ?? "?")[0].toUpperCase();

  // The ID token is an RS256 JWT; its claims show which services this user may reach.
  try {
    const result = await getIdTokenResult(user);
    $("token-claims").textContent = JSON.stringify(result.claims, null, 2);
  } catch (err) {
    $("token-claims").textContent = `could not read token: ${err.message}`;
  }
});

$("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      $("signup-email").value,
      $("signup-password").value
    );
    showMessage(`Account created for ${cred.user.email}`, "ok");
  } catch (err) {
    showMessage(`${err.code ?? "error"}: ${err.message}`);
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
    showMessage(`${err.code ?? "error"}: ${err.message}`);
  }
});

$("google-btn").addEventListener("click", async () => {
  clearMessage();
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    showMessage(`${err.code ?? "error"}: ${err.message}`);
  }
});

$("signout-btn").addEventListener("click", async () => {
  clearMessage();
  await signOut(auth);
});
