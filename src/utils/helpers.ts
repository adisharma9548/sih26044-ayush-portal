export const calculateMatchPercentage = (studentSkills: string[] = [], requiredSkills: string[] = []): number => {
  if (!requiredSkills.length) return 100;
  if (!studentSkills.length) return 50;

  const normalizedStudent = studentSkills.map((s) => s.toLowerCase());
  let matches = 0;

  requiredSkills.forEach((req) => {
    const isPresent = normalizedStudent.some(
      (s) => s.includes(req.toLowerCase()) || req.toLowerCase().includes(s)
    );
    if (isPresent) matches++;
  });

  const percentage = Math.round((matches / requiredSkills.length) * 100);
  return Math.min(98, Math.max(65, percentage)); // realistic realistic score range
};
