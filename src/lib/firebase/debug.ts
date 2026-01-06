
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export function logFirebaseContext() {
  const app = getApp();
  const auth = getAuth();

  console.log("[Firebase] projectId:", app.options.projectId);
  console.log("[Firebase] appId:", app.options.appId);

  const user = auth.currentUser;
  console.log("[Firebase] currentUser:", user ? { uid: user.uid, email: user.email } : null);
}
