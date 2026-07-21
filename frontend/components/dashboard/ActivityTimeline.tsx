// frontend/components/dashboard/ActivityTimeline.tsx

'use client';

interface Activity {
  id: number;
  type:
    | 'OCR'
    | 'CUSTOMER'
    | 'VEHICLE'
    | 'LOGIN';
  title: string;
  description: string;
  createdAt: string;
}

interface Props {
  activities: Activity[];
}

const icon = {
  OCR: '📷',
  CUSTOMER: '👤',
  VEHICLE: '🚗',
  LOGIN: '🔑',
};

export default function ActivityTimeline({
  activities,
}: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-md">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          最近の操作履歴
        </h2>

      </div>

      {activities.length === 0 && (

        <div className="p-8 text-center text-gray-500">

          履歴はありません

        </div>

      )}

      <div className="divide-y">

        {activities.map((activity) => (

          <div
            key={activity.id}
            className="flex gap-4 p-5"
          >

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">

              {icon[activity.type]}

            </div>

            <div className="flex-1">

              <div className="font-bold">

                {activity.title}

              </div>

              <div className="text-sm text-gray-500 mt-1">

                {activity.description}

              </div>

            </div>

            <div className="text-sm text-gray-400 whitespace-nowrap">

              {new Date(
                activity.createdAt,
              ).toLocaleString('ja-JP')}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}