export { hubspot } from "./client";
export {
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
  fromContactProperties,
  type HubSpotContactProperties,
  toContactProperties,
} from "./properties";
