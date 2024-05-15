import { type Metadata } from "next"
import { env } from "~/env"

interface JsonLdParams extends Metadata {
  title: string
  description: string
  urlPath?: string
}

const jsonLd = ({ urlPath, title, description }: JsonLdParams) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": new URL("#organization", env.BASE_URL).toString(),
        name: env.COMPANY_NAME,
        legalName: env.COMPANY_LEGAL_NAME,
        url: new URL(env.BASE_URL).toString(),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer enquiries",
          email: env.CUSTOMER_CONTACT_EMAIL,
        },
        sameAs: ["https://www.linkedin.com/company/rekurve/"],
        logo: {
          "@type": "ImageObject",
          "@id": new URL("#logo", env.BASE_URL).toString(),
          inLanguage: "en-US",
          url: new URL("logo-512x512.png", env.BASE_URL).toString(),
          width: 512,
          height: 512,
          caption: "V2",
        },
        image: {
          "@id": new URL("#logo", env.BASE_URL).toString(),
        },
      },
      {
        "@type": "WebSite",
        "@id": new URL("#website", env.BASE_URL).toString(),
        url: new URL(env.BASE_URL).toString(),
        name: env.COMPANY_NAME,
        inLanguage: "en-US",
        description:
          "Construction management software to stay organized, track progress, costs and payments, and collaborate with your customers.",
        publisher: {
          "@id": new URL("#organization", env.BASE_URL).toString(),
        },
      },
      {
        "@type": "WebPage",
        "@id": new URL(`${urlPath}/#webpage`, env.BASE_URL).toString(),
        url: new URL(urlPath!, env.BASE_URL).toString(),
        name: title,
        isPartOf: {
          "@id": new URL("#webpage", env.BASE_URL).toString(),
        },
        inLanguage: "en-US",
        description,
        potentialAction: [
          {
            "@type": "ReadAction",
            target: [new URL(urlPath!, env.BASE_URL).toString()],
          },
        ],
      },
    ],
  })

export default jsonLd
