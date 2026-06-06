import { Pencil, Plus } from "lucide-react";

export default function BranchLocationsTable({
  branches,
  isLoading,
  onAdd,
  onEdit,
}) {
  return (
    <section className="md-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-exeer-border px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-exeer-primary">مواقع العمل المحفوظة</h2>
          <p className="mt-0.5 text-xs text-exeer-muted">
            الفروع المعرّفة للتحقق الجغرافي من البصمة
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="md-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" aria-hidden />
          إضافة موقع
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-exeer-border bg-exeer-surface">
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">الفرع</th>
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">خط العرض</th>
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">خط الطول</th>
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">نصف القطر</th>
              <th className="px-5 py-3 text-start font-semibold text-exeer-primary">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-exeer-muted">
                  جاري التحميل...
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-exeer-muted">
                  لا توجد مواقع محفوظة. أضف موقع عمل جديد.
                </td>
              </tr>
            ) : (
              branches.map((branch) => (
                <tr
                  key={branch.id}
                  className="border-b border-exeer-border last:border-b-0 hover:bg-exeer-surface/60"
                >
                  <td className="px-5 py-3.5 font-medium text-exeer-primary">
                    {branch.name}
                  </td>
                  <td className="px-5 py-3.5 text-exeer-muted">
                    {branch.latitude.toFixed(5)}
                  </td>
                  <td className="px-5 py-3.5 text-exeer-muted">
                    {branch.longitude.toFixed(5)}
                  </td>
                  <td className="px-5 py-3.5 text-exeer-muted">
                    {branch.radiusMeters} م
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => onEdit(branch.id)}
                      className="md-btn-tonal inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      تعديل
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
