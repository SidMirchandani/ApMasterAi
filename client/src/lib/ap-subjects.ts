import { getAllSubjects, getLegacyIdForSubjectCode } from '@/subjects';

// Generate apSubjects array from subject registry
export const apSubjects = getAllSubjects().map(subject => {
  // Use legacy ID format for backward compatibility with database
  const legacyId = getLegacyIdForSubjectCode(subject.subjectCode) || subject.subjectCode.toLowerCase();

  return {
    id: legacyId,
    subjectCode: subject.subjectCode, // Include the actual subject code
    name: subject.displayName,
    description: subject.metadata.description,
    units: subject.metadata.units,
    difficulty: subject.metadata.difficulty,
    examDate: subject.metadata.examDate,
  };
});

export const difficultyColors = {
  "Easy": "bg-green-100 text-green-800 border-green-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Hard": "bg-orange-100 text-orange-800 border-orange-200",
  "Very Hard": "bg-red-100 text-red-800 border-red-200"
};