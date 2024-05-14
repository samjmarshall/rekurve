import { type Metadata } from "next";
import { env } from "~/env";
import openGraph from "~/lib/open-graph";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "By using our services and products, you agree to us collecting, holding, using, and disclosing your Personal Information in accordance with this Policy",
  openGraph: {
    ...openGraph,
    title: "Privacy Policy | rekurve",
    description:
      "By using our services and products, you agree to us collecting, holding, using, and disclosing your Personal Information in accordance with this Policy",
    url: `${env.BASE_URL}/privacy`,
  },
};

export default function Privacy() {
  return (
    <main className="flex-1">
      <h1>MR SAMUEL MARSHALL PRIVACY POLICY</h1>
      <p>
        We are bound by the Privacy Act 1988 (Cth) (<strong>Privacy Act</strong>
        ) and the Australian Privacy Principles (<strong>APPs</strong>). This
        privacy policy (<strong>Policy</strong>) explains how and why we
        collect, use, hold and disclose your Personal Information.
      </p>
      <p>
        <strong>”We”, “us” and “our”</strong> means Mr SAMUEL MARSHALL ABN 24
        219 541 361.
      </p>
      <p>
        By using our services and products, you agree to us collecting, holding,
        using, and disclosing your Personal Information in accordance with this
        Policy. If you have any questions about our Policy or your Personal
        Information, please contact us at legal@rekurve.io.
      </p>
      <p>Last Updated: 14 May 2024</p>
      <h2>What is Personal Information?</h2>
      <p>
        We collect different types of Personal Information for various purposes
        to provide and improve our products and services. The types of Personal
        Information we provide include:
      </p>
      <ol>
        <li>
          <strong>Personal Data</strong> - We collect Personal Information that
          you voluntarily provide us, such as your name, email address, phone
          number, and other contact information.{" "}
        </li>
        <li>
          <strong>Usage Data</strong>- We may collect information about how you
          access, use and interact with the website. We do this by using a range
          of tools such as Google Analytics and AdWords and Salesforce (Sales
          Cloud and Marketing Cloud). This information may include:
          <ol>
            <li>
              the location from which you have come to the site and the pages
              you have visited as well as collateral downloaded;
            </li>
            <li>
              technical data, which may include IP address, the types of devices
              you are using to access the website, device attributes, browser
              type, language and operating system; and
            </li>
          </ol>
        </li>
        <li>
          <strong>Tracking and Cookies Data</strong> - We use cookies on the
          website. A cookie is a small text file that the website may place on
          your device to store information. We may use persistent cookies (which
          remain on your computer even after you close your browser) to store
          information that may speed up your use of our website for any of your
          future visits to the website. We may also use session cookies (which
          no longer remain after you end your browsing session) to help manage
          the display and presentation of information on the website. You may
          refuse to use cookies by selecting the appropriate settings on your
          browser. However, please note that if you do this, you may not be able
          to use the full functionality of the website.
        </li>
      </ol>
    </main>
  );
}
