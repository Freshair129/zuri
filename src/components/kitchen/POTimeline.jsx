import { CheckCircle, Circle, Clock } from 'lucide-react';

const PO_STAGES = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'ORDERED', label: 'Ordered' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'RECEIVED', label: 'Received' },
];

function getStageIndex(status) {
  return PO_STAGES.findIndex((s) => s.key === status);
}

export default function POTimeline({ po }) {
  const currentIndex = getStageIndex(po?.status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">PO #{po?.poNumber ?? '—'}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{po?.supplier ?? 'Unknown supplier'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">฿{po?.total?.toLocaleString() ?? '—'}</p>
          <p className="text-xs text-gray-500">{po?.date ?? '—'}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
        <div
          className="absolute top-4 left-4 h-0.5 bg-indigo-500 transition-all duration-500"
          style={{
            width: currentIndex <= 0
              ? '0%'
              : `${(currentIndex / (PO_STAGES.length - 1)) * 100}%`,
          }}
        />

        <div className="relative flex justify-between">
          {PO_STAGES.map((stage, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isPending = idx > currentIndex;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-2">
                <div className={`
                  relative z-10 h-8 w-8 rounded-full flex items-center justify-center
                  ${isDone ? 'bg-indigo-600' : isCurrent ? 'bg-indigo-100 ring-2 ring-indigo-600' : 'bg-white border-2 border-gray-300'}
                `}>
                  {isDone ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                </div>
                <span className={`text-[11px] font-medium ${
                  isDone || isCurrent ? 'text-indigo-700' : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
