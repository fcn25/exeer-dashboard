import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DateTimeInput } from "../ui/DateInput.jsx";

export default function CreateEventModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setDescription("");
    setDatetime("");
    setLocation("");
    setError("");
    setIsSaving(false);
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !datetime || !location.trim()) {
      setError("يرجى تعبئة اسم الفعالية والتاريخ والموقع.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onCreated({
        name: name.trim(),
        description: description.trim(),
        datetime,
        location: location.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر حفظ الفعالية.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
    >
      <div className="md-surface relative w-full max-w-lg p-6 md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 start-4 flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2
          id="create-event-title"
          className="mb-6 px-10 text-center text-xl font-bold text-exeer-primary"
        >
          إنشاء فعالية جديدة
        </h2>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="event-name" className="md-label mb-2 block">
              اسم الفعالية <span className="text-red-500">*</span>
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="md-input"
              placeholder="مثال: لقاء الموظفين"
            />
          </div>

          <div>
            <label htmlFor="event-description" className="md-label mb-2 block">
              الوصف
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isSaving}
              className="md-input resize-none"
              placeholder="تفاصيل الفعالية..."
            />
          </div>

          <div>
            <label htmlFor="event-location" className="md-label mb-2 block">
              الموقع <span className="text-red-500">*</span>
            </label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSaving}
              className="md-input"
              placeholder="مثال: قاعة المؤتمرات"
            />
          </div>

          <DateTimeInput
            id="event-datetime"
            label="تاريخ ووقت الفعالية"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            disabled={isSaving}
            required
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || !name.trim() || !datetime || !location.trim()}
            className="md-btn-primary w-full"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ الفعالية"}
          </button>
        </form>
      </div>
    </div>
  );
}
