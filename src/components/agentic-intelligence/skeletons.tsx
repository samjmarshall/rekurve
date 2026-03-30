"use client";

import { AppWindowMac, Mail, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { NativeIcon } from "~/icons/bento-icons";
import { Hubspot, SlackLogo, Xero } from "~/icons/general";
import { IconBlock } from "../icon-block";

export const NativeIntegrationSkeleton = () => {
  return (
    <motion.div className="relative mx-auto my-12 hidden h-full max-h-70 min-h-80 max-w-268 grid-cols-2 p-4 lg:grid">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-10">
          <TextIconBlock
            icon={<AppWindowMac className="size-4" />}
            text="Online Enquiry Form"
          >
            <TopSVG className="absolute top-2 -right-84" />
          </TextIconBlock>
          <TextIconBlock
            icon={<MessageSquare className="size-4" />}
            text="Direct Messaging"
          >
            <MiddleSVG className="absolute top-2 -right-84" />
          </TextIconBlock>
          <TextIconBlock
            icon={<Mail className="size-4" />}
            text="Customer Email"
          >
            <BottomSVG className="absolute -right-84 bottom-2" />
          </TextIconBlock>
        </div>
        <div className="relative h-16 w-16 overflow-hidden rounded-md bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
          <div className="animation-duration-[2s] absolute inset-0 scale-[1.4] animate-spin rounded-full bg-[conic-gradient(at_center,transparent,var(--color-accent-blue)_20%,transparent_30%)] bg-conic"></div>
          <div className="animation-duration-[2s] absolute inset-0 scale-[1.4] animate-spin rounded-full bg-[conic-gradient(at_center,transparent,var(--color-primary)_20%,transparent_30%)] [animation-delay:1s]"></div>
          <div className="relative z-20 flex h-full w-full items-center justify-center rounded-[5px] bg-white dark:bg-neutral-900">
            <NativeIcon className="size-6 text-primary" />
          </div>
        </div>
      </div>
      <div className="relative flex h-full w-full items-center justify-start">
        <RightSideSVG />
        <div className="relative flex flex-col items-center gap-2">
          <span className="relative z-20 rounded-sm border border-blue-500 bg-blue-50 px-2 py-0.5 text-blue-500 text-xs dark:bg-accent-blue/50 dark:text-white">
            Connected
          </span>
          <div className="absolute inset-x-0 -top-30 flex h-full flex-col items-center">
            <IconBlock
              icon={<Catalogue className="size-11" />}
              className="h-14 w-14"
            />
            <VerticalLine />
            <VerticalLine />
            <IconBlock icon={<SlackLogo className="size-6" />} />
          </div>
        </div>
        <div className="2 absolute -top-4 right-30 flex h-full flex-col items-center">
          <IconBlock icon={<Calendar className="size-7 shadow" />} />
          <VerticalLine />
          <IconBlock icon={<Hubspot className="size-6" />} />
        </div>
        <RightSideSVG />
        <IconBlock icon={<Xero className="size-8" />} />
      </div>
    </motion.div>
  );
};

export const Calendar = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 36 36"
    {...props}
  >
    <path
      fill="#E0E7EC"
      d="M36 32a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v23z"
    ></path>
    <path
      fill="#66757F"
      d="M23.657 19.12H17.87c-1.22 0-1.673-.791-1.673-1.56c0-.791.429-1.56 1.673-1.56h8.184c1.154 0 1.628 1.04 1.628 1.628c0 .452-.249.927-.52 1.492l-5.607 11.395c-.633 1.266-.882 1.717-1.899 1.717c-1.244 0-1.877-.949-1.877-1.605c0-.271.068-.474.226-.791l5.652-10.716zM10.889 19h-.5c-1.085 0-1.538-.731-1.538-1.5c0-.792.565-1.5 1.538-1.5h2.015c.972 0 1.515.701 1.515 1.605V30.47c0 1.13-.558 1.763-1.53 1.763s-1.5-.633-1.5-1.763V19z"
    ></path>
    <path
      fill="#DD2F45"
      d="M34 0h-3.277c.172.295.277.634.277 1a2 2 0 0 1-4 0c0-.366.105-.705.277-1H8.723C8.895.295 9 .634 9 1a2 2 0 0 1-4 0c0-.366.105-.705.277-1H2a2 2 0 0 0-2 2v11h36V2a2 2 0 0 0-2-2z"
    ></path>
    <path
      fill="#F5F8FA"
      d="M13.182 4.604c0-.5.32-.78.75-.78c.429 0 .749.28.749.78v5.017h1.779c.51 0 .73.38.72.72a.7.7 0 0 1-.72.659h-2.498c-.49 0-.78-.319-.78-.819V4.604zm-6.91 0c0-.5.32-.78.75-.78s.75.28.75.78v3.488c0 .92.589 1.649 1.539 1.649c.909 0 1.529-.769 1.529-1.649V4.604c0-.5.319-.78.749-.78s.75.28.75.78v3.568c0 1.679-1.38 2.949-3.028 2.949c-1.669 0-3.039-1.25-3.039-2.949V4.604zM5.49 9.001c0 1.679-1.069 2.119-1.979 2.119c-.689 0-1.839-.27-1.839-1.14c0-.269.23-.609.56-.609c.4 0 .75.37 1.199.37c.56 0 .56-.52.56-.84V4.604c0-.5.32-.78.749-.78c.431 0 .75.28.75.78v4.397z"
    ></path>
    <path
      fill="#F4ABBA"
      d="M32 10a1 1 0 1 0 2 0a1 1 0 0 0-2 0m0-3a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3 3a1 1 0 1 0 2 0a1 1 0 0 0-2 0m0-3a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3 3a1 1 0 1 0 2 0a1 1 0 0 0-2 0m0-3a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3 0a1 1 0 1 0 2 0a1 1 0 0 0-2 0m0 3a1 1 0 1 0 2 0a1 1 0 0 0-2 0"
    ></path>
  </svg>
);

