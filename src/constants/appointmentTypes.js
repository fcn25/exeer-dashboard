/** أنواع المواعيد الشخصية — للسوق السعودي (لا يشمل holiday؛ تُحقَن تلقائياً من النظام). */
export const USER_APPOINTMENT_TYPES = {
  meeting: {
    value: "meeting",
    color: "#6366f1",
    labelKey: "calendar.appointmentTypes.meeting",
  },
  interview: {
    value: "interview",
    color: "#0ea5e9",
    labelKey: "calendar.appointmentTypes.interview",
  },
  leave: {
    value: "leave",
    color: "#10b981",
    labelKey: "calendar.appointmentTypes.leave",
  },
  review: {
    value: "review",
    color: "#8b5cf6",
    labelKey: "calendar.appointmentTypes.review",
  },
  training: {
    value: "training",
    color: "#f59e0b",
    labelKey: "calendar.appointmentTypes.training",
  },
};

export const USER_APPOINTMENT_TYPE_VALUES = Object.keys(USER_APPOINTMENT_TYPES);

export const DEFAULT_APPOINTMENT_TYPE = "meeting";

export function isValidUserAppointmentType(value) {
  return USER_APPOINTMENT_TYPE_VALUES.includes(String(value ?? "").trim());
}

export function resolveAppointmentTypeMeta(type) {
  if (type === "holiday") {
    return {
      value: "holiday",
      color: "#dc2626",
      labelKey: "calendar.appointmentTypes.holiday",
    };
  }
  if (type === "event") {
    return {
      value: "event",
      color: "#3b82f6",
      labelKey: "calendar.types.event",
    };
  }
  return (
    USER_APPOINTMENT_TYPES[type] ?? USER_APPOINTMENT_TYPES[DEFAULT_APPOINTMENT_TYPE]
  );
}
