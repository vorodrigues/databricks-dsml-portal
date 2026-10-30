// Logo and icons of the Databricks workspace (du Bois icon set, 16x16 viewBox,
// currentColor fill), the same set used across the portal.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "1em",
  height: "1em",
  fill: "none",
  viewBox: "0 0 16 16",
  "aria-hidden": true,
  focusable: false,
} as const;

// Databricks glyph shown in the header.
export function DatabricksGlyph(props: IconProps) {
  return (
    <svg
      aria-hidden
      width="16"
      viewBox="0 0 24 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="#ff3621"
        d="M22.72 10.562l-10.721 5.956L.543 10.152l-.543.3v4.627l11.998 6.672 10.722-5.959v2.458l-10.721 5.962-11.453-6.37-.546.3v.786L11.998 25.6 24 18.928v-4.631l-.543-.3-11.459 6.366L1.28 14.407V11.96L12 17.91 24 11.24V6.672l-.603-.331-11.398 6.338-10.15-5.647 10.15-5.644 8.364 4.65.744-.413v-.559L12 0 0 6.675v.716l11.998 6.672L22.72 8.104v2.458z"
      />
    </svg>
  );
}

// "databricks" wordmark shown in the header.
export function DatabricksWordmark(props: IconProps) {
  return (
    <svg
      aria-hidden
      width="85"
      viewBox="0 0 124 21"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M14.511 20.258V1.145H11.56V8.29c0 .104-.066.2-.167.238a.256.256 0 01-.279-.072c-1-1.168-2.555-1.838-4.27-1.838-3.646 0-6.503 3.067-6.503 6.986 0 1.92.667 3.69 1.876 4.985a6.262 6.262 0 004.628 2.002c1.684 0 3.241-.7 4.27-1.917a.256.256 0 01.28-.074c.1.036.167.132.167.238v1.423h2.95v-.004zm-7.003-2.336c-2.35 0-4.19-1.898-4.19-4.319 0-2.42 1.84-4.319 4.19-4.319 2.35 0 4.19 1.898 4.19 4.32 0 2.42-1.84 4.318-4.19 4.318zM30.266 20.258V6.948h-2.924v1.336a.253.253 0 01-.448.162c-.99-1.18-2.505-1.83-4.27-1.83-3.646 0-6.503 3.068-6.503 6.987s2.857 6.987 6.504 6.987c1.691 0 3.246-.707 4.267-1.938a.253.253 0 01.448.161v1.445h2.926zm-6.976-2.336c-2.35 0-4.19-1.898-4.19-4.319 0-2.421 1.84-4.319 4.19-4.319 2.35 0 4.19 1.898 4.19 4.32 0 2.42-1.84 4.318-4.19 4.318zM55.266 20.258V6.948h-2.924v1.336a.253.253 0 01-.448.162c-.99-1.18-2.506-1.83-4.27-1.83-3.646 0-6.503 3.068-6.503 6.987s2.857 6.987 6.504 6.987c1.69 0 3.245-.707 4.267-1.938a.255.255 0 01.45.162v1.444h2.924zm-6.974-2.336c-2.35 0-4.19-1.898-4.19-4.319 0-2.421 1.84-4.319 4.19-4.319 2.35 0 4.19 1.898 4.19 4.32 0 2.42-1.842 4.318-4.19 4.318zM60.627 18.677a.244.244 0 01.087-.015c.075 0 .145.032.192.09 1 1.168 2.555 1.838 4.27 1.838 3.646 0 6.504-3.068 6.504-6.987 0-1.919-.666-3.689-1.877-4.985a6.262 6.262 0 00-4.627-2.002c-1.685 0-3.242.7-4.27 1.917a.253.253 0 01-.448-.164l.007-7.227h-2.952l-.006 19.114h2.951v-1.343a.26.26 0 01.169-.236zm-.303-5.074c0-2.421 1.84-4.319 4.19-4.319 2.35 0 4.19 1.898 4.19 4.319 0 2.421-1.84 4.319-4.19 4.319-2.35 0-4.19-1.898-4.19-4.319zM80.174 9.671c.277 0 .535.024.714.066V6.723a2.396 2.396 0 00-.492-.05c-1.53 0-2.943.782-3.692 2.039a.253.253 0 01-.471-.13V6.948h-2.924v13.31h2.952v-5.853c0-2.919 1.499-4.734 3.913-4.734zM85.714 6.948h-2.98v13.31h2.98V6.948zM84.19 1.157c-.996 0-1.807.809-1.807 1.802a1.806 1.806 0 003.613 0 1.804 1.804 0 00-1.807-1.802zM94.468 6.616c-4.09 0-7.059 2.938-7.059 6.987 0 1.968.695 3.749 1.96 5.012 1.271 1.273 3.073 1.973 5.07 1.973 1.654 0 2.944-.328 5.375-2.107l-1.674-1.763c-1.194.791-2.305 1.176-3.395 1.176-2.467 0-4.329-1.844-4.329-4.29 0-2.447 1.862-4.292 4.33-4.292 1.176 0 2.268.385 3.337 1.177l1.872-1.768c-2.173-1.885-4.171-2.105-5.487-2.105zM105 14.388a.257.257 0 01.171-.066h.015c.072.007.138.04.181.094l4.719 5.838 3.63.002-6.106-7.37a.255.255 0 01.015-.34l5.613-5.6h-3.597l-4.831 4.849a.253.253 0 01-.432-.179l.006-10.471h-2.958v19.113h2.952v-5.185a.25.25 0 01.081-.185l.541-.5z" />
      <path d="M118.531 20.59c2.421 0 4.869-1.46 4.869-4.251 0-1.819-1.143-3.076-3.493-3.84l-1.606-.526c-1.079-.36-1.606-.874-1.606-1.576 0-.802.721-1.362 1.753-1.362.981 0 1.855.639 2.408 1.753l2.369-1.272c-.866-1.789-2.691-2.9-4.777-2.9-2.644 0-4.566 1.694-4.566 4.03 0 1.844 1.107 3.091 3.38 3.812l1.636.526c1.16.366 1.631.821 1.631 1.576 0 1.128-1.049 1.528-1.944 1.528-1.197 0-2.257-.775-2.777-2.026l-2.39 1.243c.793 2.027 2.746 3.285 5.113 3.285zM38.443 20.454c.932 0 1.776-.083 2.241-.156v-2.544c-.388.05-1.058.095-1.48.095-1.198 0-2.113-.204-2.113-2.778v-5.47c0-.14.113-.253.253-.253h2.875l-.002-2.402-2.873.002a.253.253 0 01-.253-.253V2.836l-2.933.002.003 3.857c0 .14-.113.253-.254.253H31.85l.002 2.402 2.056-.002c.14 0 .254.113.254.253V15.8c-.007 4.655 3.107 4.655 4.28 4.655z" />
    </svg>
  );
}

