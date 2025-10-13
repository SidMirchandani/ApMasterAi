
# Firebase Data Layout

## Collections Structure

### 1. `user_subjects` Collection
This is the main collection for storing user progress and test results.

**Document Structure:**
```
user_subjects/
  └── {documentId}/                    # Auto-generated document ID
      ├── userId: string               # Firebase Auth UID
      ├── subjectId: string            # Subject identifier (e.g., "macroeconomics")
      ├── enrolledAt: timestamp
      ├── lastStudied: timestamp
      ├── unitProgress: object         # Progress for each unit
      │   ├── full-length: object
      │   │   ├── mcqScore: number
      │   │   ├── lastUpdated: timestamp
      │   │   └── history: array       # Array of test attempts
      │   │       └── [{
      │   │           id: string,
      │   │           date: timestamp,
      │   │           score: number,
      │   │           percentage: number,
      │   │           totalQuestions: number
      │   │         }]
      │   ├── unit-1: object
      │   │   ├── mcqScore: number
      │   │   ├── frqScore: number
      │   │   └── lastUpdated: timestamp
      │   └── ... (other units)
      └── fullLengthTests/              # Subcollection for detailed test data
          └── {testId}/                 # Document per test (e.g., "test_1760238157519")
              ├── id: string
              ├── date: timestamp
              ├── score: number
              ├── percentage: number
              ├── totalQuestions: number
              ├── questions: array      # All questions with answers
              │   └── [{
              │       id: string,
              │       prompt: string,
              │       choices: string[],
              │       answerIndex: number,
              │       explanation: string,
              │       section_code: string    # e.g., "BEC", "FS", "MP"
              │     }]
              ├── userAnswers: object   # User's answers indexed by question number
              │   └── { "0": "A", "1": "B", ... }
              └── sectionBreakdown: object
                  ├── BEC: {
                  │   unitNumber: number,
                  │   name: string,
                  │   correct: number,
                  │   total: number,
                  │   percentage: number
                  │ }
                  └── ... (other sections)
```

## How Section Review Works

### Whole Test Review (`section=all`)
1. Fetches entire test document from `fullLengthTests/{testId}`
2. Shows all questions with all answers
3. Path: `/api/user/subjects/{subjectId}/test-results/{testId}`

### Section Review (`section=BEC`, `section=FS`, etc.)
1. Fetches entire test document from `fullLengthTests/{testId}`
2. Filters questions where `question.section_code === sectionCode`
3. Maps user answers to match filtered question indices
4. Path: `/api/user/subjects/{subjectId}/test-results/{testId}/section/{sectionCode}`

### Current Test Review (during quiz)
1. Passes data via URL query params (no Firebase fetch)
2. Data includes filtered questions and answers for the section
3. Used when reviewing during an active quiz session

## Key Points

- **user_subjects** stores overall progress and test history summary
- **fullLengthTests** subcollection stores complete test details
- Questions have `section_code` to identify which unit they belong to
- User answers are indexed by question position in the full test
- Section review filters both questions AND remaps answer indices
