'use client';

import { School, User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import type { Student } from '@/components/student-management';

// Mock data, should be the same as in teacher's page for consistency
const students: Student[] = [
  { id: 1, name: '01王大明' },
  { id: 2, name: '02李小花' },
  { id: 3, name: '03張三' },
  { id: 4, name: '04陳四' },
  { id: 5, name: '05林美麗' },
];

export default function JoinPage() {
  const handleStudentClick = (student: Student) => {
    const url = `/classroom/${encodeURIComponent(student.name)}`;
    // Use window.location.href for robust navigation when router.push fails.
    window.location.href = url;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <School className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>加入教室</CardTitle>
          <CardDescription>
            請從下方列表選擇你的名字登入。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableBody>
                {students.map((student) => (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleStudentClick(student)}
                  >
                    <TableCell className="flex items-center gap-4 p-4">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{student.name}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
