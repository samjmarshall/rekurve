import { env } from "~/env"

interface JsonLdParams {
  description: string
}

const jsonLd = ({ description }: JsonLdParams) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": new URL("#website", env.BASE_URL).toString(),
        url: new URL(env.BASE_URL).toString(),
        name: env.COMPANY_NAME,
        about: {
          "@type": "WebApplication",
          "@id": new URL("#webapplication", env.BASE_URL).toString(),
          name: "rekurve",
          applicationCategory: "BusinessApplication",
          // aggregateRating: {
          //   "@type": "AggregateRating",
          //   ratingValue: "4.5",
          //   reviewCount: "1"
          // },
          browserRequirements: [
            "requires HTML5 support",
            "requires JavaScript",
          ],
          creator: { "@id": new URL("#organization", env.BASE_URL).toString() },
          copyrightHolder: {
            "@id": new URL("#organization", env.BASE_URL).toString(),
          },
          operatingSystem: "all",
          maintainer: {
            "@id": new URL("#organization", env.BASE_URL).toString(),
          },
          offers: {
            "@id": new URL("#offer-waitlist", env.BASE_URL).toString(),
          },
          permissions: "may run only with an active internet connection",
          // releaseNotes: new URL("/release-notes", env.BASE_URL).toString(), // Or maybe a public GitHub Pages URL
          sameAs: [
            new URL("/projects", env.BASE_URL).toString(),
            new URL("/settings", env.BASE_URL).toString(),
          ],
          // screenshot: new URL("assets/app-screenshot.png", env.BASE_URL).toString(),
          url: new URL("/dashboard", env.BASE_URL).toString(),
        },
        description,
        inLanguage: "en-AU",
        keywords: ["construction management software"],
        // potentialAction: [
        //   {
        //     "@type": "SearchAction",
        //     target: {
        //       "@type": "EntryPoint",
        //       urlTemplate: new URL("?s={search_term_string}", env.BASE_URL).toString()
        //     },
        //     "query-input": "required name=search_term_string",
        //   },
        // ],
        publisher: {
          "@id": new URL("#organization", env.BASE_URL).toString(),
        },
      },
      {
        "@type": "Offer",
        "@id": new URL("#offer-waitlist", env.BASE_URL).toString(),
        availability: "https://schema.org/LimitedAvailability",
        name: "rekurve free early access",
        description: "Waitlist for free early access to rekurve.",
        priceCurrency: "AUD",
        price: "0.00",
        offeredBy: {
          "@id": new URL("#organization", env.BASE_URL).toString(),
        },
      },
      {
        "@type": "Organization",
        "@id": new URL("#organization", env.BASE_URL).toString(),
        name: env.COMPANY_NAME,
        legalName: env.COMPANY_LEGAL_NAME,
        url: new URL(env.BASE_URL).toString(),
        sameAs: ["https://www.linkedin.com/company/rekurve/"],
        // address: {}, Postal address of Headquarters
        areaServed: {
          "@type": "Country",
          name: "Australia",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer enquiries",
          email: `mailto:${env.CUSTOMER_CONTACT_EMAIL}`,
          availableLanguage: [
            {
              "@type": "Language",
              name: "English",
            },
          ],
        },
        description:
          "rekurve is a Software-as-a-Service company that provides construction scheduling, estimating, job management, client collaboration and proposal solutions for residential builders, renovators and trades. Founded by leaders in the tech community who were tired of seeing family and friends in the construction industry continually let down by aging software solutions. Named after the 'Recurve Bow', a simple, well-designed tool that created the largest empire in history.",
        email: `mailto:${env.CUSTOMER_CONTACT_EMAIL}`,
        founder: {
          "@context": "https://schema.org/",
          "@type": "Person",
          name: "Sam Marshall",
          url: "https://www.linkedin.com/in/sam-j-marshall/",
        },
        foundingDate: "2024-06-04",
        foundingLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Brisbane",
            addressRegion: "QLD",
            addressCountry: "Australia",
          },
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Construction Software Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Technology Consultation",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Software setup and training",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Enterprise software integration",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "WebApplication",
                "@id": new URL("#webapplication", env.BASE_URL).toString(),
              },
            },
          ],
        },
        iso6523Code: "0151:24219541361",
        keywords: ["construction management software"],
        location: {
          "@type": "PostalAddress",
          addressLocality: "Brisbane",
          addressRegion: "QLD",
          addressCountry: "Australia",
        },
        logo: {
          "@type": "ImageObject",
          "@id": new URL("#logo", env.BASE_URL).toString(),
          inLanguage: "en-AU",
          url: new URL("assets/logo-512x512.png", env.BASE_URL).toString(),
          width: 512,
          height: 512,
          caption: "rekurve",
        },
        numberOfEmployees: {
          "@type": "QuantitativeValue",
          minValue: "2",
          maxValue: "10",
        },
        slogan: "Construction Projects On Schedule & On Budget",
        image: {
          "@id": new URL("#logo", env.BASE_URL).toString(),
        },
      },
    ],
  })

export default jsonLd
