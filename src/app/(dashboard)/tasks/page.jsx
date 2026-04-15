'use client';

// Tasks — Task board page
// Kanban-style board supporting three task types:
//   SINGLE  — one-off standalone task
//   RANGE   — task with a start and end date (multi-day)
//   PROJECT — grouped tasks under a project umbrella with sub-tasks

import { useState, useEffect } from 'react';
import { X, Plus, Calendar, Flag } from 'lucide-react';

const COLUMNS = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'];
const COLUMN_LABELS = { PENDING: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', COMPLETED: 'Done' };

const TASK_TYPE_COLORS = {
  SINGLE: 'bg-blue-100 text-blue-700',
  RANGE: 'bg-purple-100 text-purple-700',
  PROJECT: 'bg-orange-100 text-orange-700',
};

const PRIORITY_COLORS = {
  L1: 'bg-red-500',
  L2: 'bg-orange-400',
  L3: 'bg-yellow-400',
  L4: 'bg-gray-300',
};

const PRIORITY_LABELS = { L1: 'Urgent', L2: 'High', L3: 'Medium', L4: 'Low' };

// ─── New Task Modal ───────────────────────────────────────────────────────────
function NewTaskModal({ initialStatus = 'PENDING', onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    taskType: 'SINGLE',
    status: initialStatus,
    priority: 'L3',
    dueDate: '',
    startDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('กรุณาใส่ชื่องาน'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       form.title.trim(),
          description: form.description.trim() || undefined,
          taskType:    form.taskType,
          status:      form.status,
          priority:    form.priority,
          dueDate:     form.dueDate   || undefined,
          startDate:   form.startDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'สร้าง task ไม่ได้');
      onCreated(json.data);
      onClose();
    } catch (err) {
      console.error('[TasksPage] create task', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">+ New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่องาน *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="เช่น เตรียมเอกสารสำหรับคลาส..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              autoFocus
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภท</label>
              <select
                value={form.taskType}
                onChange={e => set('taskType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              >
                <option value="SINGLE">Single</option>
                <option value="RANGE">Range</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              {COLUMNS.map(c => <option key={c} value={c}>{COLUMN_LABELS[c]}</option>)}
            </select>
          </div>

          {/* Dates */}
          {form.taskType === 'RANGE' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียด</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-colors shadow-md shadow-orange-100">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [view, setView] = useState('Board');
  const [typeFilter, setTypeFilter] = useState('All');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState('PENDING');

  useEffect(() => { fetchTasks(); }, [typeFilter]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      if (typeFilter !== 'All') url.searchParams.set('taskType', typeFilter);
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data || []);
      }
    } catch (error) {
      console.error('[TasksPage] fetchTasks', error);
    } finally {
      setLoading(false);
    }
  }

  function openNewTask(status = 'PENDING') {
    setModalStatus(status);
    setShowModal(true);
  }

  function handleCreated(newTask) {
    setTasks(prev => [newTask, ...prev]);
  }

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage one-off tasks, date ranges, and projects</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {['Board', 'List', 'Timeline'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNewTask('PENDING')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md shadow-orange-100"
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {['All', 'SINGLE', 'RANGE', 'PROJECT'].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === t ? 'bg-orange-500 text-white'
                  : t in TASK_TYPE_COLORS ? `${TASK_TYPE_COLORS[t]} hover:opacity-80`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Board view */}
      {view === 'Board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter(t => t.status === col);
            return (
              <div key={col} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">{COLUMN_LABELS[col]}</h3>
                    <span className="h-5 min-w-[20px] px-1.5 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-500 font-medium">
                      {colTasks.length}
                    </span>
                  </div>
                  <button onClick={() => openNewTask(col)}
                    className="h-6 w-6 bg-gray-100 rounded hover:bg-orange-100 hover:text-orange-500 cursor-pointer flex items-center justify-center transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <div className="text-sm text-gray-400 p-2">Loading...</div>
                  ) : colTasks.map((task) => {
                    const taskType = task.taskType || 'SINGLE';
                    return (
                      <div key={task.id}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TASK_TYPE_COLORS[taskType] || 'bg-gray-100 text-gray-600'}`}>
                            {taskType}
                          </span>
                          <div className={`h-4 w-4 rounded ${PRIORITY_COLORS[task.priority] || 'bg-gray-200'}`} title={PRIORITY_LABELS[task.priority]} />
                        </div>
                        <div className="text-sm font-medium text-gray-800 leading-snug">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">{task.description}</div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                          <div className="h-6 w-6 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[10px] text-orange-600 font-bold">Z</div>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => openNewTask(col)}
                    className="w-full h-10 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === 'List' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Task</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-3">Status</div>
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">ยังไม่มี task</p>
              <button onClick={() => openNewTask()} className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors">
                + New Task
              </button>
            </div>
          ) : tasks.map((task) => {
            const taskType = task.taskType || 'SINGLE';
            return (
              <div key={task.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-50 hover:bg-orange-50/20 items-center">
                <div className="col-span-4 text-sm font-medium text-gray-800">{task.title}</div>
                <div className="col-span-1">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${TASK_TYPE_COLORS[taskType] || 'bg-gray-100 text-gray-600'}`}>{taskType}</span>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-gray-200'}`} />
                    <span className="text-xs text-gray-600">{PRIORITY_LABELS[task.priority] || task.priority}</span>
                  </div>
                </div>
                <div className="col-span-2 text-xs text-gray-600">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                </div>
                <div className="col-span-3">
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {COLUMN_LABELS[task.status] || task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline view */}
      {view === 'Timeline' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Calendar className="h-12 w-12 text-orange-200 mx-auto" />
            <p className="text-sm font-medium text-gray-600">Timeline view</p>
            <p className="text-xs text-gray-400">Coming soon — Gantt chart for RANGE and PROJECT tasks</p>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <NewTaskModal
          initialStatus={modalStatus}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
