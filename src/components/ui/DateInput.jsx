import { useId } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { arSA } from "date-fns/locale";
import { format, isValid, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";

registerLocale("ar-SA", arSA);

function parseDateString(value, pattern) {
  if (!value) return null;
  const parsed = parse(value, pattern, new Date());
  return isValid(parsed) ? parsed : null;
}

function emitChange(onChange, value) {
  if (typeof onChange === "function") {
    onChange({ target: { value } });
  }
}

const pickerClass = "md-input exeer-datepicker-input w-full";

export function DateInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
  min,
  max,
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const selected = parseDateString(value, "yyyy-MM-dd");
  const minDate = min ? parseDateString(min, "yyyy-MM-dd") : undefined;
  const maxDate = max ? parseDateString(max, "yyyy-MM-dd") : undefined;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className="md-label mb-2 block">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      <DatePicker
        id={inputId}
        selected={selected}
        onChange={(date) =>
          emitChange(onChange, date ? format(date, "yyyy-MM-dd") : "")
        }
        dateFormat="dd/MM/yyyy"
        locale="ar-SA"
        placeholderText="اختر التاريخ"
        disabled={disabled}
        required={required}
        minDate={minDate}
        maxDate={maxDate}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        calendarClassName="exeer-datepicker-calendar"
        wrapperClassName="exeer-datepicker-wrapper w-full"
        className={pickerClass}
        autoComplete="off"
      />
    </div>
  );
}

export function DateTimeInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const selected = value
    ? parseDateString(value.slice(0, 16), "yyyy-MM-dd'T'HH:mm")
    : null;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className="md-label mb-2 block">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      <DatePicker
        id={inputId}
        selected={selected}
        onChange={(date) =>
          emitChange(
            onChange,
            date ? format(date, "yyyy-MM-dd'T'HH:mm") : "",
          )
        }
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd/MM/yyyy HH:mm"
        locale="ar-SA"
        placeholderText="اختر التاريخ والوقت"
        disabled={disabled}
        required={required}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        calendarClassName="exeer-datepicker-calendar"
        wrapperClassName="exeer-datepicker-wrapper w-full"
        className={pickerClass}
        autoComplete="off"
      />
    </div>
  );
}

export function MonthInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const selected = value
    ? parseDateString(`${value}-01`, "yyyy-MM-dd")
    : null;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className="md-label mb-2 block">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      <DatePicker
        id={inputId}
        selected={selected}
        onChange={(date) =>
          emitChange(onChange, date ? format(date, "yyyy-MM") : "")
        }
        showMonthYearPicker
        dateFormat="MM/yyyy"
        locale="ar-SA"
        placeholderText="اختر الشهر"
        disabled={disabled}
        required={required}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        calendarClassName="exeer-datepicker-calendar"
        wrapperClassName="exeer-datepicker-wrapper w-full"
        className={pickerClass}
        autoComplete="off"
      />
    </div>
  );
}
