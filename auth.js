import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

export function watchAdminAuth(onSignedIn, onSignedOut) {
  return onAuthStateChanged(auth, user => {
    if (user) {
      onSignedIn(user);
    } else {
      onSignedOut();
    }
  });
}

export async function loginAdmin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutAdmin() {
  return signOut(auth);
}
