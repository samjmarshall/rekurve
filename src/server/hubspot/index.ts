export { hubspot } from "./client";
export {
  type ContactData,
  createContact,
  findExistingContact,
  getContact,
  type HubSpotContact,
  searchContacts,
  updateContact,
} from "./contacts";
export {
  type EmailEngagement,
  findContactIdForEmail,
  getEmailEngagement,
} from "./emails";
export {
  ALL_PROPERTIES,
  coerceFromHubSpot,
  fromHubSpotProperties,
  PROPERTY_MAP,
  toAppField,
  toHubSpotProperties,
} from "./properties";
