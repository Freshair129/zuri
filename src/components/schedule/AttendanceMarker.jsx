'use client';

import { useState } from 'react';
import { QrCode, Check, X, Users } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const STATUS_OPTIONS = ['present', 'absent', 'late'];

const statusColor = { present: 'green', absent: 'red', late: 'yellow' };
const statusIcon = { present: '✓', absent: '✗', late: '~' };

function StudentRow({ student, onStatusChange }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs shrink-0">
        {student.name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
        <p className="text-xs text-gray-500">ID: {student.studentId}</p>
      </div>
      <div className="flex gap-1">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(student.id, status)}
            className={`
              h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold transition-colors
              ${student.attendance === status
                ? `bg-${statusColor[status] === 'green' ? 'green' : statusColor[status] === 'red' ? 'red' : 'yellow'}-500 text-white`
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }
            `}
            title={status}
          >
            {statusIcon[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AttendanceMarker({
  session = null,
  students = [],
  onSave,
}) {
  const [attendance, setAttendance] = useState(() =>
    Object.fromEntries(students.map((s) => [s.id, s.attendance ?? null]))
  );
  const [scanning, setScanning] = useState(false);

  const setStudentStatus = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const markedStudents = students.map((s) => ({ ...s, attendance: attendance[s.id] }));
  const presentCount = Object.values(attendance).filter((v) => v === 'present').length;
  const absentCount = Object.values(attendance).filter((v) => v === 'absent').length;
  const lateCount = Object.values(attendance).filter((v) => v === 'late').length;

  const handleMarkAll = (status) => {
    const updated = {};
    students.forEach((s) => { updated[s.id] = status; });
    setAttendance(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Session info */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{session?.courseName ?? 'Class Session'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {session?.date} · {session?.time} · {session?.room}
            </p>
          </div>
          <Button
            variant={scanning ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => setScanning((v) => !v)}
          >
            <QrCode className="h-4 w-4" />
            {scanning ? 'Stop Scan' : 'QR Scan'}
          </Button>
        </div>

        {/* QR scan placeholder */}
        {scanning && (
          <div className="mt-3 h-36 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300">
            <div className="text-center">
              <QrCode className="h-8 w-8 mx-auto mb-1" />
              <p>Camera feed here</p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex gap-3 mt-3">
          <Badge color="green" dot>{presentCount} Present</Badge>
          <Badge color="red" dot>{absentCount} Absent</Badge>
          <Badge color="yellow" dot>{lateCount} Late</Badge>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Mark all:</span>
        <button onClick={() => handleMarkAll('present')} className="text-xs font-medium text-green-600 hover:underline">Present</button>
        <span className="text-gray-300">·</span>
        <button onClick={() => handleMarkAll('absent')} className="text-xs font-medium text-red-500 hover:underline">Absent</button>
      </div>

      {/* Student list */}
      <div className="px-5 max-h-80 overflow-y-auto">
        {markedStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Users className="h-8 w-8 mb-2" />
            <p className="text-sm">No students enrolled.</p>
          </div>
        ) : (
          markedStudents.map((student) => (
            <StudentRow key={student.id} student={student} onStatusChange={setStudentStatus} />
          ))
        )}
      </div>

      {/* Save */}
      <div className="px-5 py-4 border-t border-gray-200">
        <Button
          className="w-full"
          onClick={() => onSave?.(attendance)}
        >
          Save Attendance
        </Button>
      </div>
    </div>
  );
}
