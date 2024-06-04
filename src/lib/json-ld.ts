import { env } from "~/env"

interface JsonLdParams {
  urlPath: string
  title: string
  description: string
}

const jsonLd = ({ urlPath, title, description }: JsonLdParams) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": new URL(`${urlPath}/#webpage`, env.BASE_URL).toString(),
        url: new URL(urlPath, env.BASE_URL).toString(),
        name: title,
        isPartOf: {
          "@id": new URL("#website", env.BASE_URL).toString(),
        },
        inLanguage: "en-AU",
        description,
        potentialAction: [
          {
            "@type": "ReadAction",
            target: [new URL(urlPath, env.BASE_URL).toString()],
          },
        ],
        publisher: {
          "@id": new URL("#organization", env.BASE_URL).toString(),
        },
      },
    ],
  })

export default jsonLd
