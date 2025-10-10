
import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";
import { mcqQuestions } from "@/server/db";
import { eq, and, sql } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subject, section, limit } = req.query;

  if (!subject || !section) {
    return res.status(400).json({
      success: false,
      message: "Subject and section are required",
    });
  }

  try {
    const questionLimit = limit ? parseInt(limit as string) : 25;

    const questions = await db
      .select()
      .from(mcqQuestions)
      .where(
        and(
          eq(mcqQuestions.subjectCode, subject as string),
          eq(mcqQuestions.sectionCode, section as string)
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(questionLimit);

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
    });
  }
}
