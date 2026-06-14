import SubscriptionPanel from "../subscription/SubscriptionPanel.jsx";
import { CreateSubscriberButton } from "./CreateSubscriberModal.jsx";
import { canShowBilling } from "../../lib/platform.ts";

export default function SubscriptionSettingsTab() {
  if (!canShowBilling()) return null;

  return (
    <SubscriptionPanel
      variant="desktop"
      showCreateSubscriber
      CreateSubscriberButton={CreateSubscriberButton}
    />
  );
}
