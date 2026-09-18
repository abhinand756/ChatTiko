export function getCallType(call, userId) {
  const outgoing = call.callerId === userId;
  switch (call.status) {
    case "missed":
    case "rejected":
    case "canceled":
      return outgoing ? "outgoing-missed" : "incoming-missed";
    default:
      return outgoing ? "outgoing" : "incoming";
  }
}

export function getCallLabel(type) {
  if (type === "outgoing") return "Outgoing";
  if (type === "incoming") return "Incoming";
  return "Missed call";
}