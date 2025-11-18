
import type { NextApiRequest, NextApiResponse } from "next";
import { storage } from "../../../server/storage";
import { getDb } from "../../../server/db";

// Mapping of old unit IDs to new section codes
const unitMappings: { [subjectId: string]: { [oldKey: string]: string } } = {
  "computer-science-principles": {
    "bigidea1": "CRD",
    "bigidea2": "DAT",
    "bigidea3": "AAP",
    "bigidea4": "CSN",
    "bigidea5": "IOC",
  },
  "macroeconomics": {
    "unit1": "BEC",
    "unit2": "EIBC",
    "unit3": "NIPD",
    "unit4": "FS",
    "unit5": "LRCSP",
    "unit6": "OEITF",
  },
  "microeconomics": {
    "unit1": "BEC",
    "unit2": "SD",
    "unit3": "PC",
    "unit4": "IMP",
    "unit5": "FM",
    "unit6": "MF",
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const subjectsSnapshot = await db.collection("user_subjects").get();
    let migratedCount = 0;

    for (const doc of subjectsSnapshot.docs) {
      const data = doc.data();
      const subjectId = data.subjectId;
      const unitProgress = data.unitProgress || {};
      
      const mapping = unitMappings[subjectId];
      if (!mapping) {
        console.log(`No mapping for subject: ${subjectId}`);
        continue;
      }

      let hasChanges = false;
      const newUnitProgress = { ...unitProgress };

      // Migrate old keys to new keys
      for (const [oldKey, newKey] of Object.entries(mapping)) {
        if (unitProgress[oldKey] && !unitProgress[newKey]) {
          newUnitProgress[newKey] = unitProgress[oldKey];
          delete newUnitProgress[oldKey];
          hasChanges = true;
          console.log(`Migrated ${subjectId}: ${oldKey} -> ${newKey}`);
        }
      }

      if (hasChanges) {
        await doc.ref.update({ unitProgress: newUnitProgress });
        migratedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Migrated ${migratedCount} subjects`,
      migratedCount,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return res.status(500).json({ error: "Migration failed" });
  }
}
