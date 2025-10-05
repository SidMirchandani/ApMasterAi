
import { readFileSync } from "fs";
import path from "path";
import { getFirebaseAdmin } from "../server/firebase-admin";

async function uploadQuestions() {
  // path to your JSON file
  const filePath = path.resolve("./questions.json");
  const data = JSON.parse(readFileSync(filePath, "utf8"));

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error("Firebase Admin not initialized");
  }

  const { firestore } = firebaseAdmin;
  const col = firestore.collection("questions");

  console.log(`Uploading ${data.length} questions...`);

  const batch = firestore.batch();
  for (const q of data) {
    const ref = col.doc();
    batch.set(ref, {
      prompt: q.prompt,
      choices: q.choices,
      answerIndex: q.answerIndex,
      explanation: q.explanation ?? "",
      rand: Math.random(),
      createdAt: new Date(),
    });
  }

  await batch.commit();
  console.log("✅ Upload complete!");
}

uploadQuestions().catch((err) => {
  console.error("❌ Upload failed:", err);
  process.exit(1);
});