const Catalogue = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 40 40"
    {...props}
  >
    {/* Price book base */}
    <path
      fill="#8899A6"
      d="M33 4H7a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h26a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"
    ></path>
    <path fill="#fff" d="M32 6H8a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h24V6z"></path>
    {/* Product list rows */}
    <rect fill="#E1E8ED" x="8" y="9" width="22" height="5" rx="1"></rect>
    <rect fill="#E1E8ED" x="8" y="16" width="22" height="5" rx="1"></rect>
    <rect fill="#E1E8ED" x="8" y="23" width="22" height="5" rx="1"></rect>
    {/* Product boxes */}
    <rect fill="#66757F" x="9" y="10" width="3" height="3" rx="0.5"></rect>
    <rect fill="#66757F" x="9" y="17" width="3" height="3" rx="0.5"></rect>
    <rect fill="#66757F" x="9" y="24" width="3" height="3" rx="0.5"></rect>
    {/* Product names */}
    <rect fill="#99AAB5" x="14" y="10.5" width="9" height="2"></rect>
    <rect fill="#99AAB5" x="14" y="17.5" width="9" height="2"></rect>
    <rect fill="#99AAB5" x="14" y="24.5" width="9" height="2"></rect>
    {/* Price tags */}
    {/* <rect fill="#77B255" x="24" y="10" width="5" height="3" rx="0.5"></rect>
    <rect fill="#77B255" x="24" y="17" width="5" height="3" rx="0.5"></rect>
    <rect fill="#77B255" x="24" y="24" width="5" height="3" rx="0.5"></rect> */}
    {/* Dollar signs on price tags */}
    <text x="25" y="13" fill="#77B255" fontSize="5" fontWeight="bold">
      $
    </text>
    <text x="25" y="20" fill="#77B255" fontSize="5" fontWeight="bold">
      $
    </text>
    <text x="25" y="27" fill="#77B255" fontSize="5" fontWeight="bold">
      $
    </text>
    {/* Search magnifying glass overlay */}
    <circle fill="#55ACEE" cx="30" cy="30" r="6"></circle>
    <circle fill="#fff" cx="30" cy="30" r="4"></circle>
    <path
      fill="#3B88C3"
      d="M34 35l3 3a1 1 0 0 0 1.5 0a1 1 0 0 0 0-1.5l-3-3l-1.5 1.5z"
    ></path>
  </svg>
);

