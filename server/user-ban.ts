import type { Firestore } from "firebase-admin/firestore";

/**
 * True if the Firebase user is banned in Firestore (by doc id or legacy firebaseUid field).
 */
export async function isUserBanned(db: Firestore, firebaseUid: string): Promise<boolean> {
  const direct = await db.collection("users").doc(firebaseUid).get();
  if (direct.exists && direct.data()?.banned === true) return true;
  const legacy = await db.collection("users").where("firebaseUid", "==", firebaseUid).limit(10).get();
  return legacy.docs.some((d) => d.data()?.banned === true);
}
