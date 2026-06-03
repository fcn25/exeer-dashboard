import SubscriptionPanel from "../subscription/SubscriptionPanel.jsx";
import { CreateSubscriberButton } from "./CreateSubscriberModal.jsx";

export default function SubscriptionSettingsTab() {
  return (
    <SubscriptionPanel
      variant="desktop"
      showCreateSubscriber
      CreateSubscriberButton={CreateSubscriberButton}
    />
  );
}
