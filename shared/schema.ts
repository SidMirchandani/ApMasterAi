import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const waitlistEmails = pgTable("waitlist_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  signedUpAt: timestamp("signed_up_at").defaultNow().notNull(),
});

export const userSubjects = pgTable("user_subjects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subjectId: text("subject_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  units: integer("units").notNull(),
  difficulty: text("difficulty").notNull(),
  examDate: text("exam_date").notNull(),
  progress: integer("progress").default(0).notNull(),
  masteryLevel: integer("mastery_level").default(4).notNull(), // AP test goal: 3, 4, or 5
  lastStudied: timestamp("last_studied"),
  dateAdded: timestamp("date_added").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWaitlistEmailSchema = createInsertSchema(waitlistEmails).pick({
  email: true,
});

export const insertUserSubjectSchema = createInsertSchema(userSubjects).omit({
  id: true,
  dateAdded: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWaitlistEmail = z.infer<typeof insertWaitlistEmailSchema>;
export type WaitlistEmail = typeof waitlistEmails.$inferSelect;
export type InsertUserSubject = z.infer<typeof insertUserSubjectSchema>;
export type UserSubject = typeof userSubjects.$inferSelect;
