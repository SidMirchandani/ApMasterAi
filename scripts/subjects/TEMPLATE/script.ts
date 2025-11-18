
import { getKeywords } from "./keywords";
import { getSections } from "./sections";
import { transformCrackAP } from "./transform";

export const subjectCode = "TEMPLATE";

export function getKeywordsWrapper() {
  return getKeywords();
}

export function getSectionsWrapper() {
  return getSections();
}

export function transformCrackAPWrapper(html: string) {
  return transformCrackAP(html);
}

export default {
  subjectCode,
  getKeywords: getKeywordsWrapper,
  getSections: getSectionsWrapper,
  transformCrackAP: transformCrackAPWrapper,
};
