import Link from "next/link"
import Script from "next/script"
import { env } from "~/env"
import jsonLd from "~/lib/json-ld"
import openGraph from "~/lib/open-graph"

export const metadata = {
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
}

export default function Privacy() {
  return (
    <main className="w-screen flex-1 justify-center">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            urlPath: "privacy",
            title: metadata.title,
            description: metadata.description,
          }),
        }}
      />

      <article className="mx-auto max-w-6xl space-y-4 p-6 text-gray-800">
        <h1 className="text-2xl">
          <b>MR SAMUEL MARSHALL PRIVACY POLICY</b>
        </h1>
        <p>
          We are bound by the <i>Privacy Act 1988 </i>(Cth) (<b>Privacy Act</b>)
          and the Australian Privacy Principles (<b>APPs</b>). This privacy
          policy (<b>Policy</b>) explains how and why we collect, use, hold and
          disclose your Personal Information.
        </p>
        <p>
          <b>”We”, “us” and “our”</b> means REKURVE ABN 24 219 541 361.
        </p>
        <p>
          By using our services and products, you agree to us collecting,
          holding, using, and disclosing your Personal Information in accordance
          with this Policy. If you have any questions about our Policy or your
          Personal Information, please contact us at{" "}
          <Link
            className="underline-offset-4 hover:underline"
            href={`mailto:${env.CUSTOMER_CONTACT_EMAIL}`}
            title="Customer Contact Email"
          >
            {env.CUSTOMER_CONTACT_EMAIL}
          </Link>
          .
        </p>
        <p>Last Updated: 21 May 2024</p>
        <h2>
          <b>What is Personal Information?</b>
        </h2>
        <p>
          Personal information is any information or an opinion about an
          identified individual or an individual who can be reasonably
          identified from the information or opinion (
          <b>Personal Information</b>). Information or an opinion may be
          Personal Information regardless of whether it is true.
        </p>
        <h2>
          <b>What Personal Information do we collect and hold?&nbsp;</b>
        </h2>
        <p>
          We collect different types of Personal Information for various
          purposes to provide and improve our products and services. The types
          of Personal Information we provide include:
        </p>
        <ol className="list-decimal space-y-4">
          <li className="ml-6">
            <b>Personal Data</b> - We collect Personal Information that you
            voluntarily provide us, such as your name, email address, phone
            number, and other contact information.&nbsp;
          </li>
          <li className="ml-6 space-y-2">
            <b>Usage Data</b> - We may collect information about how you access,
            use and interact with the website. We do this by using a range of
            tools such as Google Analytics and AdWords. This information may
            include:
            <ol className="list-disc space-y-2">
              <li className="ml-6">
                the location from which you have come to the site and the pages
                you have visited as well as collateral downloaded;&nbsp;
              </li>
              <li className="ml-6">
                technical data, which may include IP address, the types of
                devices you are using to access the website, device attributes,
                browser type, language and operating system; and
              </li>
            </ol>
          </li>
          <li className="ml-6">
            <b>Tracking and Cookies Data</b> - We use cookies on the website. A
            cookie is a small text file that the website may place on your
            device to store information. We may use persistent cookies (which
            remain on your computer even after you close your browser) to store
            information that may speed up your use of our website for any of
            your future visits to the website. We may also use session cookies
            (which no longer remain after you end your browsing session) to help
            manage the display and presentation of information on the website.
            You may refuse to use cookies by selecting the appropriate settings
            on your browser. However, please note that if you do this, you may
            not be able to use the full functionality of the website.
          </li>
        </ol>
        <h2>
          <b>
            Why do we collect, hold and use your Personal
            Information?&nbsp;&nbsp;
          </b>
        </h2>
        <p>
          &nbsp;We collect, hold and use your Personal Information so that we
          can:
        </p>
        <ol>
          <li>
            <p>
              provide you with products and services, and manage our
              relationship with you;
            </p>
          </li>
          <li>
            <p>
              contact you, for example, to respond to your queries or
              complaints, or if we need to tell you something important;
            </p>
          </li>
          <li>
            <p>
              comply with our legal obligations and assist government and law
              enforcement agencies or regulators; or
            </p>
          </li>
          <li>
            <p>
              identify and tell you about other products or services that we
              think may be of interest to you.
            </p>
          </li>
        </ol>
        <p>
          If you do not provide us with your Personal Information, we may not be
          able to provide you with our services, communicate with you or respond
          to your enquiries.
        </p>
        <h2>
          <b>How do we collect your Personal Information?&nbsp;&nbsp;</b>
        </h2>
        <p>
          We will collect your Personal Information directly from you whenever
          you interact with us.
        </p>
        <p>We may collect information from third parties such as:</p>
        <ol>
          <li>
            <p>
              our partners or other third parties we deal with in providing our
              services and products;&nbsp;
            </p>
          </li>
        </ol>
        <h2>
          <b>How do we store and hold Personal Information?&nbsp;&nbsp;</b>
        </h2>
        <p>
          We store most information about you in computer systems and databases
          operated by either us or our external service providers.
        </p>
        <p>
          We implement and maintain processes and security measures to protect
          Personal Information which we hold from misuse, interference or loss,
          and from unauthorised access, modification or disclosure.
        </p>
        <p>These processes and systems include:</p>
        <ol>
          <li>
            <p>
              the use of identity and access management technologies to control
              access to systems on which information is processed and stored;
            </p>
          </li>
          <li>
            <p>
              requiring all employees to comply with internal information
              security policies and keep information secure; and
            </p>
          </li>
          <li>
            <p>
              monitoring and regularly reviewing our practice against our own
              policies and against industry best practice.
            </p>
          </li>
        </ol>
        <p>
          We will also take reasonable steps to destroy or de-identify Personal
          Information once we no longer require it for the purposes for which it
          was collected or for any secondary purpose permitted under the APPs.
        </p>
        <h2>
          <b>
            Who do we disclose your Personal Information to, and
            why?&nbsp;&nbsp;
          </b>
        </h2>
        <p>
          We may transfer or disclose your Personal Information to our related
          companies.
        </p>
        <p>
          We may disclose your Personal Information to third parties in
          accordance with this Policy in circumstances where you would
          reasonably expect us to disclose your information. For example, we may
          disclose your Personal Information to:&nbsp;
        </p>
        <ol>
          <li>
            <p>
              our third party service providers (for example, our IT providers)
              for the purposes of enabling them to provide their services for us
              or on our behalf;
            </p>
          </li>
          <li>
            <p>
              third party agents or sub-contractors who assist us in providing
              information, products, services or direct marketing to you;&nbsp;
            </p>
          </li>
          <li>
            <p>
              suppliers or other third parties with whom we have commercial
              relationships, for business, marketing, and related
              purposes;&nbsp;
            </p>
          </li>
          <li>
            <p>
              third parties to collect and process data, such as Google
              Analytics and AdWords;
            </p>
          </li>
          <li>
            <p>our marketing providers; and</p>
          </li>
          <li>
            <p>our professional services advisors.</p>
          </li>
        </ol>
        <p>
          We may disclose your Personal Information to recipients which are
          located outside of Australia for some of these purposes, including in
          the Unites States of America &amp; Japan. Where we disclose Personal
          Information to third parties overseas, we will take reasonable steps
          to ensure that data security and appropriate privacy practices are
          maintained.
        </p>
        <p>We may also disclose your Personal Information to others where:</p>
        <ol>
          <li>
            <p>we are required or authorised by law to do so;</p>
          </li>
          <li>
            <p>
              you may have expressly consented to the disclosure or the consent
              may be reasonably inferred from the circumstances; or
            </p>
          </li>
          <li>
            <p>
              we are otherwise permitted to disclose the information under the
              Privacy Act.
            </p>
          </li>
        </ol>
        <p>
          If the ownership or control of all or part of our business changes, we
          may transfer your Personal Information to the new owner.
        </p>
        <h2>
          <b>Do we use your Personal Information for marketing?&nbsp;&nbsp;</b>
        </h2>
        <p>
          We will use your Personal Information to offer you products and
          services we believe may interest you, but we will not do so if you
          tell us not to. These products and services may be offered by us, our
          related companies, our other business partners or our service
          providers.
        </p>
        <p>
          Where you receive electronic marketing communications from us, you may
          opt out of receiving further marketing communications by following the
          opt-out instructions provided in the communication.
        </p>
        <h2>
          <b>
            Access to and correction of your Personal Information&nbsp;&nbsp;
          </b>
        </h2>
        <p>
          You may access or request correction of the Personal Information that
          we hold about you by contacting us. Our contact details are set out
          below. There are some circumstances in which we are not required to
          give you access to your Personal Information.
        </p>
        <p>
          There is no charge for requesting access to your Personal Information,
          but we may require you to meet our reasonable costs in providing you
          with access (such as photocopying costs or costs for time spent on
          collating large amounts of material).
        </p>
        <p>
          We will respond to your requests to access or correct Personal
          Information in a reasonable time and will take all reasonable steps to
          ensure that the Personal Information we hold about you remains
          accurate and up to date.
        </p>
        <h2>
          <b>Your rights under the EU GDPR</b>
        </h2>
        <p>
          Under the European Union (<b>EU</b>) General Data Protection
          Regulation (<b>GDPR</b>), as a data subject you have the right to:
        </p>
        <ol>
          <li>
            <p>access your data;</p>
          </li>
          <li>
            <p>have your data deleted or corrected where it is inaccurate;</p>
          </li>
          <li>
            <p>
              object to your data being processed and to restrict processing;
            </p>
          </li>
          <li>
            <p>withdraw consent to having your data processed;</p>
          </li>
          <li>
            <p>
              have your data provided in a standard format so that it can be
              transferred elsewhere; and
            </p>
          </li>
          <li>
            <p>
              not be subject to a decision based solely on automated processing.
            </p>
          </li>
        </ol>
        <h3>
          (<b>Data Subject Rights</b>)
        </h3>
        <p>
          We have processes in place to deal with Data Subject Rights requests.
          Our actions and responsibilities will depend on whether we are the
          controller or processer of the personal data at issue. Depending on
          our role as either a controller or processor, the process for enabling
          Data Subject Rights may differ, and are always subject to applicable
          law. Please refer to the Contact Details section of this Policy if you
          would like to make a Data Subject Rights request <b>OR</b> have a
          specific need for assistance with a Data Subject Rights request.
        </p>
        <h2>
          <b>Links to third party sites</b>
        </h2>
        <p>
          Our website may contain links to websites operated by third parties.
          If you access a third party website through our website, Personal
          Information may be collected by that third party website. Links to
          third party websites do not constitute endorsement, sponsorship, or
          approval of these websites.&nbsp;
        </p>
        <p>
          We make no representations or warranties in relation to the privacy
          practices of any third party website and we are not responsible for
          the privacy policies or the content of any third party website. Third
          party websites are responsible for informing you about their own
          privacy practices. We recommend that you examine each website’s
          privacy policy.
        </p>
        <h2>
          <b>Complaints</b>
        </h2>
        <p>
          If you have a complaint about the way in which we have handled any
          privacy issue, including your request for access or correction of your
          Personal Information, you should contact us. Our contact details are
          set out below.
        </p>
        <p>
          We will consider your complaint and determine whether it requires
          further investigation. We will notify you of the outcome of this
          investigation and any subsequent internal investigation.
        </p>
        <p>
          If you remain unsatisfied with the way in which we have handled a
          privacy issue, you may approach an independent advisor or contact the
          Office of the Australian Information Commissioner (<b>OAIC</b>)
          (www.oaic.gov.au) for guidance on alternative courses of action which
          may be available.
        </p>
        <h2>
          <b>Contact Details</b>
        </h2>
        <p>
          If you have any questions, comments, requests or concerns, please
          contact us at:
        </p>
        <p>
          <Link
            className="underline-offset-4 hover:underline"
            href={`mailto:${env.CUSTOMER_CONTACT_EMAIL}`}
            title="Customer Contact Email"
          >
            {env.CUSTOMER_CONTACT_EMAIL}
          </Link>
        </p>
        <h2>
          <b>Changes to the Policy</b>
        </h2>
        <p>
          From time to time, we may change our Policy on how we handle Personal
          Information or the types of Personal Information which we hold. Any
          changes to our Policy will be published on our website.
        </p>
        <p>
          You may obtain a copy of our current Policy from our website or by
          contacting us at the contact details above.
        </p>
      </article>
    </main>
  )
}