const VerticalLine = (
  props: React.SVGProps<SVGSVGElement> & { stopColor?: string },
) => {
  return (
    <svg
      width="1"
      height="81"
      viewBox="0 0 1 81"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      {...props}
    >
      <line
        y1="-0.5"
        x2="80"
        y2="-0.5"
        transform="matrix(0 -1 -1 0 0 80.5)"
        stroke="var(--color-line)"
      />
      <line
        y1="-0.5"
        x2="80"
        y2="-0.5"
        transform="matrix(0 -1 -1 0 0 80.5)"
        stroke="url(#vertical-line-gradient)"
      />
      <defs>
        <motion.linearGradient
          id="vertical-line-gradient"
          initial={{
            x1: 0,
            x2: 2,
            y1: "0%",
            y2: "0%",
          }}
          animate={{
            x1: 0,
            x2: 2,
            y1: "80%",
            y2: "100%",
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="#F17463" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

const RightSideSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="314"
      height="2"
      viewBox="0 0 314 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        x1="0.5"
        y1="1"
        x2="313.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line
        x1="0.5"
        y1="1"
        x2="313.5"
        y2="1"
        stroke="url(#horizontal-line-gradient)"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          id="horizontal-line-gradient"
          initial={{
            y1: 0,
            y2: 1,
            x1: "-10%",
            x2: "0%",
          }}
          animate={{
            y1: 0,
            y2: 1,
            x1: "110%",
            x2: "120%",
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="var(--color-accent-blue)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

const TopSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="312"
      height="33"
      viewBox="0 0 312 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        x1="0.5"
        y1="1"
        x2="311.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line
        x1="311.5"
        y1="1"
        x2="311.5"
        y2="32"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />

      <line
        x1="0.5"
        y1="1"
        x2="311.5"
        y2="1"
        stroke="url(#line-one-gradient)"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-one-gradient"
          initial={{
            x1: "-20%",
            x2: "0%",
            y1: 1,
            y2: 0,
          }}
          animate={{
            x1: "105%",
            x2: "120%",
            y1: 1,
            y2: 0,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="#F17463" />
          <stop offset="0.66" stopColor="#F17463" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

export const MiddleSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="323"
      height="2"
      viewBox="0 0 323 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        x1="0.5"
        y1="1"
        x2="322.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line
        x1="0.5"
        y1="1"
        x2="322.5"
        y2="1"
        stroke="url(#line-two-gradient)"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-two-gradient"
          initial={{
            x1: "-20%",
            x2: "0%",
            y1: 1,
            y2: 0,
          }}
          animate={{
            x1: "105%",
            x2: "120%",
            y1: 1,
            y2: 0,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-accent-blue)" />
          <stop offset="0.66" stopColor="var(--color-accent-blue)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

export const BottomSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="326"
      height="32"
      viewBox="0 0 326 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line y1="31" x2="325" y2="31" stroke="var(--color-line)" />

      <line
        x1="325.5"
        y1="31"
        x2="325.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line y1="31" x2="325" y2="31" stroke="url(#line-three-gradient)" />

      <defs>
        <motion.linearGradient
          id="line-three-gradient"
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: "-20%",
            x2: "0%",
            y1: 1,
            y2: 0,
          }}
          animate={{
            x1: "105%",
            x2: "120%",
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-yellow-500)" />
          <stop offset="0.66" stopColor="var(--color-yellow-500)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

const TextIconBlock = ({
  icon,
  text,
  children,
}: {
  icon: React.ReactNode;
  text: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="relative flex items-center gap-2">
      {icon}
      <span className="font-medium text-charcoal-700 text-sm dark:text-neutral-200">
        {text}
      </span>
      {children}
    </div>
  );
};
