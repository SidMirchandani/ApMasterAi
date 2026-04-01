import { storage, WaitlistEntry } from "../storage";

export async function addToWaitlist(email: string): Promise<WaitlistEntry> {
  return storage.addToWaitlist(email);
}

export async function getWaitlistStats() {
  return storage.getWaitlistStats();
}

export async function getWaitlistAdminSummary() {
  return storage.getWaitlistAdminSummary();
}