// Toggles the side menu (workspace collapse icon). The inner bar changes shape with the
// menu state (expanded/collapsed) through the --sidebar-icon-transform CSS variable.
export function IconSidebarToggle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="0.75" y="1.75" width="14.5" height="12.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
      <rect
        x="3"
        y="4.25"
        width="1.5"
        height="7.5"
        rx="0.75"
        fill="currentColor"
        style={{
          transform: "var(--sidebar-icon-transform)",
          transformOrigin: "3.75px 8px",
          transition: "transform 80ms ease-out",
        }}
      />
    </svg>
  );
}

// Home.
export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        d="M7.53 1.2a.75.75 0 0 1 .94 0l6.25 5a.75.75 0 0 1 .28.586V14.25a.75.75 0 0 1-.75.75H9.75v-4.75h-3.5V15H2.75a.75.75 0 0 1-.75-.75V6.786a.75.75 0 0 1 .28-.586z"
      />
    </svg>
  );
}

// Projects ("Workspace" icon of the workspace side navigation).
export function IconProjects(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 1.75A.75.75 0 0 1 3.75 1h10.5a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75V12.5H1V11h2V8.75H1v-1.5h2V5H1V3.5h2zm1.5.75v11H6v-11zm3 0v11h6v-11z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Search (filter textbox).
export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 1a7 7 0 1 0 4.39 12.453l2.55 2.55 1.06-1.06-2.55-2.55A7 7 0 0 0 8 1M2.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Chevron down (dropdowns).
export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M8 8.917 10.947 6 12 7.042 8 11 4 7.042 5.053 6z" clipRule="evenodd" />
    </svg>
  );
}

// Chevrons left / right (pagination).
export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M7.083 8 10 10.947 8.958 12 5 8l3.958-4L10 5.053z" clipRule="evenodd" />
    </svg>
  );
}
export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M8.917 8 6 5.053 7.042 4 11 8l-3.958 4L6 10.947z" clipRule="evenodd" />
    </svg>
  );
}

// User (Creator column).
export function IconUser(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 1a3.25 3.25 0 1 0 0 6.5A3.25 3.25 0 0 0 8 1M6.25 4.25a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0M8 9a8.74 8.74 0 0 0-6.836 3.287.75.75 0 0 0-.164.469v1.494c0 .414.336.75.75.75h12.5a.75.75 0 0 0 .75-.75v-1.494a.75.75 0 0 0-.164-.469A8.74 8.74 0 0 0 8 9m-5.5 4.5v-.474A7.23 7.23 0 0 1 8 10.5c2.2 0 4.17.978 5.5 2.526v.474z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Sort direction (sorted table column).
export function IconSortDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M7.25 1v11.19L4.03 8.97 2.97 10.03 8 15.06l5.03-5.03-1.06-1.06-3.22 3.22V1z" />
    </svg>
  );
}
export function IconSortUp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M8.75 15V3.81l3.22 3.22 1.06-1.06L8 .94 2.97 5.97l1.06 1.06 3.22-3.22V15z" />
    </svg>
  );
}

