import { createContext, useContext } from 'react';

/** Explicit opt-in, scoped to the tutorial subtree. Never changes a backend client. */
export const StudentDemoContext = createContext(false);
export const useStudentDemo = () => useContext(StudentDemoContext);