// Warning (pending approval).
export function IconWarning(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.35 1.38a.75.75 0 0 1 1.3 0l6.75 12a.75.75 0 0 1-.65 1.12H1.25a.75.75 0 0 1-.65-1.12zM2.53 13h10.94L8 3.28zM7.25 6h1.5v3.5h-1.5zM8 10.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
        clipRule="evenodd"
      />
    </svg>
  );
}

// External link (repository links).
export function IconNewWindow(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M10 1h5v5h-1.5V3.56L8.53 8.53 7.47 7.47l4.97-4.97H10z" />
      <path fill="currentColor" d="M1 2.75A.75.75 0 0 1 1.75 2H8v1.5H2.5v10h10V8H14v6.25a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1-.75-.75z" />
    </svg>
  );
}

// Info (Run details, explanatory messages).
export function IconInfo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M7.25 10.5v-3h1.5v3zM8 5a.75.75 0 1 1 0 1.5A.75.75 0 0 1 8 5" />
      <path fill="currentColor" fillRule="evenodd" d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12m0-1.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9" clipRule="evenodd" />
    </svg>
  );
}

// Check circle (finished run status).
export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M11.53 6.53 7 11.06 4.47 8.53l1.06-1.06L7 8.94l3.47-3.47z" />
      <path fill="currentColor" fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13" clipRule="evenodd" />
    </svg>
  );
}

// X circle (failed run status).
export function IconXCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M6.94 8 4.97 6.03l1.06-1.06L8 6.94l1.97-1.97 1.06 1.06L9.06 8l1.97 1.97-1.06 1.06L8 9.06l-1.97 1.97-1.06-1.06z" />
      <path fill="currentColor" fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13" clipRule="evenodd" />
    </svg>
  );
}

// Clock (running run status).
export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M7.25 4v4c0 .199.079.39.22.53l2 2 1.06-1.06-1.78-1.78V4z" />
      <path fill="currentColor" fillRule="evenodd" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0" clipRule="evenodd" />
    </svg>
  );
}

// Copy to clipboard.
export function IconCopy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M1.75 1a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75H5v3.25c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75H11V1.75a.75.75 0 0 0-.75-.75zM9.5 5V2.5h-7v7H5V5.75A.75.75 0 0 1 5.75 5zm-3 8.5v-7h7v7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// File, code file and folder (artifact and repository trees).
export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2 1.75A.75.75 0 0 1 2.75 1h6a.75.75 0 0 1 .53.22l4.5 4.5c.141.14.22.331.22.53v9a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75zm1.5.75v12h9V7H8.75A.75.75 0 0 1 8 6.25V2.5zm6 1.06 1.94 1.94H9.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
export function IconFileCode(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2 1.75A.75.75 0 0 1 2.75 1h6a.75.75 0 0 1 .53.22l4.5 4.5c.141.14.22.331.22.53V10h-1.5V7H8.75A.75.75 0 0 1 8 6.25V2.5H3.5V16H2zm7.5 1.81 1.94 1.94H9.5z"
        clipRule="evenodd"
      />
      <path fill="currentColor" d="M7.47 9.97 4.44 13l3.03 3.03 1.06-1.06L6.56 13l1.97-1.97zM11.03 9.97l-1.06 1.06L11.94 13l-1.97 1.97 1.06 1.06L14.06 13z" />
    </svg>
  );
}
export function IconFolder(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 2.75A.75.75 0 0 1 .75 2h3.922c.729 0 1.428.29 1.944.805L7.811 4h7.439a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1-.75-.75zm1.5.75v9h13v-7h-7a.75.75 0 0 1-.53-.22L5.555 3.866a1.25 1.25 0 0 0-.883-.366z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Arrow right (View all).
export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="m15.06 8.03-7.03 7.03L6.97 14l5.22-5.22H1v-1.5h11.19L6.97 2.06 8.03 1z" />
    </svg>
  );
}

// Vertical three dots (overflow menu trigger).
export function IconOverflow(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        d="M8 1a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 8 1M8 6.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5M8 11.5A1.75 1.75 0 1 0 8 15a1.75 1.75 0 0 0 0-3.5"
      />
    </svg>
  );
}

// Octagon with exclamation (danger confirmation title).
export function IconDanger(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="currentColor" d="M7.248 10.748a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0M8.748 4.998v4h-1.5v-4z" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m11.533 15.776 4.243-4.243a.75.75 0 0 0 .22-.53v-6.01a.75.75 0 0 0-.22-.53L11.533.22a.75.75 0 0 0-.53-.22h-6.01a.75.75 0 0 0-.53.22L.22 4.462a.75.75 0 0 0-.22.53v6.011c0 .199.079.39.22.53l4.242 4.243c.141.14.332.22.53.22h6.011a.75.75 0 0 0 .53-.22m2.963-10.473v5.39l-3.804 3.803H5.303L1.5 10.692V5.303L5.303 1.5h5.39z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Close (X).
export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M6.97 8.03 2 3.06 3.06 2l4.97 4.97L13 2l1.06 1.06-4.969 4.97 4.97 4.97L13 14.06 8.03 9.092l-4.97 4.97L2 13z"
        clipRule="evenodd"
      />
    </svg>
  );
}
